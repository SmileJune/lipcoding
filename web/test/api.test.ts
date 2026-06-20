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
});
