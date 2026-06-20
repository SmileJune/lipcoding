// SSRF 방지: 외부 URL fetch 전에 사설/내부 대상 차단.
import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
import { HttpError } from './types.js';

/** IP(v4/v6) 가 사설/예약/루프백 범위면 true. */
export function isBlockedAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isBlockedIPv4(ip);
  if (version === 6) return isBlockedIPv6(ip);
  // IP 가 아니면 호출부에서 먼저 해석(resolve)해야 함 → 안전하게 차단 처리.
  return true;
}

function isBlockedIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0) return true; // "this" network
  if (a === 10) return true; // 사설
  if (a === 127) return true; // 루프백
  if (a === 169 && b === 254) return true; // 링크로컬 + 클라우드 메타데이터(169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true; // 사설
  if (a === 192 && b === 168) return true; // 사설
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // 멀티캐스트/예약
  return false;
}

function isBlockedIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true; // 루프백/미지정
  if (lower.startsWith('fe80')) return true; // 링크로컬
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA
  if (lower.startsWith('::ffff:')) {
    const mapped = lower.split(':').pop();
    if (mapped && mapped.includes('.')) return isBlockedIPv4(mapped);
  }
  return false;
}

const BLOCKED_HOSTNAMES = new Set(['localhost']);

type Resolver = (host: string) => Promise<string[]>;

async function defaultResolver(host: string): Promise<string[]> {
  const records = await lookup(host, { all: true });
  return records.map((r) => r.address);
}

/**
 * URL 을 검증하고 안전하면 URL 객체를 반환, 아니면 HttpError(400).
 * resolver 는 테스트 주입용.
 */
export async function assertSafeUrl(
  rawUrl: string,
  resolver: Resolver = defaultResolver,
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new HttpError(400, 'bad_request', '유효하지 않은 URL 입니다.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new HttpError(400, 'bad_request', 'http/https URL 만 허용됩니다.');
  }

  const host = url.hostname.toLowerCase();
  if (
    BLOCKED_HOSTNAMES.has(host) ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    throw new HttpError(400, 'blocked_url', '내부 호스트는 허용되지 않습니다.');
  }

  if (isIP(host)) {
    if (isBlockedAddress(host)) {
      throw new HttpError(400, 'blocked_url', '사설/내부 IP 는 허용되지 않습니다.');
    }
    return url;
  }

  const addresses = await resolver(host);
  if (addresses.length === 0 || addresses.some(isBlockedAddress)) {
    throw new HttpError(400, 'blocked_url', '대상 호스트가 내부 네트워크로 확인되었습니다.');
  }
  return url;
}
