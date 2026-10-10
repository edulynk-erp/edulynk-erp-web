import 'server-only';
import type { NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from '@/server/auth/cookies';
import { sealSession, sessionFromTokens } from '@/server/auth/session';
import { getSessionKey } from '@/server/auth/session-key';
import type { TokenSet } from '@/server/auth/types';

/** Seals the tokens into a new session (fresh session ID, so a switch or sign-in never reuses the old one). */
export async function setSessionCookie(response: NextResponse, tokens: TokenSet): Promise<NextResponse> {
  const sealed = await sealSession(sessionFromTokens(tokens), getSessionKey());
  response.cookies.set(SESSION_COOKIE, sealed, SESSION_COOKIE_OPTIONS);
  return response;
}
