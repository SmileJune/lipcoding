import { describe, it, expect, vi } from 'vitest';
import {
  aiProvider,
  copilotMode,
  summarize,
  organize,
  chat,
  chatStream,
  searchCards,
  demoSummary,
  demoOrganize,
  demoChat,
  type Runner,
} from '../src/ai.js';
import type { Article, Card } from '../src/types.js';

const article: Article = {
  url: 'https://x.com/a',
  title: '테스트 제목',
  text: 'First sentence here. Second sentence about cats. Third about dogs and cats.',
};

function card(id: string, over: Partial<Card> = {}): Card {
  const now = new Date().toISOString();
  return {
    id,
    ownerId: 'demo',
    boardId: 'b',
    sourceUrl: 'https://x',
    title: `T-${id}`,
    summary: `S-${id}`,
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
    ...over,
  };
}

/** 고정 텍스트를 반환하는 러너. */
const runnerOf = (text: string): Runner => async () => text;

describe('aiProvider / copilotMode', () => {
  it('Azure 엔드포인트+모델 → azure', () => {
    expect(
      aiProvider({
        AZURE_OPENAI_ENDPOINT: 'https://x.openai.azure.com',
        AZURE_OPENAI_DEPLOYMENT: 'o4-mini',
      } as NodeJS.ProcessEnv),
    ).toBe('azure');
    expect(
      aiProvider({
        AZURE_OPENAI_ENDPOINT: 'https://x.openai.azure.com',
        MODEL_NAME: 'gpt-5',
      } as NodeJS.ProcessEnv),
    ).toBe('azure');
  });
  it('GITHUB_TOKEN 만 있으면 github', () => {
    expect(aiProvider({ GITHUB_TOKEN: 'tok' } as NodeJS.ProcessEnv)).toBe('github');
  });
  it('아무것도 없으면 demo', () => {
    expect(aiProvider({} as NodeJS.ProcessEnv)).toBe('demo');
  });
  it('copilotMode 는 live/demo', () => {
    expect(copilotMode('tok', {} as NodeJS.ProcessEnv)).toBe('live');
    expect(copilotMode('', {} as NodeJS.ProcessEnv)).toBe('demo');
    expect(
      copilotMode(undefined, {
        AZURE_OPENAI_ENDPOINT: 'https://x',
        AZURE_OPENAI_DEPLOYMENT: 'm',
      } as NodeJS.ProcessEnv),
    ).toBe('live');
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
    const groups = demoOrganize([
      card('1', { tags: ['ai'] }),
      card('2', { tags: ['ai'] }),
      card('3', { tags: ['db'] }),
    ]);
    const labels = groups.map((g) => g.label).sort();
    expect(labels).toEqual(['ai', 'db']);
  });
  it('demoChat 컨텍스트 유무', () => {
    expect(demoChat('q', [])).toContain('아직 없습니다');
    expect(demoChat('q', [card('1')])).toContain('1개');
  });
});

describe('summarize (demo 폴백 / live 러너)', () => {
  it('provider 미설정(env 비움) → 데모', async () => {
    const s = await summarize(article, { env: {} as NodeJS.ProcessEnv });
    expect(s.title).toBe('테스트 제목');
  });
  it('정상 JSON(코드펜스) 응답 파싱', async () => {
    const runner = runnerOf(
      '```json\n{"title":"AI","summary":"한 줄","keyPoints":["a","b"],"tags":["t1"]}\n```',
    );
    const s = await summarize(article, { provider: 'github', runner });
    expect(s.title).toBe('AI');
    expect(s.summary).toBe('한 줄');
    expect(s.keyPoints).toEqual(['a', 'b']);
    expect(s.tags).toEqual(['t1']);
  });
  it('깨진 응답 → 데모 폴백', async () => {
    const s = await summarize(article, { provider: 'github', runner: runnerOf('not json') });
    expect(s.title).toBe('테스트 제목');
  });
  it('러너 예외 → 데모 폴백', async () => {
    const runner: Runner = async () => {
      throw new Error('network');
    };
    const s = await summarize(article, { provider: 'github', runner });
    expect(s.summary.length).toBeGreaterThan(0);
  });
  it('demo provider 면 러너 호출 안 함', async () => {
    const runner = vi.fn(runnerOf('{}'));
    await summarize(article, { provider: 'demo', runner });
    expect(runner).not.toHaveBeenCalled();
  });
});

