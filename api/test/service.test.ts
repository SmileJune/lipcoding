import { describe, it, expect, beforeEach } from 'vitest';
import { createService } from '../src/service.js';
import { getStore, resetMemory, defaultBoardId } from '../src/store.js';
import type { Article } from '../src/types.js';

const OWNER = 'demo';
const DEFAULT_BOARD_ID = defaultBoardId(OWNER);

const fakeExtract = async (url: string): Promise<Article> => ({
  url,
  title: '추출제목',
  text: '본문 텍스트.',
  imageUrl: null,
});
const fakeSummarize = async () => ({
  title: '요약제목',
  summary: '한 줄 요약',
  keyPoints: ['kp1', 'kp2'],
  tags: ['t1'],
});
const fakeOrganize = async () => [{ label: '그룹', cardIds: [] as string[] }];
const fakeChat = async () => '챗 답변';
const liveMode = () => 'live' as const;

function svc() {
  return createService({
    extract: fakeExtract,
    summarize: fakeSummarize,
    organize: fakeOrganize,
    chat: fakeChat,
    copilotMode: liveMode,
  });
}

beforeEach(async () => {
  resetMemory();
  await getStore().ensureUserSeed(OWNER);
});

describe('service', () => {
  it('health 는 copilotMode/authMode 포함', () => {
    expect(svc().health()).toMatchObject({ status: 'ok', copilotMode: 'live', authMode: 'demo' });
  });

  it('createCardFromUrl: 카드 생성(요약 반영)', async () => {
    const card = await svc().createCardFromUrl(OWNER, { url: 'https://x.com/a' });
    expect(card.title).toBe('요약제목');
    expect(card.summary).toBe('한 줄 요약');
    expect(card.boardId).toBe(DEFAULT_BOARD_ID);
    expect(card.ownerId).toBe(OWNER);
    expect(card.status).toBe('ready');
    expect(await svc().listCards(OWNER)).toHaveLength(1);
  });

  it('createCardFromUrl: url 없으면 400', async () => {
    await expect(svc().createCardFromUrl(OWNER, {})).rejects.toMatchObject({ status: 400 });
  });

  it('createCardFromUrl: 없는 boardId 404', async () => {
    await expect(
      svc().createCardFromUrl(OWNER, { url: 'https://x', boardId: 'nope' }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('updateCard: 메모/색상 변경', async () => {
    const card = await svc().createCardFromUrl(OWNER, { url: 'https://x' });
    const u = await svc().updateCard(OWNER, card.id, { memo: 'm', color: 'yellow' });
    expect(u.memo).toBe('m');
    expect(u.color).toBe('yellow');
  });

  it('updateCard: 잘못된 color → 400', async () => {
    const card = await svc().createCardFromUrl(OWNER, { url: 'https://x' });
    await expect(svc().updateCard(OWNER, card.id, { color: 'rainbow' })).rejects.toMatchObject({
      status: 400,
    });
  });

  it('updateCard: 빈 패치 → 400', async () => {
    const card = await svc().createCardFromUrl(OWNER, { url: 'https://x' });
    await expect(svc().updateCard(OWNER, card.id, {})).rejects.toMatchObject({ status: 400 });
  });

  it('updateCard: 없는 카드 → 404', async () => {
    await expect(svc().updateCard(OWNER, 'nope', { memo: 'x' })).rejects.toMatchObject({
      status: 404,
    });
  });

  it('deleteCard', async () => {
    const card = await svc().createCardFromUrl(OWNER, { url: 'https://x' });
    await svc().deleteCard(OWNER, card.id);
    expect(await svc().listCards(OWNER)).toHaveLength(0);
  });

  it('createBoard / listBoards', async () => {
    const b = await svc().createBoard(OWNER, '공부');
    expect(b.name).toBe('공부');
    expect(await svc().listBoards(OWNER)).toHaveLength(2);
  });

  it('createBoard 빈 이름 → 400', async () => {
    await expect(svc().createBoard(OWNER, '')).rejects.toMatchObject({ status: 400 });
  });

  it('organizeBoard 그룹 반환', async () => {
    const r = await svc().organizeBoard(OWNER, DEFAULT_BOARD_ID);
    expect(r.groups[0].label).toBe('그룹');
  });

  it('organizeBoard 없는 보드 → 404', async () => {
    await expect(svc().organizeBoard(OWNER, 'nope')).rejects.toMatchObject({ status: 404 });
  });

  it('shareBoard: shareId 생성 후 공유', async () => {
    const { board, shareId } = await svc().shareBoard(OWNER, DEFAULT_BOARD_ID);
    expect(shareId).toMatch(/^[a-f0-9]{32}$/);
    expect(board.shareId).toBe(shareId);
  });

  it('shareBoard: 재호출 시 동일 shareId 유지', async () => {
    const first = await svc().shareBoard(OWNER, DEFAULT_BOARD_ID);
    const second = await svc().shareBoard(OWNER, DEFAULT_BOARD_ID);
    expect(second.shareId).toBe(first.shareId);
  });

  it('shareBoard: 없는 보드 → 404', async () => {
    await expect(svc().shareBoard(OWNER, 'nope')).rejects.toMatchObject({ status: 404 });
  });

  it('unshareBoard: shareId 제거', async () => {
    await svc().shareBoard(OWNER, DEFAULT_BOARD_ID);
    const { board } = await svc().unshareBoard(OWNER, DEFAULT_BOARD_ID);
    expect(board.shareId).toBeNull();
  });

  it('getSharedBoard: 공유 보드 + 카드 반환', async () => {
    await svc().createCardFromUrl(OWNER, { url: 'https://x.com/a' });
    const { shareId } = await svc().shareBoard(OWNER, DEFAULT_BOARD_ID);
    const view = await svc().getSharedBoard(shareId);
    expect(view.board.id).toBe(DEFAULT_BOARD_ID);
    expect(view.board.name).toBe('전체');
    expect(view.cards).toHaveLength(1);
    expect(view.cards[0].title).toBe('요약제목');
  });

  it('getSharedBoard: 소유자 정보 포함', async () => {
    await getStore().upsertUser({
      id: OWNER,
      provider: 'github',
      login: 'alice',
      name: 'Alice',
      avatarUrl: 'https://avatar/a.png',
      createdAt: 'x',
    });
    const { shareId } = await svc().shareBoard(OWNER, DEFAULT_BOARD_ID);
    const view = await svc().getSharedBoard(shareId);
    expect(view.owner).toEqual({ name: 'Alice', avatarUrl: 'https://avatar/a.png' });
  });

  it('getSharedBoard: 잘못된 shareId → 404', async () => {
    await expect(svc().getSharedBoard('badtoken')).rejects.toMatchObject({ status: 404 });
    await expect(svc().getSharedBoard('')).rejects.toMatchObject({ status: 404 });
  });

  it('getSharedBoard: 공유 해제된 보드는 404', async () => {
    const { shareId } = await svc().shareBoard(OWNER, DEFAULT_BOARD_ID);
    await svc().unshareBoard(OWNER, DEFAULT_BOARD_ID);
    await expect(svc().getSharedBoard(shareId)).rejects.toMatchObject({ status: 404 });
  });

  it('chat 답변', async () => {
    const r = await svc().chat(OWNER, { question: '질문?' });
    expect(r.answer).toBe('챗 답변');
  });

  it('chat 질문 없으면 → 400', async () => {
    await expect(svc().chat(OWNER, {})).rejects.toMatchObject({ status: 400 });
  });
});
