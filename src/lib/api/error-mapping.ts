import { ApiError } from '@/lib/api/api-error';

export type ErrorCategory =
  | 'validation'
  | 'session_expired'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'unavailable'
  | 'server'
  | 'network'
  | 'timeout'
  | 'aborted'
  | 'unknown';

export type RecoveryAction = 'retry' | 'sign_in' | 'fix_input' | 'refresh' | 'none';

export interface UserFacingError {
  readonly category: ErrorCategory;
  readonly title: string;
  readonly message: string;
  readonly action: RecoveryAction;
  readonly requestId?: string;
  readonly retryAfterSeconds?: number;
}

export function categorise(error: unknown): ErrorCategory {
  if (!(error instanceof ApiError)) return 'unknown';
  switch (error.kind) {
    case 'network':
      return 'network';
    case 'timeout':
      return 'timeout';
    case 'aborted':
      return 'aborted';
    case 'invalid_response':
      return 'server';
    case 'http':
      break;
  }
  switch (error.status) {
    case 400:
    case 422:
      return 'validation';
    case 401:
      return 'session_expired';
    case 403:
      return 'forbidden';
    case 404:
      return 'not_found';
    case 409:
      return 'conflict';
    case 429:
      return 'rate_limited';
    case 502:
    case 503:
    case 504:
      return 'unavailable';
    default:
      return error.status !== undefined && error.status >= 500 ? 'server' : 'unknown';
  }
}

const COPY: Record<ErrorCategory, { title: string; message: string; action: RecoveryAction }> = {
  validation: { title: 'Check your input', message: 'Some values were not accepted.', action: 'fix_input' },
  session_expired: {
    title: 'Session expired',
    message: 'Your session has ended. Sign in again to continue.',
    action: 'sign_in',
  },
  forbidden: { title: 'Not permitted', message: 'You do not have permission to do this.', action: 'none' },
  not_found: { title: 'Not found', message: 'The requested item could not be found.', action: 'none' },
  conflict: {
    title: 'Changed elsewhere',
    message: 'This item was changed by someone else. Refresh and try again.',
    action: 'refresh',
  },
  rate_limited: { title: 'Too many requests', message: 'Please wait a moment and try again.', action: 'retry' },
  unavailable: {
    title: 'Service unavailable',
    message: 'The service is not available right now.',
    action: 'retry',
  },
  server: { title: 'Something went wrong', message: 'The server could not complete the request.', action: 'retry' },
  network: { title: 'Connection problem', message: 'Check your connection and try again.', action: 'retry' },
  timeout: { title: 'Request timed out', message: 'The request took too long. Try again.', action: 'retry' },
  aborted: { title: 'Request cancelled', message: 'The request was cancelled.', action: 'none' },
  unknown: { title: 'Something went wrong', message: 'An unexpected error occurred.', action: 'retry' },
};

/**
 * Maps any thrown value to copy that is safe to render. Server messages are only shown for validation and conflict
 * errors, where the contract guarantees they are written for users; stacks and raw bodies are never exposed.
 */
export function describeApiError(error: unknown): UserFacingError {
  const category = categorise(error);
  const copy = COPY[category];
  if (!(error instanceof ApiError)) return { category, ...copy };
  const serverMessage =
    (category === 'validation' || category === 'conflict') && error.message.trim() !== '' ? error.message : undefined;
  return {
    category,
    title: copy.title,
    message: serverMessage ?? copy.message,
    action: copy.action,
    ...(error.requestId ? { requestId: error.requestId } : {}),
    ...(error.retryAfterSeconds === undefined ? {} : { retryAfterSeconds: error.retryAfterSeconds }),
  };
}