describe('organize / chat (live 러너)', () => {
  it('organize JSON 파싱', async () => {
    const runner = runnerOf('{"groups":[{"label":"AI","cardIds":["1","2"]}]}');
    const groups = await organize([card('1'), card('2')], { provider: 'github', runner });
    expect(groups[0].label).toBe('AI');
    expect(groups[0].cardIds).toEqual(['1', '2']);
  });
  it('organize 빈 입력 → []', async () => {
    expect(await organize([], { provider: 'github', runner: runnerOf('{}') })).toEqual([]);
  });
  it('chat 러너 텍스트 반환', async () => {
    const answer = await chat('질문', [card('1')], {
      provider: 'github',
      runner: runnerOf('답변입니다'),
    });
    expect(answer).toBe('답변입니다');
  });
  it('chat 러너 빈 응답 → 데모 폴백', async () => {
    const answer = await chat('질문', [card('1')], {
      provider: 'github',
      runner: runnerOf('  '),
    });
    expect(answer).toContain('데모');
  });
});

describe('chatStream 스트리밍', () => {
  it('demo provider 면 onDelta 로 청크 전달', async () => {
    const chunks: string[] = [];
    const answer = await chatStream('질문', [card('1')], (c) => chunks.push(c), { provider: 'demo' });
    expect(chunks.length).toBeGreaterThan(0);
    expect(answer).toContain('데모');
  });
  it('live: 러너에 onDelta 전달', async () => {
    const seen: string[] = [];
    const runner: Runner = async ({ onDelta }) => {
      onDelta?.('가');
      onDelta?.('나');
      return '가나';
    };
    const answer = await chatStream('질문', [card('1')], (c) => seen.push(c), {
      provider: 'github',
      runner,
    });
    expect(seen).toEqual(['가', '나']);
    expect(answer).toBe('가나');
  });
  it('live 러너 실패 + 스트림 부분 → 부분 반환', async () => {
    const runner: Runner = async ({ onDelta }) => {
      onDelta?.('부분');
      throw new Error('fail');
    };
    const answer = await chatStream('질문', [card('1')], () => {}, { provider: 'github', runner });
    expect(answer).toBe('부분');
  });
});

describe('searchCards (chat 도구)', () => {
  const cards = [
    card('1', { title: 'AI 입문', tags: ['ai'], summary: '머신러닝 개요' }),
    card('2', { title: 'DB 설계', tags: ['db'], summary: '정규화' }),
    card('3', { title: 'AI 윤리', tags: ['ai'], summary: '편향' }),
  ];
  it('키워드 매칭 카드 반환', () => {
    const hits = searchCards(cards, 'ai');
    expect(hits.map((c) => c.id).sort()).toEqual(['1', '3']);
  });
  it('빈 쿼리 → 상위 카드', () => {
    expect(searchCards(cards, '').length).toBe(3);
  });
  it('매칭 없으면 전체에서 잘라 반환', () => {
    expect(searchCards(cards, 'zzzz').length).toBe(3);
  });
});

describe('azure provider (Azure OpenAI 모델 레이어)', () => {
  const azureEnv = {
    AZURE_OPENAI_ENDPOINT: 'https://aoai-curio.openai.azure.com',
    AZURE_OPENAI_DEPLOYMENT: 'gpt-4o-mini',
  } as NodeJS.ProcessEnv;

  it('env 자동 감지 시 azure provider 로 동작', () => {
    expect(aiProvider(azureEnv)).toBe('azure');
    expect(copilotMode(undefined, azureEnv)).toBe('live');
  });
  it('summarize 가 azure 러너 응답을 파싱', async () => {
    const runner = runnerOf('{"title":"AOAI","summary":"한 줄","keyPoints":["a"],"tags":["t"]}');
    const s = await summarize(article, { provider: 'azure', runner });
    expect(s.title).toBe('AOAI');
    expect(s.summary).toBe('한 줄');
  });
  it('organize 가 azure 러너로 그룹핑', async () => {
    const runner = runnerOf('{"groups":[{"label":"클라우드","cardIds":["1"]}]}');
    const groups = await organize([card('1')], { provider: 'azure', runner });
    expect(groups[0].label).toBe('클라우드');
  });
  it('chatStream 이 azure 러너 스트리밍 전달', async () => {
    const seen: string[] = [];
    const runner: Runner = async ({ onDelta }) => {
      onDelta?.('Az');
      onDelta?.('ure');
      return 'Azure';
    };
    const answer = await chatStream('질문', [card('1')], (c) => seen.push(c), {
      provider: 'azure',
      runner,
    });
    expect(seen).toEqual(['Az', 'ure']);
    expect(answer).toBe('Azure');
  });
  it('azure 러너 실패 시 데모 폴백 유지', async () => {
    const runner: Runner = async () => {
      throw new Error('aoai_down');
    };
    const s = await summarize(article, { provider: 'azure', runner });
    expect(s.title).toBe('테스트 제목');
  });
});
