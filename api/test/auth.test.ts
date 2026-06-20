import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { resetMemory } from '../src/store.js';
import {
  authMode,
  createSessionToken,
  readSessionToken,
} from '../src/auth.js';
import type { Article, User } from '../src/types.js';

const deps = {
  extract: async (url: string): Promise<Article> => ({ url, title: 't', text: 'b.', imageUrl: null }),
  summarize: async () => ({ title: '요약', summary: 's', keyPoints: ['a'], tags: ['t'] }),
  organize: async () => [{ label: 'g', cardIds: [] as string[] }],
  chat: async () => '답변',
  copilotMode: () => 'demo' as const,
};

describe('auth — JWT 세션', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'test-secret';
  });
  afterEach(() => {
    delete process.env.SESSION_SECRET;
  });

  const user: User = {
    id: 'github:7',
    provider: 'github',
    login: 'alice',
    name: 'Alice',
    avatarUrl: 'http://a/x.png',
    createdAt: new Date().toISOString(),
  };

  it('서명·검증 왕복', async () => {
    const token = await createSessionToken(user);
    const decoded = await readSessionToken(token);
    expect(decoded).toMatchObject({ id: 'github:7', login: 'alice', provider: 'github' });
  });

  it('변조 토큰 → null', async () => {
    expect(await readSessionToken('not.a.jwt')).toBeNull();
  });
});

describe('auth — 데모 모드', () => {
  beforeEach(() => {
    delete process.env.GITHUB_OAUTH_CLIENT_ID;
    delete process.env.GITHUB_OAUTH_CLIENT_SECRET;
    delete process.env.SESSION_SECRET;
    resetMemory();
  });

  it('authMode() === demo', () => {
    expect(authMode()).toBe('demo');
  });

  it('GET /api/auth/me → 데모 유저', async () => {
    const res = await request(createApp(deps)).get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.authMode).toBe('demo');
    expect(res.body.user.id).toBe('demo');
  });

  it('데모 모드는 쿠키 없이 데이터 접근 허용', async () => {
    const res = await request(createApp(deps)).get('/api/cards');
    expect(res.status).toBe(200);
  });
});

describe('auth — 라이브(GitHub OAuth) 모드', () => {
  const OLD = { ...process.env };
  beforeEach(() => {
    process.env.GITHUB_OAUTH_CLIENT_ID = 'cid';
    process.env.GITHUB_OAUTH_CLIENT_SECRET = 'secret';
    process.env.SESSION_SECRET = 'test-secret';
    resetMemory();
  });
  afterEach(() => {
    process.env = { ...OLD };
  });

  // 로그인할 GitHub 사용자(테스트마다 교체).
  let ghUser = { id: 1, login: 'alice', name: 'Alice', avatar_url: 'http://a' };
  const fetchImpl = (async (url: string | URL): Promise<Response> => {
    const u = String(url);
    if (u.includes('login/oauth/access_token')) {
      return { ok: true, status: 200, json: async () => ({ access_token: 'tok' }) } as Response;
    }
    if (u.includes('api.github.com/user')) {
      return { ok: true, status: 200, json: async () => ghUser } as Response;
    }
    throw new Error(`unexpected fetch ${u}`);
  }) as typeof fetch;

  function makeApp() {
    return createApp(deps, { fetchImpl });
  }

  async function loginAs(
    agent: ReturnType<typeof request.agent>,
    gh: { id: number; login: string; name: string; avatar_url: string },
  ): Promise<void> {
    ghUser = gh;
    const login = await agent.get('/api/auth/login');
    expect(login.status).toBe(302);
    const state = new URL(login.headers.location).searchParams.get('state')!;
    const cb = await agent.get(`/api/auth/callback?code=abc&state=${state}`);
    expect(cb.status).toBe(302);
    expect(cb.headers.location).toBe('/');
  }

  it('쿠키 없으면 데이터 접근 401', async () => {
    const res = await request(makeApp()).get('/api/cards');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorized');
  });

  it('me 는 비로그인 시 user=null', async () => {
    const res = await request(makeApp()).get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
    expect(res.body.authMode).toBe('live');
  });

  it('OAuth 콜백 → 로그인 후 데이터 접근', async () => {
    const app = makeApp();
    const agent = request.agent(app);
    await loginAs(agent, { id: 1, login: 'alice', name: 'Alice', avatar_url: 'http://a' });
    const me = await agent.get('/api/auth/me');
    expect(me.body.user.login).toBe('alice');
    const cards = await agent.get('/api/cards');
    expect(cards.status).toBe(200);
  });

  it('잘못된 state → 400', async () => {
    const agent = request.agent(makeApp());
    await agent.get('/api/auth/login');
    const res = await agent.get('/api/auth/callback?code=abc&state=wrong');
    expect(res.status).toBe(400);
  });

  it('로그아웃 후 데이터 접근 401', async () => {
    const app = makeApp();
    const agent = request.agent(app);
    await loginAs(agent, { id: 1, login: 'alice', name: 'Alice', avatar_url: 'http://a' });
    const out = await agent.post('/api/auth/logout');
    expect(out.status).toBe(204);
    const res = await agent.get('/api/cards');
    expect(res.status).toBe(401);
  });

  it('사용자 간 데이터 격리', async () => {
    const app = makeApp();
    const alice = request.agent(app);
    const bob = request.agent(app);
    await loginAs(alice, { id: 1, login: 'alice', name: 'Alice', avatar_url: 'http://a' });
    await loginAs(bob, { id: 2, login: 'bob', name: 'Bob', avatar_url: 'http://b' });

    const created = await alice.post('/api/cards/from-url').send({ url: 'https://x' });
    expect(created.status).toBe(201);

    const aliceCards = await alice.get('/api/cards');
    expect(aliceCards.body).toHaveLength(1);
    const bobCards = await bob.get('/api/cards');
    expect(bobCards.body).toHaveLength(0);
  });
});
