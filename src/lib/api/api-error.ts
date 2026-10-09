import type { FieldError } from '@/lib/api/error-envelope';

export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'aborted' | 'invalid_response';

interface ApiErrorInit {
  kind: ApiErrorKind;
  message: string;
  status?: number;
  code?: string;
  details?: string | readonly FieldError[];
  requestId?: string;
  retryAfterSeconds?: number;
  cause?: unknown;
}

/**
 * The only error type the API client throws. `message` is the server-supplied or generic description; UI code should
 * present `describeApiError(error)` instead, which never surfaces stack traces or raw upstream bodies.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | undefined;
  readonly code: string | undefined;
  readonly details: string | readonly FieldError[] | undefined;
  readonly requestId: string | undefined;
  readonly retryAfterSeconds: number | undefined;

  constructor(init: ApiErrorInit) {
    super(init.message, init.cause === undefined ? undefined : { cause: init.cause });
    this.name = 'ApiError';
    this.kind = init.kind;
    this.status = init.status;
    this.code = init.code;
    this.details = init.details;
    this.requestId = init.requestId;
    this.retryAfterSeconds = init.retryAfterSeconds;
  }

  get fieldErrors(): readonly FieldError[] {
    return Array.isArray(this.details) ? this.details : [];
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}
