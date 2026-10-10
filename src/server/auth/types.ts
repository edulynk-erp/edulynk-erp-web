import type { Grant } from '@/config/modules';
import type { CampusScope } from '@/domain/common';

/**
 * The signed-in institution user (tenant realm), as asserted by the identity service. Never contains tokens. Platform
 * (control-plane) principals are a different realm and are never accepted by this app.
 */
export interface Principal {
  readonly subject: string;
  readonly displayName: string;
  readonly email: string;
  readonly realm: 'tenant';
  /** From the verified identity assertion only; never from the URL, a header or the browser. */
  readonly tenantId: string;
  readonly roleId: string;
  readonly roleName: string;
  /** Presentation hints for navigation and controls. The institution API must re-check every request. */
  readonly grants: readonly Grant[];
  /** Campuses the user is posted to, from the verified identity. Header selection and data are limited to these. */
  readonly campusScope: CampusScope;
}

export interface TokenSet {
  readonly accessToken: string;
  /** Seconds since the epoch. */
  readonly accessTokenExpiresAt: number;
  readonly refreshToken?: string;
}

export interface DemoAccountSummary {
  readonly email: string;
  readonly displayName: string;
  readonly roleId: string;
  readonly roleName: string;
}

export type SignInStep =
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'redirect'; readonly url: string }
  /** Demo builds only: published demo credentials, compared on the server. */
  | {
      readonly kind: 'demo-credentials';
      readonly password: string;
      readonly accounts: readonly DemoAccountSummary[];
    };

export type SignInCompletion =
  | { readonly kind: 'callback'; readonly params: URLSearchParams }
  | { readonly kind: 'demo-credentials'; readonly email: string; readonly password: string }
  | { readonly kind: 'demo-role'; readonly roleId: string };

export type IdentityAdapterId = 'unconfigured' | 'demo';

/**
 * Seam for the tenant-realm identity integration. The identity contract (token claims, lifetimes, refresh, roles) is
 * unresolved, so only the fail-closed `unconfigured` adapter and the build-excluded `demo` adapter exist; a real
 * adapter is added once the contract is approved.
 */
export interface IdentityAdapter {
  readonly id: IdentityAdapterId;
  beginSignIn(): Promise<SignInStep>;
  completeSignIn(input: SignInCompletion): Promise<TokenSet>;
  refresh(refreshToken: string): Promise<TokenSet>;
  revoke(tokens: Pick<TokenSet, 'accessToken' | 'refreshToken'>): Promise<void>;
  /** Returns null when the token is not (or no longer) valid. */
  getPrincipal(accessToken: string): Promise<Principal | null>;
}

export type CreateDemoIdentityAdapter = (options?: { readonly now?: () => number }) => IdentityAdapter;

export type IdentityErrorCode = 'NOT_CONFIGURED' | 'SIGN_IN_REJECTED' | 'REFRESH_FAILED' | 'ADAPTER_EXCLUDED';

export class IdentityError extends Error {
  constructor(
    readonly code: IdentityErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'IdentityError';
  }
}
