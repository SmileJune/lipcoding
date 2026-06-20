// 인메모리 스토어 (로컬·테스트·Cosmos 미설정 시 폴백). 모든 조회는 ownerId 로 격리.
import {
  DEFAULT_BOARD_NAME,
  defaultBoardId,
  type Board,
  type Card,
  type Store,
  type User,
} from './types.js';
import { newBoardId } from './id.js';

const users = new Map<string, User>();
const boards = new Map<string, Board>();
const cards = new Map<string, Card>();

function seedUser(ownerId: string): void {
  const id = defaultBoardId(ownerId);
  if (!boards.has(id)) {
    boards.set(id, {
      id,
      ownerId,
      name: DEFAULT_BOARD_NAME,
      createdAt: new Date().toISOString(),
      shareId: null,
    });
  }
}

export const memoryStore: Store = {
  async ensureUserSeed(ownerId) {
    seedUser(ownerId);
  },
  async getUser(id) {
    return users.get(id);
  },
  async upsertUser(user) {
    users.set(user.id, user);
    return user;
  },
  async listBoards(ownerId) {
    return [...boards.values()].filter((b) => b.ownerId === ownerId);
  },
  async getBoard(ownerId, id) {
    const b = boards.get(id);
    return b && b.ownerId === ownerId ? b : undefined;
  },
  async createBoard(ownerId, name) {
    const board: Board = {
      id: newBoardId(),
      ownerId,
      name,
      createdAt: new Date().toISOString(),
      shareId: null,
    };
    boards.set(board.id, board);
    return board;
  },
  async updateBoard(ownerId, id, patch) {
    const existing = boards.get(id);
    if (!existing || existing.ownerId !== ownerId) return undefined;
    const updated: Board = {
      ...existing,
      ...patch,
      id: existing.id,
      ownerId: existing.ownerId,
      createdAt: existing.createdAt,
    };
    boards.set(id, updated);
    return updated;
  },
  async getBoardByShareId(shareId) {
    if (!shareId) return undefined;
    return [...boards.values()].find((b) => b.shareId === shareId);
  },
  async listCardsByBoardId(boardId) {
    return [...cards.values()].filter((c) => c.boardId === boardId);
  },
  async addCard(card) {
    cards.set(card.id, card);
    return card;
  },
  async getCard(ownerId, id) {
    const c = cards.get(id);
    return c && c.ownerId === ownerId ? c : undefined;
  },
  async listCards(ownerId, boardId) {
    const all = [...cards.values()].filter((c) => c.ownerId === ownerId);
    return boardId ? all.filter((c) => c.boardId === boardId) : all;
  },
  async updateCard(ownerId, id, patch) {
    const existing = cards.get(id);
    if (!existing || existing.ownerId !== ownerId) return undefined;
    const updated: Card = {
      ...existing,
      ...patch,
      id: existing.id,
      ownerId: existing.ownerId,
      boardId: patch.boardId ?? existing.boardId,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    cards.set(id, updated);
    return updated;
  },
  async deleteCard(ownerId, id) {
    const existing = cards.get(id);
    if (!existing || existing.ownerId !== ownerId) return false;
    return cards.delete(id);
  },
};

/** 테스트용 초기화. */
export function resetMemory(): void {
  users.clear();
  boards.clear();
  cards.clear();
}
