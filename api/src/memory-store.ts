// 인메모리 스토어 (로컬·테스트·Cosmos 미설정 시 폴백).
import {
  DEFAULT_BOARD_ID,
  DEFAULT_BOARD_NAME,
  type Board,
  type Card,
  type Store,
} from './types.js';
import { newBoardId } from './id.js';

const boards = new Map<string, Board>();
const cards = new Map<string, Card>();

function seed(): void {
  if (!boards.has(DEFAULT_BOARD_ID)) {
    boards.set(DEFAULT_BOARD_ID, {
      id: DEFAULT_BOARD_ID,
      name: DEFAULT_BOARD_NAME,
      createdAt: new Date().toISOString(),
    });
  }
}
seed();

export const memoryStore: Store = {
  async ensureSeed() {
    seed();
  },
  async listBoards() {
    return [...boards.values()];
  },
  async getBoard(id) {
    return boards.get(id);
  },
  async createBoard(name) {
    const board: Board = {
      id: newBoardId(),
      name,
      createdAt: new Date().toISOString(),
    };
    boards.set(board.id, board);
    return board;
  },
  async addCard(card) {
    cards.set(card.id, card);
    return card;
  },
  async getCard(id) {
    return cards.get(id);
  },
  async listCards(boardId) {
    const all = [...cards.values()];
    return boardId ? all.filter((c) => c.boardId === boardId) : all;
  },
  async updateCard(id, patch) {
    const existing = cards.get(id);
    if (!existing) return undefined;
    const updated: Card = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    cards.set(id, updated);
    return updated;
  },
  async deleteCard(id) {
    return cards.delete(id);
  },
};

/** 테스트용 초기화. */
export function resetMemory(): void {
  boards.clear();
  cards.clear();
  seed();
}
