// 인메모리 스토어 (MVP). 프로덕션에서는 Cosmos DB 로 교체.
import { randomUUID } from 'node:crypto';
import type { Board, Card } from './types.js';

const boards = new Map<string, Board>();
const cards = new Map<string, Card>();

export const DEFAULT_BOARD_ID = 'board-default';

/** 스토어 초기화 (테스트에서 사용). 기본 보드 "전체" 시드. */
export function reset(): void {
  boards.clear();
  cards.clear();
  boards.set(DEFAULT_BOARD_ID, {
    id: DEFAULT_BOARD_ID,
    name: '전체',
    createdAt: new Date().toISOString(),
  });
}

reset();

export function listBoards(): Board[] {
  return [...boards.values()];
}

export function getBoard(id: string): Board | undefined {
  return boards.get(id);
}

export function createBoard(name: string): Board {
  const board: Board = {
    id: `board-${randomUUID().slice(0, 8)}`,
    name,
    createdAt: new Date().toISOString(),
  };
  boards.set(board.id, board);
  return board;
}

export function newCardId(): string {
  return `card-${randomUUID().slice(0, 8)}`;
}

export function addCard(card: Card): Card {
  cards.set(card.id, card);
  return card;
}

export function getCard(id: string): Card | undefined {
  return cards.get(id);
}

export function listCards(boardId?: string): Card[] {
  const all = [...cards.values()];
  return boardId ? all.filter((c) => c.boardId === boardId) : all;
}

export function updateCard(id: string, patch: Partial<Card>): Card | undefined {
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
}

export function deleteCard(id: string): boolean {
  return cards.delete(id);
}
