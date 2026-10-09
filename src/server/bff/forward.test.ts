import { describe, expect, it, vi } from 'vitest';
import { forwardToTenantApi, type ForwardInput } from '@/server/bff/forward';

const ORIGIN = 'https://erp.example.test';
const IDEMPOTENCY_KEY = 'k'.repeat(20);

function input(
  overrides: Partial<ForwardInput> & { method?: string; url?: string; headers?: HeadersInit; body?: string },
) {
  const { method = 'GET', url = `${ORIGIN}/bff/items`, headers, body, ...rest } = overrides;
  const requestHeaders = new Headers({ host: 'erp.example.test', ...Object.fromEntries(new Headers(headers)) });
  return {
    request: new Request(url, { method, headers: requestHeaders, body }),
    segments: ['items'],
    accessToken: 'access-token',
    upstreamBaseUrl: 'https://tenant-api.test',
    timeoutMs: 1000,
    ...rest,
  } satisfies ForwardInput;
}

const okUpstream = () =>
  vi.fn<typeof fetch>(
    async () =>
      new Response('{"items":[]}', {
        status: 200,
        headers: { 'content-type': 'application/json', 'set-cookie': 'upstream=1', 'x-internal': 'secret' },
      }),
  );

async function envelope(response: Response) {
  return (await response.json()) as { code: string; statusCode: number; requestId: string };
}

describe('forwardToTenantApi', () => {
  it('forwards only to /api/v1/* with the bearer token, request ID and query, never a tenant header', async () => {
    const fetchImpl = okUpstream();
    const response = await forwardToTenantApi({
      ...input({
        url: `${ORIGIN}/bff/items/i1?page=2`,
        headers: { 'x-request-id': 'client-req-1', cookie: 'a=b', 'x-tenant-id': 'other-tenant' },
      }),
      segments: ['items', 'i1'],
      fetchImpl,
    });
    expect(response.status).toBe(200);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://tenant-api.test/api/v1/items/i1?page=2');
    expect(init).toMatchObject({ method: 'GET', redirect: 'manual' });
    expect(init!.headers).toEqual({
      Accept: 'application/json',
      Authorization: 'Bearer access-token',
      'X-Request-Id': 'client-req-1',
    });
  });

  it('strips upstream response headers outside the allowlist', async () => {
    const response = await forwardToTenantApi({ ...input({}), fetchImpl: okUpstream() });
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(response.headers.get('x-internal')).toBeNull();
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-type')).toBe('application/json');
  });

  it('returns 503 UPSTREAM_NOT_CONFIGURED without calling anything when unconfigured', async () => {
    const fetchImpl = okUpstream();
    const response = await forwardToTenantApi({ ...input({}), upstreamBaseUrl: undefined, fetchImpl });
    expect(response.status).toBe(503);
    expect((await envelope(response)).code).toBe('UPSTREAM_NOT_CONFIGURED');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns 401 without a session', async () => {
    const response = await forwardToTenantApi({ ...input({}), accessToken: null });
    expect(response.status).toBe(401);
    const body = await envelope(response);
    expect(body).toMatchObject({ code: 'UNAUTHENTICATED', statusCode: 401 });
    expect(body.requestId).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
  });

  it('refuses platform-administration paths even with a session', async () => {
    const fetchImpl = okUpstream();
    const response = await forwardToTenantApi({ ...input({}), segments: ['platform', 'tenants'], fetchImpl });
    expect(response.status).toBe(400);
    expect((await envelope(response)).code).toBe('INVALID_PATH');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    { segments: ['..'] },
    { segments: ['items', '..', 'admin'] },
    { segments: ['a/b'] },
    { segments: ['a%2Fb'] },
    { segments: ['a\\b'] },
    { segments: [] },
  ])('rejects unsafe path segments $segments', async ({ segments }) => {
    const fetchImpl = okUpstream();
    const response = await forwardToTenantApi({ ...input({}), segments, fetchImpl });
    expect(response.status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects cross-origin and origin-less state-changing requests', async () => {
    const crossOrigin = await forwardToTenantApi(
      input({
        method: 'POST',
        headers: { origin: 'https://evil.test', 'content-type': 'application/json' },
        body: '{}',
      }),
    );
    expect(crossOrigin.status).toBe(403);
    const noOrigin = await forwardToTenantApi(input({ method: 'DELETE' }));
    expect(noOrigin.status).toBe(403);
  });

  it('forwards JSON bodies and valid idempotency keys on same-origin POST', async () => {
    const fetchImpl = okUpstream();
    await forwardToTenantApi({
      ...input({
        method: 'POST',
        headers: { origin: ORIGIN, 'content-type': 'application/json', 'idempotency-key': IDEMPOTENCY_KEY },
        body: '{"name":"x"}',
      }),
      fetchImpl,
    });
    const init = fetchImpl.mock.calls[0]![1]!;
    expect(init.body).toBe('{"name":"x"}');
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      'Idempotency-Key': IDEMPOTENCY_KEY,
    });
  });

  it('rejects invalid idempotency keys, non-JSON bodies and unsupported methods', async () => {
    const post = (headers: Record<string, string>, body = '{}') =>
      forwardToTenantApi(input({ method: 'POST', headers: { origin: ORIGIN, ...headers }, body }));
    expect((await post({ 'content-type': 'application/json', 'idempotency-key': 'short' })).status).toBe(400);
    expect((await post({ 'content-type': 'text/plain' }, 'hello')).status).toBe(415);
    expect((await forwardToTenantApi(input({ method: 'OPTIONS' }))).status).toBe(405);
  });

  it('rejects oversized bodies', async () => {
    const response = await forwardToTenantApi(
      input({
        method: 'POST',
        headers: { origin: ORIGIN, 'content-type': 'application/json' },
        body: JSON.stringify({ blob: 'x'.repeat(1024 * 1024) }),
      }),
    );
    expect(response.status).toBe(413);
  });

  it('maps upstream failures to 502/504 envelopes and refuses redirects', async () => {
    const network = vi.fn<typeof fetch>(async () => {
      throw new TypeError('connect ECONNREFUSED 10.0.0.1:443');
    });
    const failed = await forwardToTenantApi({ ...input({}), fetchImpl: network });
    expect(failed.status).toBe(502);
    expect(JSON.stringify(await failed.json())).not.toContain('10.0.0.1');

    const hang: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal?.reason)));
    expect((await forwardToTenantApi({ ...input({}), timeoutMs: 10, fetchImpl: hang })).status).toBe(504);

    const redirect = vi.fn<typeof fetch>(
      async () => new Response(null, { status: 302, headers: { location: 'https://elsewhere.test' } }),
    );
    expect((await forwardToTenantApi({ ...input({}), fetchImpl: redirect })).status).toBe(502);
  });

  it('passes upstream errors through unchanged', async () => {
    const upstream = vi.fn<typeof fetch>(
      async () =>
        new Response('{"statusCode":404,"code":"NOT_FOUND"}', {
          status: 404,
          headers: { 'content-type': 'application/json' },
        }),
    );
    const response = await forwardToTenantApi({ ...input({}), fetchImpl: upstream });
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: 'NOT_FOUND' });
  });
});
