// Express 앱 팩토리. service 의존성 주입 가능(테스트).
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { parse as parseCookie } from 'cookie';
import { HttpError, type User } from './types.js';
import { createService, type ServiceDeps } from './service.js';
import { getStore } from './store.js';
import {
  AUTH_COOKIE,
  STATE_COOKIE,
  authMode,
  authorizeUrl,
  clearSessionCookie,
  clearStateCookie,
  createSessionToken,
  demoUser,
  exchangeCode,
  fetchGithubUser,
  newState,
  readSessionToken,
  sessionCookie,
  stateCookie,
} from './auth.js';

export interface AppOptions {
  /** 빌드된 프론트 정적 파일 경로 (있으면 SPA 서빙). */
  staticDir?: string;
  /** GitHub OAuth HTTP 주입(테스트용). */
  fetchImpl?: typeof fetch;
}

interface AuthedRequest extends Request {
  user: User;
}

export function createApp(deps: ServiceDeps = {}, options: AppOptions = {}): Express {
  const app = express();
  app.set('trust proxy', 1); // Azure 로드밸런서 뒤
  const service = createService(deps);
  const fetchImpl = options.fetchImpl ?? fetch;

  app.use(express.json({ limit: '1mb' }));

  const wrap =
    (fn: (req: Request, res: Response) => Promise<void> | void) =>
    (req: Request, res: Response, next: NextFunction): void => {
      Promise.resolve(fn(req, res)).catch(next);
    };

  const cookies = (req: Request): Record<string, string | undefined> =>
    req.headers.cookie ? parseCookie(req.headers.cookie) : {};

  const redirectUri = (req: Request): string =>
    process.env.GITHUB_OAUTH_REDIRECT_URI ??
    `${req.protocol}://${req.get('host')}/api/auth/callback`;

  // 현재 요청의 사용자 (데모 모드면 데모 유저, 아니면 세션 쿠키 검증).
  async function resolveUser(req: Request): Promise<User | null> {
    if (authMode() === 'demo') return demoUser();
    const token = cookies(req)[AUTH_COOKIE];
    if (!token) return null;
    return readSessionToken(token);
  }

  // 보호된 데이터 라우트용 미들웨어.
  const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    void (async () => {
      try {
        const user = await resolveUser(req);
        if (!user) {
          res.status(401).json({ error: 'unauthorized', message: '로그인이 필요합니다.' });
          return;
        }
        // 변경 요청은 동일 출처만 허용(CSRF 완화). sameSite=lax 와 이중 방어.
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          const origin = req.get('origin');
          if (origin) {
            const expected = `${req.protocol}://${req.get('host')}`;
            if (origin !== expected) {
              res.status(403).json({ error: 'forbidden', message: '출처가 일치하지 않습니다.' });
              return;
            }
          }
        }
        (req as AuthedRequest).user = user;
        await getStore().ensureUserSeed(user.id);
        next();
      } catch (err) {
        next(err);
      }
    })();
  };

  // ---------- 인증 라우트 (공개) ----------
  app.get(
    '/api/auth/me',
    wrap(async (req, res) => {
      const user = await resolveUser(req);
      res.json({ user, authMode: authMode() });
    }),
  );

  app.get(
    '/api/auth/login',
    wrap((req, res) => {
      if (authMode() === 'demo') {
        res.redirect('/');
        return;
      }
      const state = newState();
      res.setHeader('Set-Cookie', stateCookie(state));
      res.redirect(authorizeUrl(redirectUri(req), state));
    }),
  );

  app.get(
    '/api/auth/callback',
    wrap(async (req, res) => {
      if (authMode() === 'demo') {
        res.redirect('/');
        return;
      }
      const code = typeof req.query.code === 'string' ? req.query.code : '';
      const state = typeof req.query.state === 'string' ? req.query.state : '';
      const expectedState = cookies(req)[STATE_COOKIE];
      if (!code || !state || !expectedState || state !== expectedState) {
        res.status(400).json({ error: 'bad_request', message: '잘못된 인증 상태입니다.' });
        return;
      }
      const accessToken = await exchangeCode(code, redirectUri(req), fetchImpl);
      const user = await fetchGithubUser(accessToken, fetchImpl);
      await getStore().upsertUser(user);
      await getStore().ensureUserSeed(user.id);
      const token = await createSessionToken(user);
      res.setHeader('Set-Cookie', [sessionCookie(token), clearStateCookie()]);
      res.redirect('/');
    }),
  );

  app.post(
    '/api/auth/logout',
    wrap((_req, res) => {
      res.setHeader('Set-Cookie', clearSessionCookie());
      res.status(204).end();
    }),
  );

  // ---------- 보호된 데이터 라우트 ----------
  app.use('/api/cards', requireAuth);
  app.use('/api/boards', requireAuth);
  app.use('/api/chat', requireAuth);

  app.get(
    '/api/health',
    wrap((_req, res) => {
      res.json(service.health());
    }),
  );

  // 공개 공유 보드 조회 (인증 불필요, 읽기 전용).
  app.get(
    '/api/shared/:shareId',
    wrap(async (req, res) => {
      res.json(await service.getSharedBoard(req.params.shareId));
    }),
  );

  app.post(
    '/api/cards/from-url',
    wrap(async (req, res) => {
      const card = await service.createCardFromUrl((req as AuthedRequest).user.id, req.body ?? {});
      res.status(201).json(card);
    }),
  );

  app.get(
    '/api/cards',
    wrap(async (req, res) => {
      const boardId = typeof req.query.boardId === 'string' ? req.query.boardId : undefined;
      res.json(await service.listCards((req as AuthedRequest).user.id, boardId));
    }),
  );

  app.patch(
    '/api/cards/:id',
    wrap(async (req, res) => {
      res.json(
        await service.updateCard((req as AuthedRequest).user.id, req.params.id, req.body ?? {}),
      );
    }),
  );

  app.delete(
    '/api/cards/:id',
    wrap(async (req, res) => {
      await service.deleteCard((req as AuthedRequest).user.id, req.params.id);
      res.status(204).end();
    }),
  );

  app.get(
    '/api/boards',
    wrap(async (req, res) => {
      res.json(await service.listBoards((req as AuthedRequest).user.id));
    }),
  );

  app.post(
    '/api/boards',
    wrap(async (req, res) => {
      const body = (req.body ?? {}) as { name?: unknown };
      res.status(201).json(await service.createBoard((req as AuthedRequest).user.id, body.name));
    }),
  );

  app.post(
    '/api/boards/:id/organize',
    wrap(async (req, res) => {
      res.json(await service.organizeBoard((req as AuthedRequest).user.id, req.params.id));
    }),
  );

  app.post(
    '/api/boards/:id/share',
    wrap(async (req, res) => {
      res.json(await service.shareBoard((req as AuthedRequest).user.id, req.params.id));
    }),
  );

  app.delete(
    '/api/boards/:id/share',
    wrap(async (req, res) => {
      res.json(await service.unshareBoard((req as AuthedRequest).user.id, req.params.id));
    }),
  );

  app.post(
    '/api/chat',
    wrap(async (req, res) => {
      res.json(await service.chat((req as AuthedRequest).user.id, req.body ?? {}));
    }),
  );

  // 정적 프론트(SPA) 서빙 — 빌드 산출물이 있을 때만.
  const staticDir = options.staticDir ?? resolve(process.cwd(), 'public');
  if (existsSync(staticDir)) {
    app.use(express.static(staticDir));
    // /api 외 GET 은 SPA index.html 로 폴백.
    app.get(/^(?!\/api\/).*/, (_req: Request, res: Response) => {
      res.sendFile(resolve(staticDir, 'index.html'));
    });
  }

  // 404 (정의되지 않은 API 등)
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'not_found', message: '엔드포인트를 찾을 수 없습니다.' });
  });

  // 에러 핸들러 (4-인자 시그니처 필수)
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'bad_request', message: '잘못된 JSON 입니다.' });
      return;
    }
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'internal_error', message: '서버 오류가 발생했습니다.' });
  });

  return app;
}
