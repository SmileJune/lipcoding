// 비즈니스 로직: 스토어 + 추출 + AI 를 조합. HTTP 프레임워크 비의존(테스트 용이).
import * as store from './store.js';
import { extractArticle } from './extract.js';
import * as ai from './ai.js';
import { CARD_COLORS, HttpError, type Card, type CardColor } from './types.js';

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
      return { status: 'ok' as const, copilotMode: copilotMode(), version: '0.1.0' };
    },

    async createCardFromUrl(input: { url?: unknown; boardId?: unknown }): Promise<Card> {
      if (typeof input.url !== 'string' || !input.url.trim()) {
        throw new HttpError(400, 'bad_request', 'url 은 필수입니다.');
      }
      let boardId = store.DEFAULT_BOARD_ID;
      if (input.boardId !== undefined) {
        if (typeof input.boardId !== 'string') {
          throw new HttpError(400, 'bad_request', 'boardId 형식 오류.');
        }
        if (!store.getBoard(input.boardId)) {
          throw new HttpError(404, 'not_found', '보드를 찾을 수 없습니다.');
        }
        boardId = input.boardId;
      }

      const article = await extract(input.url);
      const summary = await summarize(article);
      const now = new Date().toISOString();
      const card: Card = {
        id: store.newCardId(),
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
      return store.addCard(card);
    },

    listCards(boardId?: string): Card[] {
      return store.listCards(boardId);
    },

    updateCard(id: string, patch: Record<string, unknown>): Card {
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
        if (typeof patch.boardId !== 'string' || !store.getBoard(patch.boardId)) {
          throw new HttpError(400, 'bad_request', 'boardId 오류.');
        }
        allowed.boardId = patch.boardId;
      }
      if (Object.keys(allowed).length === 0) {
        throw new HttpError(400, 'bad_request', '수정할 필드가 없습니다.');
      }
      const updated = store.updateCard(id, allowed);
      if (!updated) throw new HttpError(404, 'not_found', '카드를 찾을 수 없습니다.');
      return updated;
    },

    deleteCard(id: string): void {
      if (!store.deleteCard(id)) {
        throw new HttpError(404, 'not_found', '카드를 찾을 수 없습니다.');
      }
    },

    listBoards() {
      return store.listBoards();
    },

    createBoard(name: unknown) {
      if (typeof name !== 'string' || !name.trim()) {
        throw new HttpError(400, 'bad_request', 'name 은 필수입니다.');
      }
      return store.createBoard(name.trim());
    },

    async organizeBoard(id: string) {
      if (!store.getBoard(id)) {
        throw new HttpError(404, 'not_found', '보드를 찾을 수 없습니다.');
      }
      const cards = store.listCards(id);
      const groups = await organize(cards);
      return { groups };
    },

    async chat(input: { question?: unknown; boardId?: unknown; cardId?: unknown }) {
      if (typeof input.question !== 'string' || !input.question.trim()) {
        throw new HttpError(400, 'bad_request', 'question 은 필수입니다.');
      }
      let context: Card[];
      if (typeof input.cardId === 'string') {
        const card = store.getCard(input.cardId);
        context = card ? [card] : [];
      } else if (typeof input.boardId === 'string') {
        context = store.listCards(input.boardId);
      } else {
        context = store.listCards();
      }
      const answer = await chatFn(input.question, context);
      return { answer };
    },
  };
}

export type Service = ReturnType<typeof createService>;
