import { api } from '../src/api';

function fakeResponse(opts: { ok?: boolean; status?: number; json?: unknown }) {
  const { ok = true, status = 200, json = {} } = opts;
  return { ok, status, json: async () => json } as Response;
}

function sseResponse(events: string[]) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const e of events) controller.enqueue(encoder.encode(e));
      controller.close();
    },
  });
  return { ok: true, status: 200, body: stream } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api client', () => {
  it('listBoards 는 GET /api/boards', async () => {
    const f = vi.fn().mockResolvedValue(fakeResponse({ json: [{ id: 'b1', name: '전체', createdAt: 'x' }] }));
    vi.stubGlobal('fetch', f);
    const boards = await api.listBoards();
    expect(boards).toHaveLength(1);
    expect(f.mock.calls[0][0]).toBe('/api/boards');
  });

  it('listCards 는 boardId 쿼리 포함', async () => {
    const f = vi.fn().mockResolvedValue(fakeResponse({ json: [] }));
    vi.stubGlobal('fetch', f);
    await api.listCards('b1');
    expect(f.mock.calls[0][0]).toBe('/api/cards?boardId=b1');
  });

  it('createCardFromUrl 은 POST + body', async () => {
    const f = vi.fn().mockResolvedValue(fakeResponse({ status: 201, json: { id: 'card-1', title: 'T' } }));
    vi.stubGlobal('fetch', f);
    const card = await api.createCardFromUrl('https://x', 'b1');
    expect(card.id).toBe('card-1');
    const init = f.mock.calls[0][1];
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ url: 'https://x', boardId: 'b1' });
  });

  it('deleteCard 204 → undefined', async () => {
    const f = vi.fn().mockResolvedValue(fakeResponse({ status: 204 }));
    vi.stubGlobal('fetch', f);
    await expect(api.deleteCard('card-1')).resolves.toBeUndefined();
  });

  it('에러 응답이면 message 로 throw', async () => {
    const f = vi
      .fn()
      .mockResolvedValue(fakeResponse({ ok: false, status: 400, json: { error: 'bad_request', message: 'url 은 필수입니다.' } }));
    vi.stubGlobal('fetch', f);
    await expect(api.createCardFromUrl('')).rejects.toThrow('url 은 필수입니다.');
  });

  it('me 는 GET /api/auth/me + 쿠키 전송', async () => {
    const f = vi.fn().mockResolvedValue(
      fakeResponse({ json: { user: { id: 'demo' }, authMode: 'demo' } }),
    );
    vi.stubGlobal('fetch', f);
    const info = await api.me();
    expect(info.authMode).toBe('demo');
    expect(f.mock.calls[0][0]).toBe('/api/auth/me');
    expect(f.mock.calls[0][1].credentials).toBe('same-origin');
  });

  it('logout 은 POST /api/auth/logout', async () => {
    const f = vi.fn().mockResolvedValue(fakeResponse({ status: 204 }));
    vi.stubGlobal('fetch', f);
    await api.logout();
    expect(f.mock.calls[0][0]).toBe('/api/auth/logout');
    expect(f.mock.calls[0][1].method).toBe('POST');
  });

  it('shareBoard 는 POST /api/boards/:id/share', async () => {
    const f = vi.fn().mockResolvedValue(
      fakeResponse({ json: { board: { id: 'b1', shareId: 'tok' }, shareId: 'tok' } }),
    );
    vi.stubGlobal('fetch', f);
    const res = await api.shareBoard('b1');
    expect(res.shareId).toBe('tok');
    expect(f.mock.calls[0][0]).toBe('/api/boards/b1/share');
    expect(f.mock.calls[0][1].method).toBe('POST');
  });

  it('unshareBoard 는 DELETE /api/boards/:id/share', async () => {
    const f = vi.fn().mockResolvedValue(
      fakeResponse({ json: { board: { id: 'b1', shareId: null } } }),
    );
    vi.stubGlobal('fetch', f);
    const res = await api.unshareBoard('b1');
    expect(res.board.shareId).toBeNull();
    expect(f.mock.calls[0][0]).toBe('/api/boards/b1/share');
    expect(f.mock.calls[0][1].method).toBe('DELETE');
  });

  it('getSharedBoard 는 GET /api/shared/:shareId', async () => {
    const f = vi.fn().mockResolvedValue(
      fakeResponse({ json: { board: { id: 'b1', name: '전체' }, owner: null, cards: [] } }),
    );
    vi.stubGlobal('fetch', f);
    const view = await api.getSharedBoard('tok abc');
    expect(view.board.name).toBe('전체');
    expect(f.mock.calls[0][0]).toBe('/api/shared/tok%20abc');
  });

  it('chatStream 은 SSE 델타를 누적하고 최종 답변 반환', async () => {
    const f = vi.fn().mockResolvedValue(
      sseResponse([
        'data: {"delta":"안"}\n\n',
        'data: {"delta":"녕"}\n\n',
        'data: {"done":true,"answer":"안녕하세요"}\n\n',
      ]),
    );
    vi.stubGlobal('fetch', f);
    const partials: string[] = [];
    const answer = await api.chatStream('q', 'b1', (p) => partials.push(p));
    expect(f.mock.calls[0][0]).toBe('/api/chat/stream');
    expect(partials).toEqual(['안', '안녕', '안녕하세요']);
    expect(answer).toBe('안녕하세요');
  });

  it('chatStream 스트림 실패 시 /api/chat 폴백', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, body: null } as Response)
      .mockResolvedValueOnce(fakeResponse({ json: { answer: '폴백답변' } }));
    vi.stubGlobal('fetch', f);
    const partials: string[] = [];
    const answer = await api.chatStream('q', undefined, (p) => partials.push(p));
    expect(answer).toBe('폴백답변');
    expect(partials).toEqual(['폴백답변']);
    expect(f.mock.calls[1][0]).toBe('/api/chat');
  });
});
