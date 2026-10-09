export interface CspOptions {
  readonly nonce: string;
  /** `next dev` only: React needs eval for dev tooling and the dev overlay injects styles. */
  readonly development: boolean;
  /** Staging/production are HTTPS-only; local HTTP must not be upgraded. */
  readonly upgradeInsecureRequests: boolean;
}

export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

/** Strict nonce-based policy (Next.js applies the nonce to its own scripts and inline styles during dynamic SSR). */
export function buildContentSecurityPolicy({ nonce, development, upgradeInsecureRequests }: CspOptions): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}`,
    development ? "style-src 'self' 'unsafe-inline'" : `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    "worker-src 'self'",
  ];
  if (upgradeInsecureRequests) directives.push('upgrade-insecure-requests');
  return directives.join('; ');
}
