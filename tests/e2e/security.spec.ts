import { expect, test } from '@playwright/test';
import { trackCspViolations } from './helpers';

function nonceFrom(csp: string | undefined): string {
  const match = /'nonce-([A-Za-z0-9+/=]+)'/.exec(csp ?? '');
  expect(match, 'CSP must contain a nonce').not.toBeNull();
  return match![1]!;
}

test.describe('content security policy', () => {
  test('every rendered script and style carries the per-request nonce from the CSP header', async ({ request }) => {
    const first = await request.get('/login');
    const second = await request.get('/login');
    const csp = first.headers()['content-security-policy'];
    const nonce = nonceFrom(csp);
    expect(nonceFrom(second.headers()['content-security-policy'])).not.toBe(nonce);

    expect(csp).toContain("script-src 'self' 'nonce-");
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toContain('unsafe-inline');

    const html = await first.text();
    const scripts = html.match(/<script\b[^>]*>/g) ?? [];
    expect(scripts.length).toBeGreaterThan(0);
    for (const tag of scripts) expect(tag, tag).toContain(`nonce="${nonce}"`);
    const inlineStyles = html.match(/<style\b[^>]*>/g) ?? [];
    expect(inlineStyles.length, 'branding style').toBeGreaterThan(0);
    for (const tag of inlineStyles) expect(tag, tag).toContain(`nonce="${nonce}"`);
  });

  test('the sign-in page hydrates under the CSP with zero violations', async ({ page }) => {
    const violations = await trackCspViolations(page);
    await page.goto('/login');
    await expect(page.getByText(/Sign-in is not configured/)).toBeVisible();
    expect(await violations()).toEqual([]);
  });

  test('sends the security headers on pages and route handlers', async ({ request }) => {
    for (const path of ['/login', '/healthz']) {
      const headers = (await request.get(path)).headers();
      expect(headers['x-frame-options'], path).toBe('DENY');
      expect(headers['x-content-type-options'], path).toBe('nosniff');
      expect(headers['referrer-policy'], path).toBe('strict-origin-when-cross-origin');
      expect(headers['permissions-policy'], path).toContain('camera=()');
      expect(headers['cross-origin-opener-policy'], path).toBe('same-origin');
      expect(headers['strict-transport-security'], path).toBe('max-age=63072000; includeSubDomains');
      expect(headers['x-powered-by'], path).toBeUndefined();
      expect(headers['content-security-policy'], path).toContain("frame-ancestors 'none'");
    }
  });

  test('healthz reveals nothing about configuration', async ({ request }) => {
    const response = await request.get('/healthz');
    expect(await response.json()).toEqual({ status: 'ok' });
  });
});

test.describe('BFF', () => {
  test('requires a session and never reaches platform administration', async ({ request }) => {
    const unauthenticated = await request.get('/bff/items');
    expect(unauthenticated.status()).toBe(401);
    expect(await unauthenticated.json()).toMatchObject({ code: 'UNAUTHENTICATED' });

    const platform = await request.get('/bff/platform/tenants');
    expect(platform.status()).toBe(400);
    expect(await platform.json()).toMatchObject({ code: 'INVALID_PATH' });
  });

  test('rejects cross-origin state-changing requests', async ({ request }) => {
    const response = await request.post('/bff/items', {
      headers: { origin: 'https://evil.example', 'content-type': 'application/json' },
      data: '{}',
    });
    expect(response.status()).toBe(403);
  });
});
