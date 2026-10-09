import { describe, expect, it } from 'vitest';
import { loginNotice } from '@/features/auth/login-messages';
import { safeRedirectPath } from '@/lib/utils/safe-redirect';
import { safeHref } from '@/lib/utils/safe-url';

describe('safeRedirectPath', () => {
  it('keeps same-origin paths with query strings', () => {
    expect(safeRedirectPath('/support/tickets?page=2')).toBe('/support/tickets?page=2');
  });

  it.each([
    'https://evil.test',
    '//evil.test',
    '/\\evil.test',
    '\\\\evil.test',
    'javascript:alert(1)',
    '/login',
    '/auth/logout',
    '/bff/x',
    '/a\nb',
    '/a\r\nSet-Cookie: x=1',
    '',
    undefined,
    42,
  ])('falls back for %j', (value) => {
    expect(safeRedirectPath(value)).toBe('/dashboard');
  });
});

describe('safeHref', () => {
  it('allows http(s) and root-relative links only', () => {
    expect(safeHref('https://example.test/a')).toBe('https://example.test/a');
    expect(safeHref('/docs')).toBe('/docs');
    for (const bad of [
      'javascript:alert(1)',
      ' JAVASCRIPT:alert(1)',
      'data:text/html,x',
      '//evil.test',
      'vbscript:x',
      '',
    ]) {
      expect(safeHref(bad), bad).toBeUndefined();
    }
  });
});

describe('loginNotice', () => {
  it('maps known codes and ignores arbitrary text', () => {
    expect(loginNotice('session_expired', undefined)?.tone).toBe('info');
    expect(loginNotice(undefined, 'unavailable')?.tone).toBe('error');
    expect(loginNotice('<script>alert(1)</script>', '__proto__')).toBeUndefined();
  });
});
