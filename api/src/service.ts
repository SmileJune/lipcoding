// 비즈니스 로직: 스토어 + 추출 + AI 를 조합. HTTP 프레임워크 비의존(테스트 용이).
import { getStore, defaultBoardId, newCardId, newShareId } from './store.js';
import { extractArticle } from './extract.js';
import * as ai from './ai.js';
import { authMode } from './auth.js';
import {
  CARD_COLORS,
  HttpError,
  type Card,
  type CardColor,
  type SharedBoardView,
} from './types.js';

export interface ServiceDeps {
  extract?: typeof extractArticle;
  summarize?: typeof ai.summarize;
  organize?: typeof ai.organize;
  chat?: typeof ai.chat;
  copilotMode?: typeof ai.copilotMode;
}

export function createService(deps: ServiceDeps = {}) {
  const extract = deps.extract ?? extractArticle;
  const summarize = deps.summarize ?? ai.summarize;
  const organize = deps.organize ?? ai.organize;
  const chatFn = deps.chat ?? ai.chat;
  const copilotMode = deps.copilotMode ?? ai.copilotMode;

  return {
    health() {
      return {
        status: 'ok' as const,
        copilotMode: copilotMode(),
        authMode: authMode(),
        version: '0.1.0',
      };
    },

    async createCardFromUrl(
      ownerId: string,
      input: { url?: unknown; boardId?: unknown },
    ): Promise<Card> {
      if (typeof input.url !== 'string' || !input.url.trim()) {
        throw new HttpError(400, 'bad_request', 'url 은 필수입니다.');
      }
      let boardId = defaultBoardId(ownerId);
      if (input.boardId !== undefined) {
        if (typeof input.boardId !== 'string') {
          throw new HttpError(400, 'bad_request', 'boardId 형식 오류.');
        }
        if (!(await getStore().getBoard(ownerId, input.boardId))) {
          throw new HttpError(404, 'not_found', '보드를 찾을 수 없습니다.');
        }
        boardId = input.boardId;
      }

      const article = await extract(input.url);
      const summary = await summarize(article);
      const now = new Date().toISOString();
      const card: Card = {
        id: newCardId(),
        ownerId,
        boardId,
        sourceUrl: article.url,
        title: summary.title,
        summary: summary.summary,
        keyPoints: summary.keyPoints,
        tags: summary.tags,
        memo: '',
        color: 'default',
        posX: 0,
        posY: 0,
        imageUrl: article.imageUrl,
        status: 'ready',
        createdAt: now,
        updatedAt: now,
      };
      return getStore().addCard(card);
    },

    listCards(ownerId: string, boardId?: string): Promise<Card[]> {
      return getStore().listCards(ownerId, boardId);
    },

    async updateCard(
      ownerId: string,
      id: string,
      patch: Record<string, unknown>,
    ): Promise<Card> {
      const allowed: Partial<Card> = {};
      if ('memo' in patch) {
        if (typeof patch.memo !== 'string') throw new HttpError(400, 'bad_request', 'memo 형식 오류.');
        allowed.memo = patch.memo;
      }
      if ('color' in patch) {
        if (!CARD_COLORS.includes(patch.color as CardColor)) {
          throw new HttpError(400, 'bad_request', 'color 값 오류.');
        }
        allowed.color = patch.color as CardColor;
      }
      if ('posX' in patch) {
        if (typeof patch.posX !== 'number') throw new HttpError(400, 'bad_request', 'posX 형식 오류.');
        allowed.posX = patch.posX;
      }
      if ('posY' in patch) {
        if (typeof patch.posY !== 'number') throw new HttpError(400, 'bad_request', 'posY 형식 오류.');
        allowed.posY = patch.posY;
      }
      if ('tags' in patch) {
        if (!Array.isArray(patch.tags)) throw new HttpError(400, 'bad_request', 'tags 형식 오류.');
        allowed.tags = patch.tags.map(String);
      }
      if ('boardId' in patch) {
        if (
          typeof patch.boardId !== 'string' ||
          !(await getStore().getBoard(ownerId, patch.boardId))
        ) {
          throw new HttpError(400, 'bad_request', 'boardId 오류.');
        }
        allowed.boardId = patch.boardId;
      }
      if (Object.keys(allowed).length === 0) {
        throw new HttpError(400, 'bad_request', '수정할 필드가 없습니다.');
      }
      const updated = await getStore().updateCard(ownerId, id, allowed);
      if (!updated) throw new HttpError(404, 'not_found', '카드를 찾을 수 없습니다.');
      return updated;
    },

    async deleteCard(ownerId: string, id: string): Promise<void> {
      if (!(await getStore().deleteCard(ownerId, id))) {
        throw new HttpError(404, 'not_found', '카드를 찾을 수 없습니다.');
      }
    },

    listBoards(ownerId: string) {
      return getStore().listBoards(ownerId);
    },

    async createBoard(ownerId: string, name: unknown) {
      if (typeof name !== 'string' || !name.trim()) {
        throw new HttpError(400, 'bad_request', 'name 은 필수입니다.');
      }
      return getStore().createBoard(ownerId, name.trim());
    },

    async organizeBoard(ownerId: string, id: string) {
      if (!(await getStore().getBoard(ownerId, id))) {
        throw new HttpError(404, 'not_found', '보드를 찾을 수 없습니다.');
      }
      const cards = await getStore().listCards(ownerId, id);
      const groups = await organize(cards);
      return { groups };
    },

    /** 보드 공개 공유 활성화 — shareId 가 없으면 생성. */
    async shareBoard(ownerId: string, id: string) {
      const board = await getStore().getBoard(ownerId, id);
      if (!board) throw new HttpError(404, 'not_found', '보드를 찾을 수 없습니다.');
      const shareId = board.shareId ?? newShareId();
      const updated =
        board.shareId === shareId
          ? board
          : await getStore().updateBoard(ownerId, id, { shareId });
      if (!updated) throw new HttpError(404, 'not_found', '보드를 찾을 수 없습니다.');
      return { board: updated, shareId };
    },

    /** 보드 공유 해제 — shareId 를 null 로. */
    async unshareBoard(ownerId: string, id: string) {
      const board = await getStore().getBoard(ownerId, id);
      if (!board) throw new HttpError(404, 'not_found', '보드를 찾을 수 없습니다.');
      const updated = await getStore().updateBoard(ownerId, id, { shareId: null });
      if (!updated) throw new HttpError(404, 'not_found', '보드를 찾을 수 없습니다.');
      return { board: updated };
    },

    /** 공개 공유 보드 조회 (인증 불필요, 읽기 전용). */
    async getSharedBoard(shareId: unknown): Promise<SharedBoardView> {
      if (typeof shareId !== 'string' || !shareId.trim()) {
        throw new HttpError(404, 'not_found', '공유 보드를 찾을 수 없습니다.');
      }
      const board = await getStore().getBoardByShareId(shareId);
      if (!board || board.shareId !== shareId) {
        throw new HttpError(404, 'not_found', '공유 보드를 찾을 수 없습니다.');
      }
      const cards = await getStore().listCardsByBoardId(board.id);
      const user = await getStore().getUser(board.ownerId);
      return {
        board: { id: board.id, name: board.name },
        owner: user ? { name: user.name, avatarUrl: user.avatarUrl } : null,
        cards,
      };
    },

    async chat(
      ownerId: string,
      input: { question?: unknown; boardId?: unknown; cardId?: unknown },
    ) {
      if (typeof input.question !== 'string' || !input.question.trim()) {
        throw new HttpError(400, 'bad_request', 'question 은 필수입니다.');
      }
      let context: Card[];
      if (typeof input.cardId === 'string') {
        const card = await getStore().getCard(ownerId, input.cardId);
        context = card ? [card] : [];
      } else if (typeof input.boardId === 'string') {
        context = await getStore().listCards(ownerId, input.boardId);
      } else {
        context = await getStore().listCards(ownerId);
      }
      const answer = await chatFn(input.question, context);
      return { answer };
    },
  };
}

export type Service = ReturnType<typeof createService>;
