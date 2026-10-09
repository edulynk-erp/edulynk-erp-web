import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { getIdentityAdapter } from '@/server/auth/adapter';
import { SESSION_COOKIE } from '@/server/auth/cookies';
import { isAccessTokenExpired, unsealSession } from '@/server/auth/session';
import { getSessionKey } from '@/server/auth/session-key';
import type { Principal } from '@/server/auth/types';

export interface ServerSession {
  readonly principal: Principal;
  /** Server-only. Never pass to a Client Component. */
  readonly accessToken: string;
}

/** Accepts only tenant-realm principals that carry a tenant; anything else is treated as signed out (fail closed). */
export function isTenantPrincipal(principal: Principal | null): principal is Principal {
  return principal !== null && principal.realm === 'tenant' && principal.tenantId.trim() !== '';
}

/** Per-request (React `cache`) resolution of the session; the principal is re-fetched from the identity adapter. */
export const getServerSession = cache(async (): Promise<ServerSession | null> => {
  const store = await cookies();
  const payload = await unsealSession(store.get(SESSION_COOKIE)?.value, getSessionKey());
  if (!payload || isAccessTokenExpired(payload)) return null;
  const principal = await getIdentityAdapter().getPrincipal(payload.at);
  if (!isTenantPrincipal(principal)) return null;
  return { principal, accessToken: payload.at };
});

export async function requireSession(): Promise<ServerSession> {
  const session = await getServerSession();
  if (!session) redirect('/login');
  return session;
}

/** The only principal data that crosses to the client. */
export interface ClientPrincipal {
  readonly displayName: string;
}

export function toClientPrincipal(principal: Principal): ClientPrincipal {
  return { displayName: principal.displayName };
}
