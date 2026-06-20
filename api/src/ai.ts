// GitHub Copilot SDK 오케스트레이션 래퍼.
// - 세션 기반 에이전트 루프 + 도구(함수 호출) + 스트리밍.
// - provider: Azure OpenAI/Foundry BYOM(관리 ID 베어러 토큰) 또는 GitHub 기본.
// - 어떤 경로든 실패하면 데모 폴백으로 항상 동작(working-gate 보호).
import {
  CopilotClient,
  approveAll,
  defineTool,
  type ProviderConfig,
  type Tool,
} from '@github/copilot-sdk';
import { DefaultAzureCredential, ManagedIdentityCredential } from '@azure/identity';
import { z } from 'zod';
import type { Article, Card, Insight, InsightKind, OrganizeGroup, Summary } from './types.js';

/** AI 모델 제공자. azure=BYOM, github=Copilot 기본, demo=폴백. */
export type AiProvider = 'azure' | 'github' | 'demo';

/** 오케스트레이션 1회 실행 옵션. */
export interface RunOptions {
  /** 사용자 프롬프트. */
  instruction: string;
  /** 시스템 메시지(append). */
  system?: string;
  /** 세션에 노출할 도구(함수 호출). */
  tools?: Tool<any>[];
  /** 스트리밍 델타 콜백(있으면 streaming 활성화). */
  onDelta?: (chunk: string) => void;
  /** sendAndWait 타임아웃(ms). */
  timeoutMs?: number;
}

/** 세션 실행기. 기본은 Copilot SDK, 테스트에서 주입 가능. */
export type Runner = (opts: RunOptions) => Promise<string>;

export interface AiDeps {
  /** provider 강제 지정(미지정 시 env 자동 감지). */
  provider?: AiProvider;
  /** 오케스트레이션 실행기 주입(테스트/DI). */
  runner?: Runner;
  /** 환경변수 주입(테스트). */
  env?: NodeJS.ProcessEnv;
}

/** env 기준 provider 자동 감지. */
export function aiProvider(env: NodeJS.ProcessEnv = process.env): AiProvider {
  const azureEndpoint = env.AZURE_OPENAI_ENDPOINT?.trim();
  const azureModel = (env.AZURE_OPENAI_DEPLOYMENT ?? env.MODEL_NAME)?.trim();
  if (azureEndpoint && azureModel) return 'azure';
  if (env.GITHUB_TOKEN?.trim()) return 'github';
  return 'demo';
}

/** 하위호환: live/demo 판별(health 등). */
export function copilotMode(
  token = process.env.GITHUB_TOKEN,
  env: NodeJS.ProcessEnv = process.env,
): 'live' | 'demo' {
  const merged = { ...env, GITHUB_TOKEN: token } as NodeJS.ProcessEnv;
  return aiProvider(merged) === 'demo' ? 'demo' : 'live';
}

const COGNITIVE_SCOPE = 'https://cognitiveservices.azure.com/.default';
const SEND_TIMEOUT_MS = 45_000;

let clientPromise: Promise<CopilotClient> | null = null;
let credential: DefaultAzureCredential | ManagedIdentityCredential | undefined;

/** Copilot CLI 클라이언트(지연 싱글턴). 시작 실패 시 다음 호출에서 재시도. */
function getClient(env: NodeJS.ProcessEnv): Promise<CopilotClient> {
  if (!clientPromise) {
    const client = new CopilotClient({ gitHubToken: env.GITHUB_TOKEN, logLevel: 'error' });
    clientPromise = client
      .start()
      .then(() => client)
      .catch((err) => {
        clientPromise = null;
        throw err;
      });
  }
  return clientPromise;
}

/** 환경에 맞는 Azure 자격증명(프로덕션=관리 ID, 로컬=DefaultAzureCredential). */
function getCredential(env: NodeJS.ProcessEnv) {
  if (!credential) {
    const isProd = env.NODE_ENV !== 'development' && Boolean(env.WEBSITE_SITE_NAME);
    credential = isProd
      ? env.AZURE_CLIENT_ID
        ? new ManagedIdentityCredential(env.AZURE_CLIENT_ID)
        : new ManagedIdentityCredential()
      : new DefaultAzureCredential();
  }
  return credential;
}

