import 'server-only';
import { campusScopeOf, DEMO_ACCOUNTS, DEMO_TENANT_ID, type DemoAccount } from '@/demo/access/accounts';
import { findDemoRole } from '@/demo/access/roles';
import {
  IdentityError,
  type CreateDemoIdentityAdapter,
  type IdentityAdapter,
  type Principal,
  type TokenSet,
} from '@/server/auth/types';

/**
 * DEMO BUILDS ONLY. Simulated sign-in, not an authentication system: the password below is published in the README
 * and on the sign-in page, and anyone who can reach a demo server can use it. Reachable only through the
 * `@edulynk/demo-identity-adapter` alias, which next.config.ts resolves to `demo.excluded.ts` for production builds;
 * env validation also rejects AUTH_ADAPTER=demo in staging and production. Grants come from demo role fixtures and are
 * presentation hints; a real institution API must enforce authorization itself.
 */
export const DEMO_ADAPTER_MARKER = 'edulynk-demo-identity-adapter:included';

/** Published demo credential (not a secret). Shared by every demo account. */
export const DEMO_PASSWORD = 'Edulynk@Demo2026';

const ACCESS_TOKEN_TTL_SECONDS = 30 * 60;
const TOKEN_PATTERN = /^demo-(access|refresh)\.(usr_[a-z0-9_]+)\.(\d+)\.[A-Za-z0-9-]+$/;

function passwordMatches(candidate: string): boolean {
  const expected = new TextEncoder().encode(DEMO_PASSWORD);
  const given = new TextEncoder().encode(candidate);
  let difference = given.length ^ expected.length;
  for (let index = 0; index < expected.length; index += 1) difference |= (given[index] ?? 0) ^ expected[index]!;
  return difference === 0;
}

export const createDemoIdentityAdapter: CreateDemoIdentityAdapter = ({ now = () => Date.now() } = {}) => {
  const nowSeconds = () => Math.floor(now() / 1000);

  const issue = (account: DemoAccount): TokenSet => {
    const expiresAt = nowSeconds() + ACCESS_TOKEN_TTL_SECONDS;
    return {
      accessToken: `demo-access.${account.userId}.${expiresAt}.${crypto.randomUUID()}`,
      accessTokenExpiresAt: expiresAt,
      refreshToken: `demo-refresh.${account.userId}.0.${crypto.randomUUID()}`,
    };
  };

  const parse = (token: string, kind: 'access' | 'refresh'): DemoAccount | undefined => {
    const match = TOKEN_PATTERN.exec(token);
    if (!match || match[1] !== kind) return undefined;
    const account = DEMO_ACCOUNTS.find((candidate) => candidate.userId === match[2]);
    if (!account) return undefined;
    if (kind === 'access' && Number(match[3]) <= nowSeconds()) return undefined;
    return account;
  };

  const adapter: IdentityAdapter = {
    id: 'demo',
    beginSignIn: async () => ({
      kind: 'demo-credentials',
      password: DEMO_PASSWORD,
      accounts: DEMO_ACCOUNTS.map((account) => ({
        email: account.email,
        displayName: account.fullName,
        roleId: account.roleId,
        roleName: findDemoRole(account.roleId)?.name ?? account.roleId,
      })),
    }),
    completeSignIn: async (input) => {
      if (input.kind === 'demo-credentials') {
        const email = input.email.trim().toLowerCase();
        const account = DEMO_ACCOUNTS.find((candidate) => candidate.email === email);
        // Compare the password even for unknown emails so both failures take the same path.
        const passwordOk = passwordMatches(input.password);
        if (!account || !passwordOk) throw new IdentityError('SIGN_IN_REJECTED', 'Email or password is incorrect.');
        return issue(account);
      }
      if (input.kind === 'demo-role') {
        const account = DEMO_ACCOUNTS.find((candidate) => candidate.roleId === input.roleId);
        if (!account) throw new IdentityError('SIGN_IN_REJECTED', 'Unknown demo role.');
        return issue(account);
      }
      throw new IdentityError('SIGN_IN_REJECTED', 'Unsupported sign-in method.');
    },
    refresh: async (refreshToken) => {
      const account = parse(refreshToken, 'refresh');
      if (!account) throw new IdentityError('REFRESH_FAILED', 'Refresh token rejected.');
      return issue(account);
    },
    revoke: async () => {},
    getPrincipal: async (accessToken): Promise<Principal | null> => {
      const account = parse(accessToken, 'access');
      const role = account ? findDemoRole(account.roleId) : undefined;
      if (!account || !role) return null;
      return {
        subject: account.userId,
        displayName: account.fullName,
        email: account.email,
        realm: 'tenant',
        tenantId: DEMO_TENANT_ID,
        roleId: role.id,
        roleName: role.name,
        grants: role.grants,
        campusScope: campusScopeOf(account),
      };
    },
  };
  return Object.assign(adapter, { marker: DEMO_ADAPTER_MARKER });
};
