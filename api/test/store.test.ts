import { describe, it, expect, beforeEach } from 'vitest';
import { getStore, resetMemory, defaultBoardId } from '../src/store.js';
import type { Card } from '../src/types.js';

const OWNER = 'demo';
const DEFAULT_BOARD_ID = defaultBoardId(OWNER);

function makeCard(id: string, boardId = DEFAULT_BOARD_ID, ownerId = OWNER): Card {
  const now = new Date().toISOString();
  return {
    id,
    ownerId,
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

beforeEach(async () => {
  resetMemory();
  await getStore().ensureUserSeed(OWNER);
});

describe('store (memory)', () => {
  it('기본 보드 "전체" 시드', async () => {
    const boards = await getStore().listBoards(OWNER);
    expect(boards).toHaveLength(1);
    expect(boards[0].id).toBe(DEFAULT_BOARD_ID);
    expect(boards[0].name).toBe('전체');
  });

  it('보드 생성', async () => {
    const b = await getStore().createBoard(OWNER, '공부');
    expect(b.name).toBe('공부');
    expect(b.id).not.toBe(DEFAULT_BOARD_ID);
    expect(await getStore().listBoards(OWNER)).toHaveLength(2);
  });

  it('카드 추가/조회/목록(보드 필터)', async () => {
    const store = getStore();
    await store.addCard(makeCard('card-1'));
    const other = await store.createBoard(OWNER, 'b2');
    await store.addCard(makeCard('card-2', other.id));
    expect(await store.listCards(OWNER)).toHaveLength(2);
    expect(await store.listCards(OWNER, DEFAULT_BOARD_ID)).toHaveLength(1);
    expect((await store.getCard(OWNER, 'card-1'))?.id).toBe('card-1');
  });

  it('카드 수정: updatedAt 갱신, id/createdAt 보존', async () => {
    const store = getStore();
    const c = await store.addCard(makeCard('card-1'));
    await new Promise((r) => setTimeout(r, 2));
    const u = await store.updateCard(OWNER, 'card-1', { memo: '메모' });
    expect(u?.memo).toBe('메모');
    expect(u?.createdAt).toBe(c.createdAt);
    expect(u?.updatedAt).not.toBe(c.updatedAt);
  });

  it('없는 카드 수정/삭제', async () => {
    const store = getStore();
    expect(await store.updateCard(OWNER, 'nope', { memo: 'x' })).toBeUndefined();
    expect(await store.deleteCard(OWNER, 'nope')).toBe(false);
  });

  it('카드 삭제', async () => {
    const store = getStore();
    await store.addCard(makeCard('card-1'));
    expect(await store.deleteCard(OWNER, 'card-1')).toBe(true);
    expect(await store.getCard(OWNER, 'card-1')).toBeUndefined();
  });

  it('다른 사용자 데이터 격리', async () => {
    const store = getStore();
    await store.ensureUserSeed('github:1');
    await store.addCard(makeCard('card-1', DEFAULT_BOARD_ID, OWNER));
    await store.addCard(makeCard('card-2', defaultBoardId('github:1'), 'github:1'));
    expect(await store.listCards(OWNER)).toHaveLength(1);
    expect(await store.listCards('github:1')).toHaveLength(1);
    expect(await store.getCard(OWNER, 'card-2')).toBeUndefined();
    expect(await store.updateCard(OWNER, 'card-2', { memo: 'x' })).toBeUndefined();
    expect(await store.deleteCard(OWNER, 'card-2')).toBe(false);
    expect(await store.listBoards(OWNER)).toHaveLength(1);
    expect(await store.getBoard(OWNER, defaultBoardId('github:1'))).toBeUndefined();
  });

  it('기본 보드 shareId 기본값 null', async () => {
    const board = await getStore().getBoard(OWNER, DEFAULT_BOARD_ID);
    expect(board?.shareId).toBeNull();
  });

  it('updateBoard: shareId 설정/해제', async () => {
    const store = getStore();
    const shared = await store.updateBoard(OWNER, DEFAULT_BOARD_ID, { shareId: 'tok123' });
    expect(shared?.shareId).toBe('tok123');
    const cleared = await store.updateBoard(OWNER, DEFAULT_BOARD_ID, { shareId: null });
    expect(cleared?.shareId).toBeNull();
  });

  it('updateBoard: 다른 사용자 보드는 undefined', async () => {
    const store = getStore();
    await store.ensureUserSeed('github:1');
    expect(
      await store.updateBoard(OWNER, defaultBoardId('github:1'), { shareId: 'x' }),
    ).toBeUndefined();
  });

  it('getBoardByShareId: 공유 토큰으로 조회', async () => {
    const store = getStore();
    await store.updateBoard(OWNER, DEFAULT_BOARD_ID, { shareId: 'tok-abc' });
    const found = await store.getBoardByShareId('tok-abc');
    expect(found?.id).toBe(DEFAULT_BOARD_ID);
    expect(await store.getBoardByShareId('none')).toBeUndefined();
    expect(await store.getBoardByShareId('')).toBeUndefined();
  });

  it('listCardsByBoardId: 소유자 무관 보드 카드 목록', async () => {
    const store = getStore();
    await store.addCard(makeCard('card-1'));
    await store.addCard(makeCard('card-2'));
    const other = await store.createBoard(OWNER, 'b2');
    await store.addCard(makeCard('card-3', other.id));
    expect(await store.listCardsByBoardId(DEFAULT_BOARD_ID)).toHaveLength(2);
    expect(await store.listCardsByBoardId(other.id)).toHaveLength(1);
  });
});
