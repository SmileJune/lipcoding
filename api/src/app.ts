// Express 앱 팩토리. service 의존성 주입 가능(테스트).
import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { HttpError } from './types.js';
import { createService, type ServiceDeps } from './service.js';

export function createApp(deps: ServiceDeps = {}): Express {
  const app = express();
  const service = createService(deps);

  app.use(express.json({ limit: '1mb' }));

  const wrap =
    (fn: (req: Request, res: Response) => Promise<void> | void) =>
    (req: Request, res: Response, next: NextFunction): void => {
      Promise.resolve(fn(req, res)).catch(next);
    };

  app.get(
    '/api/health',
    wrap((_req, res) => {
      res.json(service.health());
    }),
  );

  app.post(
    '/api/cards/from-url',
    wrap(async (req, res) => {
      const card = await service.createCardFromUrl(req.body ?? {});
      res.status(201).json(card);
    }),
  );

  app.get(
    '/api/cards',
    wrap((req, res) => {
      const boardId = typeof req.query.boardId === 'string' ? req.query.boardId : undefined;
      res.json(service.listCards(boardId));
    }),
  );

  app.patch(
    '/api/cards/:id',
    wrap((req, res) => {
      res.json(service.updateCard(req.params.id, req.body ?? {}));
    }),
  );

  app.delete(
    '/api/cards/:id',
    wrap((req, res) => {
      service.deleteCard(req.params.id);
      res.status(204).end();
    }),
  );

  app.get(
    '/api/boards',
    wrap((_req, res) => {
      res.json(service.listBoards());
    }),
  );

  app.post(
    '/api/boards',
    wrap((req, res) => {
      const body = (req.body ?? {}) as { name?: unknown };
      res.status(201).json(service.createBoard(body.name));
    }),
  );

  app.post(
    '/api/boards/:id/organize',
    wrap(async (req, res) => {
      res.json(await service.organizeBoard(req.params.id));
    }),
  );

  app.post(
    '/api/chat',
    wrap(async (req, res) => {
      res.json(await service.chat(req.body ?? {}));
    }),
  );

  // 404
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
