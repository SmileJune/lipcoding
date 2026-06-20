import { api } from '../src/api';

function fakeResponse(opts: { ok?: boolean; status?: number; json?: unknown }) {
  const { ok = true, status = 200, json = {} } = opts;
  return { ok, status, json: async () => json } as Response;
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
});