/** provider별 모델/Provider 설정 구성(Azure=베어러 토큰). */
async function buildModelConfig(
  provider: AiProvider,
  env: NodeJS.ProcessEnv,
): Promise<{ model?: string; provider?: ProviderConfig }> {
  if (provider === 'azure') {
    const baseUrl = (env.AZURE_OPENAI_ENDPOINT ?? '').trim();
    const model = (env.AZURE_OPENAI_DEPLOYMENT ?? env.MODEL_NAME ?? '').trim();
    const { token } = await getCredential(env).getToken(COGNITIVE_SCOPE);
    return {
      model,
      provider: {
        type: 'azure',
        baseUrl,
        bearerToken: token,
        wireApi: 'completions',
        azure: { apiVersion: env.AZURE_OPENAI_API_VERSION?.trim() || '2025-04-01-preview' },
      },
    };
  }
  // GitHub 기본 경로: 모델 미지정 시 SDK 기본값.
  const model = env.GITHUB_MODEL?.trim();
  return model ? { model } : {};
}

/** 기본 실행기: Copilot SDK 세션을 만들어 1회 대화 후 텍스트 반환. */
const defaultRunner: Runner = async ({ instruction, system, tools, onDelta, timeoutMs }) => {
  const env = process.env;
  const provider = aiProvider(env);
  if (provider === 'demo') throw new Error('no_provider');
  const client = await getClient(env);
  const modelConfig = await buildModelConfig(provider, env);
  const session = await client.createSession({
    clientName: 'curio',
    ...modelConfig,
    ...(tools && tools.length ? { tools } : {}),
    onPermissionRequest: approveAll,
    skipCustomInstructions: true,
    streaming: Boolean(onDelta),
    ...(system ? { systemMessage: { mode: 'append', content: system } } : {}),
  });
  try {
    if (onDelta) {
      session.on('assistant.message_delta', (event) => onDelta(event.data.deltaContent));
    }
    const res = await session.sendAndWait({ prompt: instruction }, timeoutMs ?? SEND_TIMEOUT_MS);
    return res?.data.content ?? '';
  } finally {
    await session.disconnect().catch(() => {});
  }
};

const SUMMARY_SYSTEM =
  '당신은 웹페이지를 본문 언어로 간결하게 요약하는 큐레이터입니다. 항상 지정된 JSON 형식으로만 답합니다.';
const ORGANIZE_SYSTEM =
  '당신은 카드들을 주제별로 묶는 큐레이터입니다. 항상 지정된 JSON 형식으로만 답합니다.';
const CHAT_SYSTEM = [
  "당신은 사용자의 큐레이션 보드를 돕는 어시스턴트 'Curio' 입니다.",
  '제공된 카드와 search_cards 도구 결과만 근거로 사실에 기반해 한국어로 간결히 답하세요.',
  '근거가 부족하면 모른다고 답하고 추측하지 마세요.',
].join(' ');

const INSIGHT_SYSTEM = [
  '당신은 사용자의 큐레이션 보드를 분석해 *카드 사이의 숨은 관계*를 발견하는 추론 에이전트입니다.',
  '개별 카드를 다시 요약하지 말고, 여러 카드를 가로질러 종합 추론하세요.',
  'find_related 도구로 주제별 근거 카드를 먼저 확인한 뒤 결론을 내리고, 항상 지정된 JSON 형식으로만 답합니다.',
].join(' ');

// ---------- 요약 ----------

