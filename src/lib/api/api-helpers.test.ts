import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/api-error';
import { apiPath, assertApiPath, assertTenantApiPath, toBffPath } from '@/lib/api/api-path';
import { categorise, describeApiError } from '@/lib/api/error-mapping';
import { createIdempotencyKey, isValidIdempotencyKey } from '@/lib/api/idempotency';
import { buildQueryString, formatSort, parseSort } from '@/lib/api/query';
import { createRequestId, isValidRequestId, resolveRequestId } from '@/lib/api/request-id';

describe('api paths', () => {
  it('accepts contract paths and rejects traversal, encoding tricks and queries', () => {
    expect(assertApiPath('/api/v1/students')).toBe('/api/v1/students');
    for (const bad of [
      '/api/v1/',
      '/api/v1//x',
      '/api/v1/./x',
      '/api/v1/a/../b',
      '/api/v1/a%2Fb',
      '/api/v1/a?b=1',
      '/api/v1/a#b',
      '/api/v1/a\\b',
      'api/v1/a',
    ]) {
      expect(() => assertApiPath(bad), bad).toThrow();
    }
  });

  it('percent-encodes identifiers and rejects dot identifiers', () => {
    expect(apiPath`/api/v1/items/${'a b/c'}`).toBe('/api/v1/items/a%20b%2Fc');
    expect(() => apiPath`/api/v1/items/${'..'}`).toThrow();
  });

  it('maps tenant paths to the BFF and refuses platform administration paths', () => {
    expect(toBffPath('/api/v1/a/b')).toBe('/bff/a/b');
    expect(assertTenantApiPath('/api/v1/platforms')).toBe('/api/v1/platforms');
    expect(() => toBffPath('/api/v1/platform/tenants')).toThrow(/platform administration/);
    expect(() => assertTenantApiPath('/api/v1/platform')).toThrow(/platform administration/);
    expect(() => toBffPath('/api/v2/a')).toThrow();
  });
});

describe('request IDs and idempotency keys', () => {
  it('generates contract-valid values', () => {
    expect(isValidRequestId(createRequestId())).toBe(true);
    expect(isValidIdempotencyKey(createIdempotencyKey())).toBe(true);
  });

  it('reuses only valid request IDs', () => {
    expect(resolveRequestId('abcDEF12_-')).toBe('abcDEF12_-');
    expect(resolveRequestId('bad id with spaces')).not.toBe('bad id with spaces');
    expect(resolveRequestId(null)).toMatch(/^[A-Za-z0-9]{32}$/);
    expect(isValidIdempotencyKey('x'.repeat(15))).toBe(false);
    expect(isValidIdempotencyKey('x'.repeat(129))).toBe(false);
  });
});

describe('query helpers', () => {
  it('builds query strings', () => {
    expect(buildQueryString({ a: 1, b: undefined, c: null, d: true })).toBe('?a=1&d=true');
    expect(buildQueryString({})).toBe('');
  });

  it('round-trips contract sort syntax and drops invalid fields', () => {
    expect(parseSort('name,-createdAt,bad-field,')).toEqual([
      { field: 'name', direction: 'asc' },
      { field: 'createdAt', direction: 'desc' },
    ]);
    expect(
      formatSort([
        { field: 'name', direction: 'asc' },
        { field: 'createdAt', direction: 'desc' },
      ]),
    ).toBe('name,-createdAt');
    expect(formatSort([])).toBeUndefined();
  });
});

describe('describeApiError', () => {
  const http = (status: number, message = 'server said') =>
    new ApiError({ kind: 'http', status, message, requestId: 'req-12345' });

  it.each([
    [400, 'validation'],
    [401, 'session_expired'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [409, 'conflict'],
    [422, 'validation'],
    [429, 'rate_limited'],
    [500, 'server'],
    [503, 'unavailable'],
  ] as const)('categorises %i as %s', (status, category) => {
    expect(categorise(http(status))).toBe(category);
  });

  it('categorises transport failures and unknown values', () => {
    expect(categorise(new ApiError({ kind: 'network', message: 'x' }))).toBe('network');
    expect(categorise(new ApiError({ kind: 'timeout', message: 'x' }))).toBe('timeout');
    expect(categorise(new Error('boom'))).toBe('unknown');
  });

  it('shows server copy only for validation and conflict, and never stacks', () => {
    expect(describeApiError(http(422, 'Name is required')).message).toBe('Name is required');
    expect(describeApiError(http(500, 'TypeError at foo.ts:12')).message).not.toContain('foo.ts');
    expect(describeApiError(http(401)).action).toBe('sign_in');
    expect(describeApiError(http(500)).requestId).toBe('req-12345');
    const unknown = describeApiError(new Error('secret internals'));
    expect(unknown.message).not.toContain('secret');
  });
});
