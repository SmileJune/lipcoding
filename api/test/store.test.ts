import { describe, it, expect, beforeEach } from 'vitest';
import * as store from '../src/store.js';
import type { Card } from '../src/types.js';

function makeCard(id: string, boardId = store.DEFAULT_BOARD_ID): Card {
  const now = new Date().toISOString();
  return {
    id,
    boardId,
    sourceUrl: 'https://x',
    title: 't',
    summary: 's',
    keyPoints: [],
    tags: [],
    memo: '',
    color: 'default',
    posX: 0,
    posY: 0,
    imageUrl: null,
    status: 'ready',
    createdAt: now,
    updatedAt: now,
  };
}

beforeEach(() => store.reset());

describe('store', () => {
  it('기본 보드 "전체" 시드', () => {
    const boards = store.listBoards();
    expect(boards).toHaveLength(1);
    expect(boards[0].id).toBe(store.DEFAULT_BOARD_ID);
    expect(boards[0].name).toBe('전체');
  });

  it('보드 생성', () => {
    const b = store.createBoard('공부');
    expect(b.name).toBe('공부');
    expect(b.id).not.toBe(store.DEFAULT_BOARD_ID);
    expect(store.listBoards()).toHaveLength(2);
  });

  it('카드 추가/조회/목록(보드 필터)', () => {
    store.addCard(makeCard('card-1'));
    const other = store.createBoard('b2');
    store.addCard(makeCard('card-2', other.id));
    expect(store.listCards()).toHaveLength(2);
    expect(store.listCards(store.DEFAULT_BOARD_ID)).toHaveLength(1);
    expect(store.getCard('card-1')?.id).toBe('card-1');
  });

  it('카드 수정: updatedAt 갱신, id/createdAt 보존', async () => {
    const c = store.addCard(makeCard('card-1'));
    await new Promise((r) => setTimeout(r, 2));
    const u = store.updateCard('card-1', { memo: '메모' });
    expect(u?.memo).toBe('메모');
    expect(u?.createdAt).toBe(c.createdAt);
    expect(u?.updatedAt).not.toBe(c.updatedAt);
  });

  it('없는 카드 수정/삭제', () => {
    expect(store.updateCard('nope', { memo: 'x' })).toBeUndefined();
    expect(store.deleteCard('nope')).toBe(false);
  });

  it('카드 삭제', () => {
    store.addCard(makeCard('card-1'));
    expect(store.deleteCard('card-1')).toBe(true);
    expect(store.getCard('card-1')).toBeUndefined();
  });
});
