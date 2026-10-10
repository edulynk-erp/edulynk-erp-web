import { NextResponse, type NextRequest } from 'next/server';
import { getIdentityAdapter } from '@/server/auth/adapter';
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from '@/server/auth/cookies';
import {
  needsRefresh,
  sealSession,
  sessionFromTokens,
  unsealSession,
  type SessionPayload,
} from '@/server/auth/session';
import { getSessionKey } from '@/server/auth/session-key';
import { buildContentSecurityPolicy, createNonce } from '@/server/security/csp';
import { getServerEnv, isDeployedEnvironment } from '@/server/env';

/** `/invite`, password recovery and `/demo/` are public by design: their users cannot sign in yet. */
const PUBLIC_PREFIXES = [
  '/login',
  '/auth/',
  '/healthz',
  '/bff/',
  '/invite/',
  '/forgot-password',
  '/reset-password/',
  '/demo/',
];

type SessionState = { kind: 'none' } | { kind: 'valid' } | { kind: 'refreshed'; sealed: string } | { kind: 'expired' };

/**
 * Runs before every page and route handler. It (1) issues a per-request CSP nonce and forwards it on the request
 * headers so Next.js stamps it on framework scripts, (2) refreshes the session ahead of access-token expiry and
 * (3) optimistically redirects unauthenticated page loads. It is not the authorization boundary: pages call
 * `requireSession`, the BFF checks the session, and the institution API re-checks everything.
 */
export async function proxy(request: NextRequest) {
  const env = getServerEnv();
  const nonce = createNonce();
  const csp = buildContentSecurityPolicy({
    nonce,
    development: process.env.NODE_ENV === 'development',
    upgradeInsecureRequests: isDeployedEnvironment(env.APP_ENV),
  });

  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix.replace(/\/$/, '') || pathname.startsWith(prefix),
  );
  const isPageNavigation = request.method === 'GET' && !pathname.startsWith('/bff/');
  const session = await resolveSession(request, env.SESSION_REFRESH_SKEW_SECONDS);

  if (session.kind === 'refreshed') request.cookies.set(SESSION_COOKIE, session.sealed);
  if (session.kind === 'expired') request.cookies.delete(SESSION_COOKIE);

  if (!isPublic && isPageNavigation && (session.kind === 'none' || session.kind === 'expired')) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    if (pathname !== '/') loginUrl.searchParams.set('next', `${pathname}${search}`);
    if (session.kind === 'expired') loginUrl.searchParams.set('reason', 'session_expired');
    const redirect = NextResponse.redirect(loginUrl);
    applySessionCookie(redirect, session);
    redirect.headers.set('Content-Security-Policy', csp);
    return redirect;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  applySessionCookie(response, session);
  return response;
}

async function resolveSession(request: NextRequest, skewSeconds: number): Promise<SessionState> {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return { kind: 'none' };
  const payload = await unsealSession(raw, getSessionKey());
  if (!payload) return { kind: 'expired' };
  if (!needsRefresh(payload, skewSeconds)) return { kind: 'valid' };
  return refresh(payload);
}

async function refresh(payload: SessionPayload): Promise<SessionState> {
  if (!payload.rt) return { kind: 'expired' };
  try {
    const tokens = await getIdentityAdapter().refresh(payload.rt);
    return { kind: 'refreshed', sealed: await sealSession(sessionFromTokens(tokens, payload.sid), getSessionKey()) };
  } catch {
    return { kind: 'expired' };
  }
}

function applySessionCookie(response: NextResponse, session: SessionState): void {
  if (session.kind === 'refreshed') response.cookies.set(SESSION_COOKIE, session.sealed, SESSION_COOKIE_OPTIONS);
  if (session.kind === 'expired') response.cookies.set(SESSION_COOKIE, '', { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