export async function summarize(article: Article, deps: AiDeps = {}): Promise<Summary> {
  const provider = deps.provider ?? aiProvider(deps.env);
  if (provider === 'demo') return demoSummary(article);
  const runner = deps.runner ?? defaultRunner;
  const instruction = [
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
    const text = await runner({ instruction, system: SUMMARY_SYSTEM });
    const parsed = parseSummary(text);
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
  const provider = deps.provider ?? aiProvider(deps.env);
  if (provider === 'demo') return demoOrganize(cards);
  const runner = deps.runner ?? defaultRunner;
  const list = cards.map((c) => `- ${c.id}: ${c.title} [${c.tags.join(', ')}]`).join('\n');
  const instruction = [
    '다음 카드들을 주제별로 그룹핑하세요. JSON 으로만 답하세요.',
    '형식: {"groups":[{"label":string,"cardIds":string[]}]}',
    list,
  ].join('\n');

  try {
    const groups = parseGroups(await runner({ instruction, system: ORGANIZE_SYSTEM }));
    if (groups && groups.length) return groups;
  } catch {
    // 데모 폴백
  }
  return demoOrganize(cards);
}

function parseGroups(content: string): OrganizeGroup[] | null {
  const json = extractJson(content);
  if (!json) return null;
  try {
    const obj = JSON.parse(json) as { groups?: unknown };
    if (!Array.isArray(obj.groups)) return null;
    return obj.groups
      .filter(
        (g): g is OrganizeGroup =>
          !!g &&
          typeof (g as OrganizeGroup).label === 'string' &&
          Array.isArray((g as OrganizeGroup).cardIds),
      )
      .map((g) => ({ label: g.label, cardIds: g.cardIds.map(String) }));
  } catch {
    return null;
  }
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

// ---------- 카드 Q&A (도구 + 스트리밍) ----------

/** 보드 카드들을 키워드로 검색(도구 핸들러 + 단위 테스트용). */
export function searchCards(cards: Card[], query: string): Card[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return cards.slice(0, 8);
  const scored = cards.map((c) => {
    const hay = `${c.title} ${c.summary} ${c.tags.join(' ')} ${c.keyPoints.join(' ')}`.toLowerCase();
    const score = terms.reduce((s, t) => s + (hay.includes(t) ? 1 : 0), 0);
    return { c, score };
  });
  const hits = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.c);
  return (hits.length ? hits : cards).slice(0, 8);
}

/** chat 세션에 노출하는 도구: 보드 카드 검색(함수 호출). */
function chatTools(context: Card[]): Tool<any>[] {
  return [
    defineTool('search_cards', {
      description: '사용자 보드의 카드를 키워드로 검색해 관련 카드(제목·요약·태그)를 반환합니다.',
      parameters: z.object({ query: z.string().describe('검색 키워드') }),
      skipPermission: true,
      handler: ({ query }: { query: string }) =>
        searchCards(context, query).map((c) => ({
          id: c.id,
          title: c.title,
          summary: c.summary,
          tags: c.tags,
        })),
    }),
  ];
}

function chunkText(text: string, size = 24): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

export async function chat(question: string, context: Card[], deps: AiDeps = {}): Promise<string> {
  return chatStream(question, context, undefined, deps);
}

/** 스트리밍 지원 Q&A. onDelta 제공 시 토큰 단위로 전달. */
export async function chatStream(
  question: string,
  context: Card[],
  onDelta?: (chunk: string) => void,
  deps: AiDeps = {},
): Promise<string> {
  const provider = deps.provider ?? aiProvider(deps.env);
  if (provider === 'demo') {
    const answer = demoChat(question, context);
    if (onDelta) for (const chunk of chunkText(answer)) onDelta(chunk);
    return answer;
  }
  const runner = deps.runner ?? defaultRunner;
  const ctx = context
    .map((c) => `- [${c.id}] ${c.title}: ${c.summary} (태그: ${c.tags.join(', ')})`)
    .join('\n')
    .slice(0, 4000);
  const instruction = [
    `질문: ${question}`,
    '',
    '아래는 사용자 보드의 카드 목록입니다. 필요하면 search_cards 도구로 관련 카드를 더 찾아 근거로 활용하세요.',
    ctx || '(카드 없음)',
  ].join('\n');

  let streamed = '';
  const wrapped = onDelta
    ? (chunk: string) => {
        streamed += chunk;
        onDelta(chunk);
      }
    : undefined;

  try {
    const text = await runner({
      instruction,
      system: CHAT_SYSTEM,
      tools: chatTools(context),
      onDelta: wrapped,
    });
    if (text.trim()) return text.trim();
    if (streamed.trim()) return streamed.trim();
  } catch {
    if (streamed.trim()) return streamed.trim();
  }
  const answer = demoChat(question, context);
  if (onDelta && !streamed) for (const chunk of chunkText(answer)) onDelta(chunk);
  return answer;
}

export function demoChat(question: string, context: Card[]): string {
  if (context.length === 0) {
    return `(데모) "${question}" 에 답할 카드가 아직 없습니다.`;
  }
  const titles = context.slice(0, 3).map((c) => c.title).join(', ');
  return `(데모) 현재 ${context.length}개 카드(${titles} 등) 기반으로, "${question}" 관련 내용을 카드 요약에서 확인할 수 있습니다.`;
}
