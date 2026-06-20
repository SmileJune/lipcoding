import { describe, it, expect } from 'vitest';
import {
  summarize,
  organize,
  chat,
  demoSummary,
  demoOrganize,
  demoChat,
  copilotMode,
} from '../src/ai.js';
import type { Article, Card } from '../src/types.js';

const article: Article = {
  url: 'https://x.com/a',
  title: '테스트 제목',
  text: 'First sentence here. Second sentence about cats. Third about dogs and cats.',
};

function card(id: string, tags: string[] = []): Card {
  const now = new Date().toISOString();
  return {
    id,
    boardId: 'b',
    sourceUrl: 'https://x',
    title: `T-${id}`,
    summary: `S-${id}`,
    keyPoints: [],
    tags,
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

describe('copilotMode', () => {
  it('토큰 유무로 live/demo 판별', () => {
    expect(copilotMode('tok')).toBe('live');
    expect(copilotMode('')).toBe('demo');
    expect(copilotMode(undefined)).toBe('demo');
  });
});

describe('demo 폴백', () => {
  it('demoSummary 형식', () => {
    const s = demoSummary(article);
    expect(s.title).toBe('테스트 제목');
    expect(s.summary.length).toBeGreaterThan(0);
    expect(s.keyPoints.length).toBeGreaterThan(0);
    expect(Array.isArray(s.tags)).toBe(true);
  });

  it('demoOrganize 태그별 그룹핑', () => {
    const groups = demoOrganize([card('1', ['ai']), card('2', ['ai']), card('3', ['db'])]);
    const labels = groups.map((g) => g.label).sort();
    expect(labels).toEqual(['ai', 'db']);
  });

  it('demoChat 컨텍스트 유무', () => {
    expect(demoChat('q', [])).toContain('아직 없습니다');
    expect(demoChat('q', [card('1')])).toContain('1개');
  });
});

describe('summarize (live 경로, prompt 주입)', () => {
  it('정상 JSON(코드펜스) 응답 파싱', async () => {
    const promptImpl = async () => ({
      message: {
        content:
          '```json\n{"title":"AI","summary":"한 줄","keyPoints":["a","b"],"tags":["t1"]}\n```',
      },
    });
    const s = await summarize(article, { token: 'tok', promptImpl });
    expect(s.title).toBe('AI');
    expect(s.summary).toBe('한 줄');
    expect(s.keyPoints).toEqual(['a', 'b']);
    expect(s.tags).toEqual(['t1']);
  });

  it('깨진 응답 → 데모 폴백', async () => {
    const promptImpl = async () => ({ message: { content: 'not json at all' } });
    const s = await summarize(article, { token: 'tok', promptImpl });
    expect(s.title).toBe('테스트 제목');
  });

  it('예외 발생 → 데모 폴백', async () => {
    const promptImpl = async () => {
      throw new Error('network');
    };
    const s = await summarize(article, { token: 'tok', promptImpl });
    expect(s.summary.length).toBeGreaterThan(0);
  });

  it('토큰 없으면 prompt 호출하지 않음', async () => {
    let called = false;
    const promptImpl = async () => {
      called = true;
      return { message: { content: '{}' } };
    };
    await summarize(article, { token: '', promptImpl });
    expect(called).toBe(false);
  });
});

describe('organize / chat (live 경로)', () => {
  it('organize JSON 파싱', async () => {
    const promptImpl = async () => ({
      message: { content: '{"groups":[{"label":"AI","cardIds":["1","2"]}]}' },
    });
    const groups = await organize([card('1'), card('2')], { token: 'tok', promptImpl });
    expect(groups[0].label).toBe('AI');
    expect(groups[0].cardIds).toEqual(['1', '2']);
  });

  it('organize 빈 입력 → []', async () => {
    expect(await organize([], { token: 'tok' })).toEqual([]);
  });

  it('chat 응답 반환', async () => {
    const promptImpl = async () => ({ message: { content: '답변입니다' } });
    const answer = await chat('질문', [card('1')], { token: 'tok', promptImpl });
    expect(answer).toBe('답변입니다');
  });
});
