// 페이지 본문 추출: SSRF 검증 → fetch(타임아웃·크기제한) → readability 파싱.
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { assertSafeUrl } from './ssrf.js';
import { HttpError, type Article } from './types.js';

const MAX_BYTES = 2_000_000; // 2MB 본문 상한
const TIMEOUT_MS = 8000;
const MAX_TEXT = 12_000; // 요약에 넘길 본문 길이 상한
const MAX_REDIRECTS = 5; // 리다이렉트 추적 상한
const DEFAULT_RETRIES = 1; // 일시적 네트워크 오류 재시도 횟수
const DEFAULT_RETRY_DELAY_MS = 200;

const REQUEST_HEADERS = {
  'user-agent': 'CurioBot/0.1 (+https://github.com/curio)',
  accept: 'text/html,application/xhtml+xml',
};

export interface ExtractDeps {
  fetchImpl?: typeof fetch;
  assertUrl?: typeof assertSafeUrl;
  /** 리다이렉트 추적 상한(기본 5). */
  maxRedirects?: number;
  /** 일시적 네트워크 오류 재시도 횟수(기본 1). */
  retries?: number;
  /** 재시도 사이 지연(ms, 기본 200). 테스트는 0 으로 즉시. */
  retryDelayMs?: number;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** 단일 URL fetch. 타임아웃(Abort) 외 일시적 오류는 retries 만큼 재시도. */
async function fetchWithRetry(
  fetchImpl: typeof fetch,
  url: string,
  signal: AbortSignal,
  retries: number,
  retryDelayMs: number,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchImpl(url, { signal, redirect: 'manual', headers: REQUEST_HEADERS });
    } catch (err) {
      lastErr = err;
      // 타임아웃(Abort)은 재시도하지 않음.
      if (signal.aborted || (err as { name?: string } | null)?.name === 'AbortError') break;
      if (attempt < retries && retryDelayMs > 0) await sleep(retryDelayMs);
    }
  }
  throw lastErr;
}

/**
 * 리다이렉트를 수동으로 추적하되 매 홉마다 SSRF 재검증.
 * (redirect:'follow' 는 사설 IP 로의 우회 리다이렉트를 막지 못하므로 사용하지 않음.)
 */
async function fetchSafe(
  startUrl: URL,
  cfg: {
    fetchImpl: typeof fetch;
    assertUrl: typeof assertSafeUrl;
    maxRedirects: number;
    retries: number;
    retryDelayMs: number;
  },
  signal: AbortSignal,
): Promise<{ res: Response; finalUrl: URL }> {
  let current = startUrl;
  for (let hop = 0; hop <= cfg.maxRedirects; hop++) {
    const res = await fetchWithRetry(
      cfg.fetchImpl,
      current.toString(),
      signal,
      cfg.retries,
      cfg.retryDelayMs,
    );
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) return { res, finalUrl: current };
      const next = new URL(location, current);
      // 리다이렉트 대상도 사설/내부면 HttpError(400) 으로 차단.
      current = await cfg.assertUrl(next.toString());
      continue;
    }
    return { res, finalUrl: current };
  }
  throw new HttpError(422, 'extraction_failed', '리다이렉트가 너무 많습니다.');
}

export async function extractArticle(
  rawUrl: string,
  deps: ExtractDeps = {},
): Promise<Article> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const assertUrl = deps.assertUrl ?? assertSafeUrl;
  const maxRedirects = deps.maxRedirects ?? MAX_REDIRECTS;
  const retries = deps.retries ?? DEFAULT_RETRIES;
  const retryDelayMs = deps.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

  const url = await assertUrl(rawUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  let finalUrl: URL;
  try {
    ({ res, finalUrl } = await fetchSafe(
      url,
      { fetchImpl, assertUrl, maxRedirects, retries, retryDelayMs },
      controller.signal,
    ));
  } catch (err) {
    // SSRF 차단·리다이렉트 초과(HttpError)는 원래 상태코드 유지, 그 외는 422.
    if (err instanceof HttpError) throw err;
    throw new HttpError(422, 'extraction_failed', '페이지를 가져오지 못했습니다.');
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new HttpError(422, 'extraction_failed', `페이지 응답 오류 (${res.status}).`);
  }
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('html')) {
    throw new HttpError(422, 'extraction_failed', 'HTML 페이지가 아닙니다.');
  }
  const lenHeader = res.headers.get('content-length');
  if (lenHeader && Number(lenHeader) > MAX_BYTES) {
    throw new HttpError(422, 'extraction_failed', '본문이 너무 큽니다.');
  }

  let html = await res.text();
  if (html.length > MAX_BYTES) html = html.slice(0, MAX_BYTES);

  const dom = new JSDOM(html, { url: finalUrl.toString() });
  const doc = dom.window.document;
  const imageUrl = extractImage(doc as unknown as MetaDoc, finalUrl);
  const parsed = new Readability(doc).parse();
  const title = parsed?.title?.trim() || doc.title?.trim() || finalUrl.hostname;
  const text = (parsed?.textContent ?? '').replace(/\s+/g, ' ').trim();

  if (!text) {
    throw new HttpError(422, 'extraction_failed', '본문을 추출하지 못했습니다.');
  }
  return { url: finalUrl.toString(), title, text: text.slice(0, MAX_TEXT), imageUrl };
}

// 대표 이미지: og:image → twitter:image → link[rel=image_src] 순으로 탐색.
type MetaDoc = {
  querySelector(selectors: string): { getAttribute(name: string): string | null } | null;
};

const IMAGE_SELECTORS = [
  'meta[property="og:image"]',
  'meta[property="og:image:url"]',
  'meta[name="og:image"]',
  'meta[name="twitter:image"]',
  'meta[name="twitter:image:src"]',
  'meta[property="twitter:image"]',
];

export function extractImage(doc: MetaDoc, baseUrl: URL): string | null {
  for (const sel of IMAGE_SELECTORS) {
    const content = doc.querySelector(sel)?.getAttribute('content');
    const abs = content ? toAbsoluteHttpUrl(content, baseUrl) : null;
    if (abs) return abs;
  }
  const linkHref = doc.querySelector('link[rel="image_src"]')?.getAttribute('href');
  return linkHref ? toAbsoluteHttpUrl(linkHref, baseUrl) : null;
}

function toAbsoluteHttpUrl(candidate: string, baseUrl: URL): string | null {
  try {
    const u = new URL(candidate.trim(), baseUrl);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}
