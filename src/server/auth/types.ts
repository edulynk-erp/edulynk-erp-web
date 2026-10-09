/**
 * The signed-in institution user (tenant realm), as asserted by the identity service. Never contains tokens. Platform
 * (control-plane) principals are a different realm and are never accepted by this app.
 */
export interface Principal {
  readonly subject: string;
  readonly displayName: string;
  readonly realm: 'tenant';
  /** From the verified identity assertion only; never from the URL, a header or the browser. */
  readonly tenantId: string;
}

export interface TokenSet {
  readonly accessToken: string;
  /** Seconds since the epoch. */
  readonly accessTokenExpiresAt: number;
  readonly refreshToken?: string;
}

export type SignInStep = { readonly kind: 'unavailable' } | { readonly kind: 'redirect'; readonly url: string };

export type SignInCompletion = { readonly kind: 'callback'; readonly params: URLSearchParams };

export type IdentityAdapterId = 'unconfigured';

/**
 * Seam for the tenant-realm identity integration. The identity contract (token claims, lifetimes, refresh, roles) is
 * unresolved, so only the fail-closed `unconfigured` adapter exists; a real adapter is added once the contract is
 * approved.
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

export type IdentityErrorCode = 'NOT_CONFIGURED' | 'SIGN_IN_REJECTED' | 'REFRESH_FAILED';

export class IdentityError extends Error {
  constructor(
    readonly code: IdentityErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'IdentityError';
  }
}
