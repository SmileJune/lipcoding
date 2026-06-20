// 백엔드 REST API 클라이언트. 상대경로 사용(dev 프록시 / SWA 공용).
import type {
  AuthInfo,
  Board,
  Card,
  CardColor,
  Health,
  OrganizeGroup,
  SharedBoardView,
} from './types';

const BASE = (import.meta.env?.VITE_API_BASE as string | undefined) ?? '';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let message = `요청 실패 (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      // ignore JSON 파싱 실패
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type CardPatch = Partial<
  Pick<Card, 'memo' | 'color' | 'posX' | 'posY' | 'tags' | 'boardId'>
>;

export const api = {
  health: () => http<Health>('/api/health'),

  me: () => http<AuthInfo>('/api/auth/me'),
  logout: () => http<void>('/api/auth/logout', { method: 'POST' }),

  listBoards: () => http<Board[]>('/api/boards'),
  createBoard: (name: string) =>
    http<Board>('/api/boards', { method: 'POST', body: JSON.stringify({ name }) }),

  listCards: (boardId?: string) =>
    http<Card[]>(`/api/cards${boardId ? `?boardId=${encodeURIComponent(boardId)}` : ''}`),
  createCardFromUrl: (url: string, boardId?: string) =>
    http<Card>('/api/cards/from-url', {
      method: 'POST',
      body: JSON.stringify({ url, boardId }),
    }),
  updateCard: (id: string, patch: CardPatch) =>
    http<Card>(`/api/cards/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteCard: (id: string) => http<void>(`/api/cards/${id}`, { method: 'DELETE' }),

  organize: (boardId: string) =>
    http<{ groups: OrganizeGroup[] }>(`/api/boards/${boardId}/organize`, {
      method: 'POST',
      body: '{}',
    }),
  shareBoard: (boardId: string) =>
    http<{ board: Board; shareId: string }>(`/api/boards/${boardId}/share`, {
      method: 'POST',
      body: '{}',
    }),
  unshareBoard: (boardId: string) =>
    http<{ board: Board }>(`/api/boards/${boardId}/share`, { method: 'DELETE' }),
  getSharedBoard: (shareId: string) =>
    http<SharedBoardView>(`/api/shared/${encodeURIComponent(shareId)}`),
  chat: (question: string, boardId?: string) =>
    http<{ answer: string }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ question, boardId }),
    }),
};

export type { Board, Card, CardColor, OrganizeGroup, SharedBoardView };
