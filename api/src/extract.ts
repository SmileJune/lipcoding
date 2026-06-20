// 페이지 본문 추출: SSRF 검증 → fetch(타임아웃·크기제한) → readability 파싱.
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { assertSafeUrl } from './ssrf.js';
import { HttpError, type Article } from './types.js';

const MAX_BYTES = 2_000_000; // 2MB 본문 상한
const TIMEOUT_MS = 8000;
const MAX_TEXT = 12_000; // 요약에 넘길 본문 길이 상한

export interface ExtractDeps {
  fetchImpl?: typeof fetch;
  assertUrl?: typeof assertSafeUrl;
}

export async function extractArticle(
  rawUrl: string,
  deps: ExtractDeps = {},
): Promise<Article> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const assertUrl = deps.assertUrl ?? assertSafeUrl;

  const url = await assertUrl(rawUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetchImpl(url.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'CurioBot/0.1 (+https://github.com/curio)',
        accept: 'text/html,application/xhtml+xml',
      },
    });
  } catch {
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

  const dom = new JSDOM(html, { url: url.toString() });
  const doc = dom.window.document;
  const imageUrl = extractImage(doc as unknown as MetaDoc, url);
  const parsed = new Readability(doc).parse();
  const title = parsed?.title?.trim() || doc.title?.trim() || url.hostname;
  const text = (parsed?.textContent ?? '').replace(/\s+/g, ' ').trim();

  if (!text) {
    throw new HttpError(422, 'extraction_failed', '본문을 추출하지 못했습니다.');
  }
  return { url: url.toString(), title, text: text.slice(0, MAX_TEXT), imageUrl };
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
