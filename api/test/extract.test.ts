import { describe, it, expect } from 'vitest';
import { extractArticle } from '../src/extract.js';

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

const okUrl = async () => new URL('https://example.com/article');

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
});
