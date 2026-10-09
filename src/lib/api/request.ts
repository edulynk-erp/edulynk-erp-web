import type { z } from 'zod';
import { ApiError } from '@/lib/api/api-error';
import { assertApiPath } from '@/lib/api/api-path';
import { parseErrorEnvelope } from '@/lib/api/error-envelope';
import { IDEMPOTENCY_KEY_HEADER, isValidIdempotencyKey } from '@/lib/api/idempotency';
import { buildQueryString, type QueryParams } from '@/lib/api/query';
import { REQUEST_ID_HEADER, resolveRequestId } from '@/lib/api/request-id';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions<T> {
  readonly method?: HttpMethod;
  /** Relative contract path, e.g. `/api/v1/…`. Build it with `apiPath` when it contains identifiers. */
  readonly path: string;
  readonly query?: QueryParams;
  readonly body?: unknown;
  /** Validates the success body. Without it the body is returned as `unknown`. */
  readonly schema?: z.ZodType<T>;
  /** Required by the contract for retry-safe POSTs; never sent on GET. */
  readonly idempotencyKey?: string;
  readonly requestId?: string;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}

export interface ApiResponse<T> {
  readonly data: T;
  readonly status: number;
  readonly requestId: string;
}

export interface Transport {
  /** Maps a validated contract path to the URL actually fetched. */
  readonly resolveUrl: (path: string) => string;
  readonly allowedPrefix: string;
  readonly defaultTimeoutMs: number;
  readonly headers?: () => Record<string, string>;
  readonly fetch?: typeof fetch;
}

/**
 * Single request primitive: JSON only, no retries, no caching, no redirects followed, request ID on every call,
 * timeout and caller abort combined. Every failure is an ApiError.
 */
export async function executeRequest<T>(transport: Transport, options: RequestOptions<T>): Promise<ApiResponse<T>> {
  const method = options.method ?? 'GET';
  const path = assertApiPath(options.path, transport.allowedPrefix);
  const url = transport.resolveUrl(path) + buildQueryString(options.query);
  const requestId = resolveRequestId(options.requestId);

  const headers: Record<string, string> = {
    ...transport.headers?.(),
    Accept: 'application/json',
    [REQUEST_ID_HEADER]: requestId,
  };
  if (options.idempotencyKey !== undefined) {
    if (method === 'GET') throw new TypeError('Idempotency keys are not sent on GET requests.');
    if (!isValidIdempotencyKey(options.idempotencyKey)) throw new TypeError('Invalid idempotency key format.');
    headers[IDEMPOTENCY_KEY_HEADER] = options.idempotencyKey;
  }
  let body: string | undefined;
  if (options.body !== undefined) {
    if (method === 'GET') throw new TypeError('GET requests cannot have a body.');
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), options.timeoutMs ?? transport.defaultTimeoutMs);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout.signal]) : timeout.signal;

  let response: Response;
  try {
    response = await (transport.fetch ?? fetch)(url, {
      method,
      headers,
      body,
      signal,
      cache: 'no-store',
      redirect: 'error',
      credentials: 'same-origin',
    });
  } catch (cause) {
    clearTimeout(timer);
    if (options.signal?.aborted) {
      throw new ApiError({ kind: 'aborted', message: 'Request aborted', requestId, cause });
    }
    if (timeout.signal.aborted) {
      throw new ApiError({ kind: 'timeout', message: 'Request timed out', requestId, cause });
    }
    throw new ApiError({ kind: 'network', message: 'Network request failed', requestId, cause });
  }

  try {
    const responseRequestId = response.headers.get(REQUEST_ID_HEADER) ?? requestId;
    const payload = await readJson(response);

    if (!response.ok) throw toHttpError(response, payload, responseRequestId);
    if (response.status === 204 || payload === undefined) {
      return { data: undefined as T, status: response.status, requestId: responseRequestId };
    }
    if (!options.schema) return { data: payload as T, status: response.status, requestId: responseRequestId };
    const parsed = options.schema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiError({
        kind: 'invalid_response',
        message: 'Response did not match the expected shape',
        status: response.status,
        requestId: responseRequestId,
      });
    }
    return { data: parsed.data, status: response.status, requestId: responseRequestId };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (options.signal?.aborted) throw new ApiError({ kind: 'aborted', message: 'Request aborted', requestId });
    if (timeout.signal.aborted) throw new ApiError({ kind: 'timeout', message: 'Request timed out', requestId });
    throw new ApiError({ kind: 'invalid_response', message: 'Response could not be read', requestId, cause: error });
  } finally {
    clearTimeout(timer);
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.trim() === '') return undefined;
  const contentType = response.headers.get('content-type') ?? '';
  if (!/\bjson\b/i.test(contentType)) {
    if (response.ok) throw new TypeError('Expected a JSON response');
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    if (response.ok) throw error;
    return undefined;
  }
}

function toHttpError(response: Response, payload: unknown, requestId: string): ApiError {
  const envelope = parseErrorEnvelope(payload);
  const retryAfter = parseRetryAfter(response.headers.get('retry-after'));
  return new ApiError({
    kind: 'http',
    status: response.status,
    code: envelope?.code,
    message: envelope?.message ?? (response.statusText || `HTTP ${response.status}`),
    details: envelope?.details,
    requestId: envelope?.requestId ?? requestId,
    ...(retryAfter === undefined ? {} : { retryAfterSeconds: retryAfter }),
  });
}

export function parseRetryAfter(value: string | null, now: number = Date.now()): number | undefined {
  if (!value) return undefined;
  if (/^\d+$/.test(value.trim())) return Number(value.trim());
  const date = Date.parse(value);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, Math.ceil((date - now) / 1000));
}
