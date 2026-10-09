import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy, createNonce } from '@/server/security/csp';

describe('content security policy', () => {
  it('creates unique base64 nonces', () => {
    const a = createNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(createNonce()).not.toBe(a);
  });

  it('is strict in production builds', () => {
    const csp = buildContentSecurityPolicy({ nonce: 'abc', development: false, upgradeInsecureRequests: true });
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).toContain("style-src 'self' 'nonce-abc'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).toContain('upgrade-insecure-requests');
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toContain('unsafe-inline');
  });

  it('relaxes only what next dev needs', () => {
    const csp = buildContentSecurityPolicy({ nonce: 'abc', development: true, upgradeInsecureRequests: false });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).not.toContain('upgrade-insecure-requests');
  });
});
