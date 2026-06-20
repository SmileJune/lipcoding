// 백엔드 REST API 클라이언트. 상대경로 사용(dev 프록시 / SWA 공용).
import type {
  AuthInfo,
  Board,
  Card,
  CardColor,
  Health,
  Insight,
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
  insights: (boardId: string) =>
    http<{ insights: Insight[] }>(`/api/boards/${boardId}/insights`, {
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

  /**
   * 스트리밍 Q&A (SSE). onDelta(누적 답변)를 토큰 단위로 호출하고 최종 답변을 반환.
   * 스트림 불가/오류 시 비스트리밍 /api/chat 로 폴백.
   */
  chatStream: async (
    question: string,
    boardId: string | undefined,
    onDelta: (partial: string) => void,
  ): Promise<string> => {
    try {
      const res = await fetch(`${BASE}/api/chat/stream`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question, boardId }),
      });
      if (!res.ok || !res.body) throw new Error('stream_unavailable');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let answer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          let evt: { delta?: string; done?: boolean; answer?: string; error?: string };
          try {
            evt = JSON.parse(payload);
          } catch {
            continue;
          }
          if (typeof evt.delta === 'string') {
            answer += evt.delta;
            onDelta(answer);
          } else if (evt.error) {
            throw new Error(evt.error);
          } else if (evt.done) {
            if (typeof evt.answer === 'string') answer = evt.answer;
            onDelta(answer);
          }
        }
      }
      return answer;
    } catch {
      const res = await http<{ answer: string }>('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ question, boardId }),
      });
      onDelta(res.answer);
      return res.answer;
    }
  },
};

export type { Board, Card, CardColor, Insight, OrganizeGroup, SharedBoardView };
