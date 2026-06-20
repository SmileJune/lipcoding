import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { resetMemory, defaultBoardId } from '../src/store.js';
import type { Article } from '../src/types.js';

const DEFAULT_BOARD_ID = defaultBoardId('demo');

const deps = {
  extract: async (url: string): Promise<Article> => ({ url, title: '추출', text: '본문.', imageUrl: null }),
  summarize: async () => ({ title: '요약제목', summary: '요약', keyPoints: ['a'], tags: ['t'] }),
  organize: async () => [{ label: 'g', cardIds: [] as string[] }],
  chat: async () => '답변',
  chatStream: async (_q: string, _ctx: unknown, onDelta?: (c: string) => void) => {
    onDelta?.('부');
    onDelta?.('분');
    return '부분답변';
  },
  copilotMode: () => 'demo' as const,
};

function app() {
  return createApp(deps);
}

beforeEach(() => resetMemory());

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
      .post(`/api/boards/${DEFAULT_BOARD_ID}/organize`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.groups[0].label).toBe('g');
  });

  it('POST /api/boards/:id/share → 200 shareId 발급', async () => {
    const res = await request(app()).post(`/api/boards/${DEFAULT_BOARD_ID}/share`).send({});
    expect(res.status).toBe(200);
    expect(res.body.shareId).toMatch(/^[a-f0-9]{32}$/);
    expect(res.body.board.shareId).toBe(res.body.shareId);
  });

  it('DELETE /api/boards/:id/share → 200 공유 해제', async () => {
    const a = app();
    await request(a).post(`/api/boards/${DEFAULT_BOARD_ID}/share`).send({});
    const res = await request(a).delete(`/api/boards/${DEFAULT_BOARD_ID}/share`);
    expect(res.status).toBe(200);
    expect(res.body.board.shareId).toBeNull();
  });

  it('GET /api/shared/:shareId 공개 조회(보드+카드)', async () => {
    const a = app();
    await request(a).post('/api/cards/from-url').send({ url: 'https://x' });
    const shared = await request(a).post(`/api/boards/${DEFAULT_BOARD_ID}/share`).send({});
    const res = await request(a).get(`/api/shared/${shared.body.shareId}`);
    expect(res.status).toBe(200);
    expect(res.body.board.name).toBe('전체');
    expect(res.body.cards).toHaveLength(1);
  });

  it('GET /api/shared/:shareId 잘못된 토큰 → 404', async () => {
    const res = await request(app()).get('/api/shared/badtoken');
    expect(res.status).toBe(404);
  });

  it('POST /api/chat', async () => {
    const res = await request(app()).post('/api/chat').send({ question: '질문?' });
    expect(res.status).toBe(200);
    expect(res.body.answer).toBe('답변');
  });

  it('POST /api/chat/stream → SSE 델타 + done', async () => {
    const res = await request(app()).post('/api/chat/stream').send({ question: '질문?' });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.text).toContain('data: {"delta":"부"}');
    expect(res.text).toContain('data: {"delta":"분"}');
    expect(res.text).toContain('"done":true');
    expect(res.text).toContain('부분답변');
  });

  it('POST /api/chat/stream 질문 없으면 400 JSON', async () => {
    const res = await request(app()).post('/api/chat/stream').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('bad_request');
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

  it('정적 SPA: 비 /api GET 은 index.html 폴백', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'curio-static-'));
    writeFileSync(join(dir, 'index.html'), '<!doctype html><body>CURIO_SPA</body>');
    const res = await request(createApp(deps, { staticDir: dir })).get('/board/abc');
    expect(res.status).toBe(200);
    expect(res.text).toContain('CURIO_SPA');
  });

  it('정적 SPA 켜져도 미존재 /api 는 404 JSON', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'curio-static-'));
    writeFileSync(join(dir, 'index.html'), 'x');
    const res = await request(createApp(deps, { staticDir: dir })).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not_found');
  });
});
