// 인증 모듈: 세션 JWT(jose) + 쿠키 + GitHub OAuth. HTTP 프레임워크 비의존(테스트 용이).
import { randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { serialize } from 'cookie';
import { DEMO_USER, type User } from './types.js';

export const AUTH_COOKIE = 'curio_session';
export const STATE_COOKIE = 'curio_oauth_state';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30일
const STATE_TTL_SECONDS = 60 * 10; // 10분

export type AuthMode = 'live' | 'demo';

/** GitHub OAuth 환경변수가 모두 설정되어 있으면 live, 아니면 demo(자동 로그인). */
export function authMode(): AuthMode {
  return process.env.GITHUB_OAUTH_CLIENT_ID &&
    process.env.GITHUB_OAUTH_CLIENT_SECRET &&
    process.env.SESSION_SECRET
    ? 'live'
    : 'demo';
}

function sessionKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET ?? 'curio-dev-insecure-secret-change-me';
  return new TextEncoder().encode(secret);
}

/** 사용자 → 서명된 세션 JWT. */
export async function createSessionToken(user: User): Promise<string> {
  return new SignJWT({
    provider: user.provider,
    login: user.login,
    name: user.name,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(sessionKey());
}

/** 세션 JWT 검증 → User. 실패 시 null. */
export async function readSessionToken(token: string): Promise<User | null> {
  try {
    const { payload } = await jwtVerify(token, sessionKey());
    if (typeof payload.sub !== 'string') return null;
    return {
      id: payload.sub,
      provider: (payload.provider as User['provider']) ?? 'github',
      login: String(payload.login ?? ''),
      name: String(payload.name ?? ''),
      avatarUrl: (payload.avatarUrl as string | null) ?? null,
      createdAt: String(payload.createdAt ?? new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

/** Azure App Service(HTTPS) 환경 감지 → secure 쿠키. */
function isSecureEnv(): boolean {
  return Boolean(process.env.WEBSITE_SITE_NAME) || process.env.NODE_ENV === 'production';
}

export function sessionCookie(token: string): string {
  return serialize(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: isSecureEnv(),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(): string {
  return serialize(AUTH_COOKIE, '', {
    httpOnly: true,
    secure: isSecureEnv(),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export function newState(): string {
  return randomUUID().replace(/-/g, '');
}

export function stateCookie(state: string): string {
  return serialize(STATE_COOKIE, state, {
    httpOnly: true,
    secure: isSecureEnv(),
    sameSite: 'lax',
    path: '/',
    maxAge: STATE_TTL_SECONDS,
  });
}

export function clearStateCookie(): string {
  return serialize(STATE_COOKIE, '', {
    httpOnly: true,
    secure: isSecureEnv(),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/** 데모 모드 사용자 (OAuth 미설정 시). */
export function demoUser(): User {
  return { ...DEMO_USER };
}

// ---------- GitHub OAuth ----------

type FetchLike = typeof fetch;

export function authorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_OAUTH_CLIENT_ID ?? '',
    redirect_uri: redirectUri,
    scope: 'read:user',
    state,
    allow_signup: 'true',
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/** 인가 코드 → access token. */
export async function exchangeCode(
  code: string,
  redirectUri: string,
  fetchImpl: FetchLike = fetch,
): Promise<string> {
  const res = await fetchImpl('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_OAUTH_CLIENT_ID,
      client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`GitHub 토큰 교환 실패: ${res.status}`);
  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!data.access_token) throw new Error(`GitHub 토큰 없음: ${data.error ?? 'unknown'}`);
  return data.access_token;
}

/** access token → GitHub 사용자 → Curio User. */
export async function fetchGithubUser(
  accessToken: string,
  fetchImpl: FetchLike = fetch,
): Promise<User> {
  const res = await fetchImpl('https://api.github.com/user', {
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'curio-app',
    },
  });
  if (!res.ok) throw new Error(`GitHub 사용자 조회 실패: ${res.status}`);
  const gh = (await res.json()) as {
    id: number;
    login: string;
    name: string | null;
    avatar_url: string | null;
  };
  return {
    id: `github:${gh.id}`,
    provider: 'github',
    login: gh.login,
    name: gh.name ?? gh.login,
    avatarUrl: gh.avatar_url ?? null,
    createdAt: new Date().toISOString(),
  };
}
