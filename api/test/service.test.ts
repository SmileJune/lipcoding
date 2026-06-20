import { describe, it, expect, beforeEach } from 'vitest';
import { createService } from '../src/service.js';
import { resetMemory, DEFAULT_BOARD_ID } from '../src/store.js';
import type { Article } from '../src/types.js';

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

beforeEach(() => resetMemory());

describe('service', () => {
  it('health 는 copilotMode 포함', () => {
    expect(svc().health()).toMatchObject({ status: 'ok', copilotMode: 'live' });
  });

  it('createCardFromUrl: 카드 생성(요약 반영)', async () => {
    const card = await svc().createCardFromUrl({ url: 'https://x.com/a' });
    expect(card.title).toBe('요약제목');
    expect(card.summary).toBe('한 줄 요약');
    expect(card.boardId).toBe(DEFAULT_BOARD_ID);
    expect(card.status).toBe('ready');
    expect(await svc().listCards()).toHaveLength(1);
  });

  it('createCardFromUrl: url 없으면 400', async () => {
    await expect(svc().createCardFromUrl({})).rejects.toMatchObject({ status: 400 });
  });

  it('createCardFromUrl: 없는 boardId 404', async () => {
    await expect(
      svc().createCardFromUrl({ url: 'https://x', boardId: 'nope' }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('updateCard: 메모/색상 변경', async () => {
    const card = await svc().createCardFromUrl({ url: 'https://x' });
    const u = await svc().updateCard(card.id, { memo: 'm', color: 'yellow' });
    expect(u.memo).toBe('m');
    expect(u.color).toBe('yellow');
  });

  it('updateCard: 잘못된 color → 400', async () => {
    const card = await svc().createCardFromUrl({ url: 'https://x' });
    await expect(svc().updateCard(card.id, { color: 'rainbow' })).rejects.toMatchObject({
      status: 400,
    });
  });

  it('updateCard: 빈 패치 → 400', async () => {
    const card = await svc().createCardFromUrl({ url: 'https://x' });
    await expect(svc().updateCard(card.id, {})).rejects.toMatchObject({ status: 400 });
  });

  it('updateCard: 없는 카드 → 404', async () => {
    await expect(svc().updateCard('nope', { memo: 'x' })).rejects.toMatchObject({ status: 404 });
  });

  it('deleteCard', async () => {
    const card = await svc().createCardFromUrl({ url: 'https://x' });
    await svc().deleteCard(card.id);
    expect(await svc().listCards()).toHaveLength(0);
  });

  it('createBoard / listBoards', async () => {
    const b = await svc().createBoard('공부');
    expect(b.name).toBe('공부');
    expect(await svc().listBoards()).toHaveLength(2);
  });

  it('createBoard 빈 이름 → 400', async () => {
    await expect(svc().createBoard('')).rejects.toMatchObject({ status: 400 });
  });

  it('organizeBoard 그룹 반환', async () => {
    const r = await svc().organizeBoard(DEFAULT_BOARD_ID);
    expect(r.groups[0].label).toBe('그룹');
  });

  it('organizeBoard 없는 보드 → 404', async () => {
    await expect(svc().organizeBoard('nope')).rejects.toMatchObject({ status: 404 });
  });

  it('chat 답변', async () => {
    const r = await svc().chat({ question: '질문?' });
    expect(r.answer).toBe('챗 답변');
  });

  it('chat 질문 없으면 → 400', async () => {
    await expect(svc().chat({})).rejects.toMatchObject({ status: 400 });
  });
});
