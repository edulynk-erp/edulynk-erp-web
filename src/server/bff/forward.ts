import 'server-only';
import { API_PREFIX } from '@/lib/api/api-path';
import { buildErrorEnvelope } from '@/lib/api/error-envelope';
import { IDEMPOTENCY_KEY_HEADER, isValidIdempotencyKey } from '@/lib/api/idempotency';
import { REQUEST_ID_HEADER, resolveRequestId } from '@/lib/api/request-id';
import { UPSTREAM_NOT_CONFIGURED } from '@/server/api/http-client';
import { isSameOriginRequest } from '@/server/http/same-origin';

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH']);
const SEGMENT_PATTERN = /^[A-Za-z0-9._~-]+$/;
const MAX_BODY_BYTES = 1024 * 1024;
const MAX_QUERY_LENGTH = 2048;
const FORWARDED_RESPONSE_HEADERS = ['content-type', 'retry-after', REQUEST_ID_HEADER.toLowerCase()];

export interface ForwardInput {
  readonly request: Request;
  readonly segments: readonly string[];
  /** Access token from the session cookie, or null when there is no valid session. */
  readonly accessToken: string | null;
  readonly upstreamBaseUrl: string | undefined;
  readonly timeoutMs: number;
  readonly fetchImpl?: typeof fetch;
}

/**
 * Backend-for-frontend proxy. Forwards only to `${TENANT_API_BASE_URL}/api/v1/<segments>`, attaching the session's
 * bearer token server-side. Platform-administration paths (`platform/...`) are refused. The tenant is never taken from
 * the browser: no tenant header or parameter is added, and the upstream derives it from the verified token. Never
 * follows redirects, never forwards cookies or arbitrary headers, and returns contract error envelopes for every
 * failure it produces itself.
 */
export async function forwardToTenantApi(input: ForwardInput): Promise<Response> {
  const { request } = input;
  const url = new URL(request.url);
  const requestId = resolveRequestId(request.headers.get(REQUEST_ID_HEADER));
  const fail = (statusCode: number, code: string, message: string, extraHeaders?: Record<string, string>) =>
    errorResponse(statusCode, code, message, requestId, url.pathname, extraHeaders);

  const method = request.method.toUpperCase();
  if (!ALLOWED_METHODS.has(method)) return fail(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
  if (method !== 'GET' && !isSameOriginRequest(request.headers)) {
    return fail(403, 'CROSS_ORIGIN_REJECTED', 'Cross-origin requests are not allowed.');
  }
  if (input.segments.length === 0 || !input.segments.every((segment) => isSafeSegment(segment))) {
    return fail(400, 'INVALID_PATH', 'The request path is not allowed.');
  }
  if (input.segments[0] === 'platform') return fail(400, 'INVALID_PATH', 'The request path is not allowed.');
  if (url.search.length > MAX_QUERY_LENGTH) return fail(414, 'QUERY_TOO_LONG', 'The query string is too long.');

  const idempotencyKey = request.headers.get(IDEMPOTENCY_KEY_HEADER);
  if (idempotencyKey !== null && (method === 'GET' || !isValidIdempotencyKey(idempotencyKey))) {
    return fail(400, 'INVALID_IDEMPOTENCY_KEY', 'The Idempotency-Key header is invalid.');
  }

  if (!input.accessToken) return fail(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  if (!input.upstreamBaseUrl) {
    return fail(503, UPSTREAM_NOT_CONFIGURED, 'The institution API is not configured for this environment.');
  }

  let body: string | undefined;
  if (BODY_METHODS.has(method)) {
    const contentType = request.headers.get('content-type') ?? '';
    const declaredLength = Number(request.headers.get('content-length') ?? '0');
    if (declaredLength > MAX_BODY_BYTES) return fail(413, 'PAYLOAD_TOO_LARGE', 'The request body is too large.');
    const text = await request.text();
    if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
      return fail(413, 'PAYLOAD_TOO_LARGE', 'The request body is too large.');
    }
    if (text !== '') {
      if (!/^application\/json\b/i.test(contentType)) {
        return fail(415, 'UNSUPPORTED_MEDIA_TYPE', 'Only application/json bodies are accepted.');
      }
      body = text;
    }
  }

  const upstreamUrl = `${input.upstreamBaseUrl}${API_PREFIX}${input.segments.join('/')}${url.search}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${input.accessToken}`,
    [REQUEST_ID_HEADER]: requestId,
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (idempotencyKey !== null) headers[IDEMPOTENCY_KEY_HEADER] = idempotencyKey;

  const timeout = AbortSignal.timeout(input.timeoutMs);
  let upstream: Response;
  try {
    upstream = await (input.fetchImpl ?? fetch)(upstreamUrl, {
      method,
      headers,
      body,
      signal: timeout,
      redirect: 'manual',
      cache: 'no-store',
    });
  } catch {
    return timeout.aborted
      ? fail(504, 'UPSTREAM_TIMEOUT', 'The institution API did not respond in time.')
      : fail(502, 'UPSTREAM_UNAVAILABLE', 'The institution API could not be reached.');
  }

  if (upstream.status >= 300 && upstream.status < 400) {
    return fail(502, 'UPSTREAM_REDIRECT', 'The institution API returned an unexpected redirect.');
  }

  const responseHeaders = new Headers({ 'Cache-Control': 'no-store', [REQUEST_ID_HEADER]: requestId });
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value !== null) responseHeaders.set(name, value);
  }
  const responseBody = upstream.status === 204 || method === 'HEAD' ? null : await upstream.arrayBuffer();
  return new Response(responseBody, { status: upstream.status, headers: responseHeaders });
}

export function isSafeSegment(segment: string): boolean {
  return segment !== '.' && segment !== '..' && SEGMENT_PATTERN.test(segment);
}

function errorResponse(
  statusCode: number,
  code: string,
  message: string,
  requestId: string,
  path: string,
  extraHeaders?: Record<string, string>,
): Response {
  return Response.json(buildErrorEnvelope({ statusCode, code, message, requestId, path }), {
    status: statusCode,
    headers: { 'Cache-Control': 'no-store', [REQUEST_ID_HEADER]: requestId, ...extraHeaders },
  });
}
