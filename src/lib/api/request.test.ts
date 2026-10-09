import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError } from '@/lib/api/api-error';
import { bffRequest } from '@/lib/api/bff-client';
import { executeRequest, parseRetryAfter, type Transport } from '@/lib/api/request';

const IDEMPOTENCY_KEY = 'k'.repeat(20);

function transport(fetchImpl: typeof fetch, overrides: Partial<Transport> = {}): Transport {
  return {
    allowedPrefix: '/api/v1/',
    resolveUrl: (path) => `https://upstream.test${path}`,
    defaultTimeoutMs: 1000,
    fetch: fetchImpl,
    ...overrides,
  };
}

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { ...init, headers: { 'content-type': 'application/json', ...init.headers } });

const envelope = (statusCode: number, code: string, extra: Record<string, unknown> = {}) => ({
  statusCode,
  error: 'Error',
  code,
  message: `message for ${code}`,
  requestId: 'upstream-request-1',
  path: '/api/v1/x',
  timestamp: '2026-01-01T00:00:00.000Z',
  ...extra,
});

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('expected failure');
}

describe('executeRequest', () => {
  it('sends JSON with a request ID, query string and no caching or redirects', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => json({ id: 'a' }));
    const result = await executeRequest(transport(fetchImpl), {
      path: '/api/v1/tenants/current',
      query: { page: 2, q: 'abc', skip: undefined, tags: ['x', 'y'] },
      schema: z.object({ id: z.string() }),
    });
    expect(result.data).toEqual({ id: 'a' });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://upstream.test/api/v1/tenants/current?page=2&q=abc&tags=x&tags=y');
    expect(init).toMatchObject({ method: 'GET', cache: 'no-store', redirect: 'error' });
    const headers = init!.headers as Record<string, string>;
    expect(headers['X-Request-Id']).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
    expect(headers.Accept).toBe('application/json');
  });

  it('sends a body and a valid idempotency key on POST', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }));
    await executeRequest(transport(fetchImpl), {
      method: 'POST',
      path: '/api/v1/provisioning-requests',
      body: { a: 1 },
      idempotencyKey: IDEMPOTENCY_KEY,
    });
    const init = fetchImpl.mock.calls[0]![1]!;
    expect(init.body).toBe('{"a":1}');
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      'Idempotency-Key': IDEMPOTENCY_KEY,
    });
  });

  it('rejects invalid idempotency keys, GET bodies and unsafe paths before fetching', async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const t = transport(fetchImpl);
    await expect(executeRequest(t, { method: 'POST', path: '/api/v1/x', idempotencyKey: 'short' })).rejects.toThrow(
      TypeError,
    );
    await expect(executeRequest(t, { path: '/api/v1/x', idempotencyKey: IDEMPOTENCY_KEY })).rejects.toThrow(TypeError);
    await expect(executeRequest(t, { path: '/api/v1/x', body: {} })).rejects.toThrow(TypeError);
    for (const path of ['https://evil.test/api/v1/x', '//evil.test/api/v1/x', '/api/v1/../admin', '/api/v2/x']) {
      await expect(executeRequest(t, { path })).rejects.toThrow(/Unsafe API path/);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([400, 401, 403, 404, 409, 422, 429, 500])(
    'maps HTTP %i to an http ApiError from the envelope',
    async (status) => {
      const fetchImpl = vi.fn<typeof fetch>(async () =>
        json(envelope(status, `CODE_${status}`), { status, headers: status === 429 ? { 'retry-after': '30' } : {} }),
      );
      const error = await failure(executeRequest(transport(fetchImpl), { path: '/api/v1/x' }));
      expect(error).toMatchObject({ kind: 'http', status, code: `CODE_${status}`, requestId: 'upstream-request-1' });
      if (status === 429) expect(error.retryAfterSeconds).toBe(30);
    },
  );

  it('exposes field errors from 422 details', async () => {
    const details = [{ field: 'name', code: 'REQUIRED', message: 'Name is required' }];
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      json(envelope(422, 'VALIDATION_FAILED', { details }), { status: 422 }),
    );
    const error = await failure(executeRequest(transport(fetchImpl), { path: '/api/v1/x' }));
    expect(error.fieldErrors).toEqual(details);
  });

  it('handles non-JSON error bodies without leaking them', async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      async () => new Response('<html>stack trace at line 1</html>', { status: 502, statusText: 'Bad Gateway' }),
    );
    const error = await failure(executeRequest(transport(fetchImpl), { path: '/api/v1/x' }));
    expect(error).toMatchObject({ kind: 'http', status: 502, code: undefined });
    expect(error.message).not.toContain('stack');
  });

  it('classifies network failures', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new TypeError('fetch failed');
    });
    expect((await failure(executeRequest(transport(fetchImpl), { path: '/api/v1/x' }))).kind).toBe('network');
  });

  it('classifies timeouts and caller aborts', async () => {
    const hang: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal?.reason)));
    expect((await failure(executeRequest(transport(hang), { path: '/api/v1/x', timeoutMs: 10 }))).kind).toBe('timeout');

    const controller = new AbortController();
    const pending = executeRequest(transport(hang), { path: '/api/v1/x', signal: controller.signal });
    controller.abort();
    expect((await failure(pending)).kind).toBe('aborted');
  });

  it('rejects success bodies that do not match the schema or are not JSON', async () => {
    const wrongShape = vi.fn<typeof fetch>(async () => json({ id: 1 }));
    expect(
      (
        await failure(
          executeRequest(transport(wrongShape), { path: '/api/v1/x', schema: z.object({ id: z.string() }) }),
        )
      ).kind,
    ).toBe('invalid_response');
    const html = vi.fn<typeof fetch>(
      async () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } }),
    );
    expect((await failure(executeRequest(transport(html), { path: '/api/v1/x' }))).kind).toBe('invalid_response');
  });
});

describe('bffRequest', () => {
  it('only accepts tenant paths and calls the same-origin BFF', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ ok: true }));
    await bffRequest({ path: '/api/v1/items' });
    expect(fetchSpy.mock.calls[0]![0]).toBe('/bff/items');
    await expect(bffRequest({ path: '/api/v1/platform/tenants' })).rejects.toThrow(/Unsafe API path/);
  });
});

describe('parseRetryAfter', () => {
  it('parses seconds and HTTP dates', () => {
    expect(parseRetryAfter('120')).toBe(120);
    expect(parseRetryAfter(new Date(10_000).toUTCString(), 0)).toBe(10);
    expect(parseRetryAfter('soon')).toBeUndefined();
    expect(parseRetryAfter(null)).toBeUndefined();
  });
});
