/** Errors every service implementation (mock today, API client later) reports in the same shape. */
export type ServiceErrorCode = 'NOT_FOUND' | 'VALIDATION' | 'CONFLICT' | 'FORBIDDEN' | 'UNAVAILABLE';

export class ServiceError extends Error {
  constructor(
    readonly code: ServiceErrorCode,
    message: string,
    /** Field-level messages for VALIDATION. */
    readonly fieldErrors: Readonly<Record<string, string>> = {},
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export function isServiceError(error: unknown, code?: ServiceErrorCode): error is ServiceError {
  return error instanceof ServiceError && (code === undefined || error.code === code);
}
