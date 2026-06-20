import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import * as store from '../src/store.js';
import type { Article } from '../src/types.js';

const deps = {
  extract: async (url: string): Promise<Article> => ({ url, title: '추출', text: '본문.', imageUrl: null }),
  summarize: async () => ({ title: '요약제목', summary: '요약', keyPoints: ['a'], tags: ['t'] }),
  organize: async () => [{ label: 'g', cardIds: [] as string[] }],
  chat: async () => '답변',
  copilotMode: () => 'demo' as const,
};

function app() {
  return createApp(deps);
}

beforeEach(() => store.reset());

describe('HTTP API', () => {
  it('GET /api/health', async () => {
    const res = await request(app()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', copilotMode: 'demo' });
  });

  it('POST /api/cards/from-url → 201', async () => {
    const res = await request(app()).post('/api/cards/from-url').send({ url: 'https://x.com/a' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('요약제목');
    expect(res.body.id).toMatch(/^card-/);
  });

  it('POST /api/cards/from-url url 없으면 400', async () => {
    const res = await request(app()).post('/api/cards/from-url').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('bad_request');
  });

  it('GET /api/cards 목록', async () => {
    const a = app();
    await request(a).post('/api/cards/from-url').send({ url: 'https://x' });
    const res = await request(a).get('/api/cards');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('PATCH /api/cards/:id 메모·위치', async () => {
    const a = app();
    const created = await request(a).post('/api/cards/from-url').send({ url: 'https://x' });
    const res = await request(a)
      .patch(`/api/cards/${created.body.id}`)
      .send({ memo: '메모', posX: 10 });
    expect(res.status).toBe(200);
    expect(res.body.memo).toBe('메모');
    expect(res.body.posX).toBe(10);
  });

  it('PATCH 없는 카드 → 404', async () => {
    const res = await request(app()).patch('/api/cards/nope').send({ memo: 'x' });
    expect(res.status).toBe(404);
  });

  it('DELETE /api/cards/:id → 204', async () => {
    const a = app();
    const created = await request(a).post('/api/cards/from-url').send({ url: 'https://x' });
    const res = await request(a).delete(`/api/cards/${created.body.id}`);
    expect(res.status).toBe(204);
  });

  it('GET/POST /api/boards', async () => {
    const a = app();
    const created = await request(a).post('/api/boards').send({ name: '공부' });
    expect(created.status).toBe(201);
    const res = await request(a).get('/api/boards');
    expect(res.body).toHaveLength(2);
  });

  it('POST /api/boards 빈 이름 → 400', async () => {
    const res = await request(app()).post('/api/boards').send({ name: '' });
    expect(res.status).toBe(400);
  });

  it('POST /api/boards/:id/organize', async () => {
    const res = await request(app())
      .post(`/api/boards/${store.DEFAULT_BOARD_ID}/organize`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.groups[0].label).toBe('g');
  });

  it('POST /api/chat', async () => {
    const res = await request(app()).post('/api/chat').send({ question: '질문?' });
    expect(res.status).toBe(200);
    expect(res.body.answer).toBe('답변');
  });

  it('잘못된 JSON 본문 → 400', async () => {
    const res = await request(app())
      .post('/api/chat')
      .set('content-type', 'application/json')
      .send('{ bad json');
    expect(res.status).toBe(400);
  });

  it('알 수 없는 경로 → 404', async () => {
    const res = await request(app()).get('/api/nope');
    expect(res.status).toBe(404);
  });
});
