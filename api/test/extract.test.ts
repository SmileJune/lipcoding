import { describe, it, expect } from 'vitest';
import { extractArticle } from '../src/extract.js';
import { HttpError } from '../src/types.js';

function htmlResponse(html: string, contentType = 'text/html; charset=utf-8'): Response {
  return {
    ok: true,
    status: 200,
    headers: {
      get: (k: string) => (k.toLowerCase() === 'content-type' ? contentType : null),
    },
    text: async () => html,
  } as unknown as Response;
}

function redirectResponse(location: string, status = 302): Response {
  return {
    ok: false,
    status,
    headers: {
      get: (k: string) => (k.toLowerCase() === 'location' ? location : null),
    },
    text: async () => '',
  } as unknown as Response;
}

const okUrl = async () => new URL('https://example.com/article');

function pageHtml(head: string): string {
  const body =
    '<article><h1>제목</h1><p>' +
    '이것은 충분히 긴 본문 문장입니다. 큐레이션 카드를 위한 테스트 본문이며 여러 문장을 포함합니다. '.repeat(30) +
    '</p></article>';
  return `<html><head>${head}<title>페이지</title></head><body>${body}</body></html>`;
}

describe('extractArticle', () => {
  it('본문/제목 추출', async () => {
    const body =
      '<p>' +
      '이것은 충분히 긴 본문 문장입니다. 큐레이션 카드를 만들기 위한 테스트 본문이며 여러 문장을 포함합니다. '.repeat(
        30,
      ) +
      '</p>';
    const html = `<html><head><title>페이지 제목</title></head><body><article><h1>헤드라인</h1>${body}</article></body></html>`;
    const article = await extractArticle('https://example.com/article', {
      fetchImpl: async () => htmlResponse(html),
      assertUrl: okUrl,
    });
    expect(article.title.length).toBeGreaterThan(0);
    expect(article.text).toContain('테스트 본문');
    expect(article.url).toBe('https://example.com/article');
  });

  it('HTML 이 아니면 422', async () => {
    await expect(
      extractArticle('https://example.com', {
        fetchImpl: async () => htmlResponse('{}', 'application/json'),
        assertUrl: okUrl,
      }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('fetch 실패 → 422', async () => {
    await expect(
      extractArticle('https://example.com', {
        fetchImpl: async () => {
          throw new Error('boom');
        },
        assertUrl: okUrl,
      }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('SSRF: 실제 검증으로 사설 IP 거부 (400)', async () => {
    await expect(extractArticle('http://127.0.0.1/x')).rejects.toMatchObject({ status: 400 });
  });

  it('og:image 를 절대 URL 로 추출', async () => {
    const html = pageHtml('<meta property="og:image" content="https://cdn.example.com/a.jpg">');
    const article = await extractArticle('https://example.com/article', {
      fetchImpl: async () => htmlResponse(html),
      assertUrl: okUrl,
    });
    expect(article.imageUrl).toBe('https://cdn.example.com/a.jpg');
  });

  it('og:image 없으면 twitter:image 폴백 + 상대경로 절대화', async () => {
    const html = pageHtml('<meta name="twitter:image" content="/img/b.png">');
    const article = await extractArticle('https://example.com/article', {
      fetchImpl: async () => htmlResponse(html),
      assertUrl: okUrl,
    });
    expect(article.imageUrl).toBe('https://example.com/img/b.png');
  });

  it('이미지 메타 없으면 null', async () => {
    const html = pageHtml('');
    const article = await extractArticle('https://example.com/article', {
      fetchImpl: async () => htmlResponse(html),
      assertUrl: okUrl,
    });
    expect(article.imageUrl).toBeNull();
  });

  it('리다이렉트(302)를 따라가 최종 페이지를 추출', async () => {
    const html = pageHtml('');
    let call = 0;
    const article = await extractArticle('https://example.com/start', {
      fetchImpl: async () => {
        call += 1;
        return call === 1 ? redirectResponse('https://example.com/final') : htmlResponse(html);
      },
      // 매 홉 입력 URL 을 그대로 통과(공개 URL 가정).
      assertUrl: async (raw: string) => new URL(raw),
    });
    expect(call).toBe(2);
    expect(article.url).toBe('https://example.com/final');
  });

  it('리다이렉트가 사설 IP 로 향하면 차단(400) — SSRF 우회 방어', async () => {
    await expect(
      extractArticle('https://example.com/start', {
        fetchImpl: async () => redirectResponse('http://169.254.169.254/latest/meta-data'),
        // 첫 공개 URL 은 통과, 사설/메타데이터 IP 는 차단.
        assertUrl: async (raw: string) => {
          const u = new URL(raw);
          if (u.hostname === '169.254.169.254') {
            throw new HttpError(400, 'blocked_url', '사설/내부 IP 는 허용되지 않습니다.');
          }
          return u;
        },
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('리다이렉트 루프가 상한을 넘으면 422', async () => {
    await expect(
      extractArticle('https://example.com/a', {
        fetchImpl: async () => redirectResponse('https://example.com/loop'),
        assertUrl: async (raw: string) => new URL(raw),
        maxRedirects: 2,
      }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('일시적 네트워크 오류는 재시도 후 성공', async () => {
    const html = pageHtml('');
    let call = 0;
    const article = await extractArticle('https://example.com/article', {
      fetchImpl: async () => {
        call += 1;
        if (call === 1) throw new Error('ECONNRESET');
        return htmlResponse(html);
      },
      assertUrl: okUrl,
      retries: 1,
      retryDelayMs: 0,
    });
    expect(call).toBe(2);
    expect(article.title.length).toBeGreaterThan(0);
  });
});
