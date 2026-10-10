import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { getIdentityAdapter } from '@/server/auth/adapter';
import { SESSION_COOKIE } from '@/server/auth/cookies';
import { isAccessTokenExpired, unsealSession } from '@/server/auth/session';
import { getSessionKey } from '@/server/auth/session-key';
import type { Grant, ModuleId, PermissionAction } from '@/config/modules';
import type { CampusScope } from '@/domain/common';
import { hasGrant } from '@/lib/access/grants';
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

export type ModuleAccess =
  | { readonly allowed: true; readonly session: ServerSession }
  | {
      readonly allowed: false;
      readonly session: ServerSession;
      readonly module: ModuleId;
      readonly action: PermissionAction;
    };

/**
 * Server-side check for direct navigation to a module screen. Pages render `AccessDenied` when it fails. This guards
 * the UI only; the institution API remains the authorization boundary for data.
 */
export async function checkModuleAccess(module: ModuleId, action: PermissionAction = 'view'): Promise<ModuleAccess> {
  const session = await requireSession();
  return hasGrant(session.principal.grants, module, action)
    ? { allowed: true, session }
    : { allowed: false, session, module, action };
}

/** The only principal data that crosses to the client. No tokens, no tenant ID. */
export interface ClientPrincipal {
  readonly subject: string;
  readonly displayName: string;
  readonly email: string;
  readonly roleId: string;
  readonly roleName: string;
  readonly grants: readonly Grant[];
  readonly campusScope: CampusScope;
}

export function toClientPrincipal(principal: Principal): ClientPrincipal {
  return {
    subject: principal.subject,
    displayName: principal.displayName,
    email: principal.email,
    roleId: principal.roleId,
    roleName: principal.roleName,
    grants: principal.grants,
    campusScope: principal.campusScope,
  };
}
