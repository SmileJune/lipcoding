// GitHub Copilot SDK 래퍼. 토큰 미설정/오류 시 데모 폴백으로 항상 동작.
import { prompt as realPrompt } from '@copilot-extensions/preview-sdk';
import type { Article, Card, OrganizeGroup, Summary } from './types.js';

/** 의존성 주입용 prompt 함수 시그니처 (테스트에서 대체). */
export type PromptFn = (
  userPrompt: string,
  options: { token: string; model?: string },
) => Promise<{ message?: { content?: string } }>;

export interface AiDeps {
  token?: string;
  promptImpl?: PromptFn;
}

const defaultPrompt = realPrompt as unknown as PromptFn;

export function copilotMode(token = process.env.GITHUB_TOKEN): 'live' | 'demo' {
  return token && token.trim() ? 'live' : 'demo';
}

// ---------- 요약 ----------

export async function summarize(article: Article, deps: AiDeps = {}): Promise<Summary> {
  const token = deps.token ?? process.env.GITHUB_TOKEN;
  if (!token || !token.trim()) return demoSummary(article);

  const promptImpl = deps.promptImpl ?? defaultPrompt;
  const instruction = [
    '당신은 웹페이지를 요약하는 큐레이터입니다.',
    '아래 본문을 읽고 JSON 으로만 답하세요. 형식:',
    '{"title": string, "summary": string(1문장), "keyPoints": string[3~5], "tags": string[2~4]}',
    '본문 언어로 작성하세요.',
    '',
    `URL: ${article.url}`,
    `기존 제목: ${article.title}`,
    '본문:',
    article.text.slice(0, 6000),
  ].join('\n');

  try {
    const res = await promptImpl(instruction, { token });
    const parsed = parseSummary(res?.message?.content ?? '');
    if (parsed) return { ...parsed, title: parsed.title || article.title };
  } catch {
    // 데모 폴백
  }
  return demoSummary(article);
}

function parseSummary(content: string): Summary | null {
  const json = extractJson(content);
  if (!json) return null;
  try {
    const obj = JSON.parse(json) as Record<string, unknown>;
    if (typeof obj.summary !== 'string') return null;
    return {
      title: typeof obj.title === 'string' ? obj.title : '',
      summary: obj.summary,
      keyPoints: Array.isArray(obj.keyPoints) ? obj.keyPoints.map(String).slice(0, 5) : [],
      tags: Array.isArray(obj.tags) ? obj.tags.map(String).slice(0, 4) : [],
    };
  } catch {
    return null;
  }
}

/** 코드펜스/잡텍스트에서 첫 JSON 객체를 추출. */
function extractJson(content: string): string | null {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : content;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  return candidate.slice(start, end + 1);
}

export function demoSummary(article: Article): Summary {
  const sentences = article.text.split(/(?<=[.!?。])\s+/).filter(Boolean);
  const summary = (sentences[0] ?? article.text).slice(0, 200);
  const keyPoints = sentences.slice(0, 3).map((s) => s.slice(0, 120));
  const words = article.text.toLowerCase().match(/[a-z가-힣0-9]{3,}/g) ?? [];
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
  const tags = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([w]) => w);
  return {
    title: article.title,
    summary: summary || article.title,
    keyPoints: keyPoints.length ? keyPoints : [article.title],
    tags,
  };
}

// ---------- 정리 도우미 ----------

export async function organize(cards: Card[], deps: AiDeps = {}): Promise<OrganizeGroup[]> {
  if (cards.length === 0) return [];
  const token = deps.token ?? process.env.GITHUB_TOKEN;
  if (!token || !token.trim()) return demoOrganize(cards);

  const promptImpl = deps.promptImpl ?? defaultPrompt;
  const list = cards.map((c) => `- ${c.id}: ${c.title} [${c.tags.join(', ')}]`).join('\n');
  const instruction = [
    '다음 카드들을 주제별로 그룹핑하세요. JSON 으로만 답하세요.',
    '형식: {"groups":[{"label":string,"cardIds":string[]}]}',
    list,
  ].join('\n');

  try {
    const res = await promptImpl(instruction, { token });
    const json = extractJson(res?.message?.content ?? '');
    if (json) {
      const obj = JSON.parse(json) as { groups?: unknown };
      if (Array.isArray(obj.groups)) {
        const groups = obj.groups
          .filter(
            (g): g is OrganizeGroup =>
              !!g &&
              typeof (g as OrganizeGroup).label === 'string' &&
              Array.isArray((g as OrganizeGroup).cardIds),
          )
          .map((g) => ({ label: g.label, cardIds: g.cardIds.map(String) }));
        if (groups.length) return groups;
      }
    }
  } catch {
    // 데모 폴백
  }
  return demoOrganize(cards);
}

export function demoOrganize(cards: Card[]): OrganizeGroup[] {
  const groups = new Map<string, string[]>();
  for (const c of cards) {
    const key = c.tags[0] ?? '기타';
    const bucket = groups.get(key) ?? [];
    bucket.push(c.id);
    groups.set(key, bucket);
  }
  return [...groups.entries()].map(([label, cardIds]) => ({ label, cardIds }));
}

// ---------- 카드 Q&A ----------

export async function chat(
  question: string,
  context: Card[],
  deps: AiDeps = {},
): Promise<string> {
  const token = deps.token ?? process.env.GITHUB_TOKEN;
  if (!token || !token.trim()) return demoChat(question, context);

  const promptImpl = deps.promptImpl ?? defaultPrompt;
  const ctx = context
    .map((c) => `- ${c.title}: ${c.summary}`)
    .join('\n')
    .slice(0, 4000);
  const instruction = [
    "당신은 보드 내용 기반 어시스턴트 'Curio' 입니다. 아래 카드 컨텍스트로 질문에 답하세요.",
    '컨텍스트:',
    ctx || '(카드 없음)',
    '',
    `질문: ${question}`,
  ].join('\n');

  try {
    const res = await promptImpl(instruction, { token });
    const answer = res?.message?.content?.trim();
    if (answer) return answer;
  } catch {
    // 데모 폴백
  }
  return demoChat(question, context);
}

export function demoChat(question: string, context: Card[]): string {
  if (context.length === 0) {
    return `(데모) "${question}" 에 답할 카드가 아직 없습니다.`;
  }
  const titles = context.slice(0, 3).map((c) => c.title).join(', ');
  return `(데모) 현재 ${context.length}개 카드(${titles} 등) 기반으로, "${question}" 관련 내용을 카드 요약에서 확인할 수 있습니다.`;
}
