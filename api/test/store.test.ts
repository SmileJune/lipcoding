import { describe, it, expect, beforeEach } from 'vitest';
import { getStore, resetMemory, DEFAULT_BOARD_ID } from '../src/store.js';
import type { Card } from '../src/types.js';

function makeCard(id: string, boardId = DEFAULT_BOARD_ID): Card {
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

beforeEach(() => resetMemory());

describe('store (memory)', () => {
  it('기본 보드 "전체" 시드', async () => {
    const boards = await getStore().listBoards();
    expect(boards).toHaveLength(1);
    expect(boards[0].id).toBe(DEFAULT_BOARD_ID);
    expect(boards[0].name).toBe('전체');
  });

  it('보드 생성', async () => {
    const b = await getStore().createBoard('공부');
    expect(b.name).toBe('공부');
    expect(b.id).not.toBe(DEFAULT_BOARD_ID);
    expect(await getStore().listBoards()).toHaveLength(2);
  });

  it('카드 추가/조회/목록(보드 필터)', async () => {
    const store = getStore();
    await store.addCard(makeCard('card-1'));
    const other = await store.createBoard('b2');
    await store.addCard(makeCard('card-2', other.id));
    expect(await store.listCards()).toHaveLength(2);
    expect(await store.listCards(DEFAULT_BOARD_ID)).toHaveLength(1);
    expect((await store.getCard('card-1'))?.id).toBe('card-1');
  });

  it('카드 수정: updatedAt 갱신, id/createdAt 보존', async () => {
    const store = getStore();
    const c = await store.addCard(makeCard('card-1'));
    await new Promise((r) => setTimeout(r, 2));
    const u = await store.updateCard('card-1', { memo: '메모' });
    expect(u?.memo).toBe('메모');
    expect(u?.createdAt).toBe(c.createdAt);
    expect(u?.updatedAt).not.toBe(c.updatedAt);
  });

  it('없는 카드 수정/삭제', async () => {
    const store = getStore();
    expect(await store.updateCard('nope', { memo: 'x' })).toBeUndefined();
    expect(await store.deleteCard('nope')).toBe(false);
  });

  it('카드 삭제', async () => {
    const store = getStore();
    await store.addCard(makeCard('card-1'));
    expect(await store.deleteCard('card-1')).toBe(true);
    expect(await store.getCard('card-1')).toBeUndefined();
  });
});
