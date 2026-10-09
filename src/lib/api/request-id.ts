/** `X-Request-Id` format from the common/v1 contract. */
export const REQUEST_ID_HEADER = 'X-Request-Id';
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export function isValidRequestId(value: unknown): value is string {
  return typeof value === 'string' && REQUEST_ID_PATTERN.test(value);
}

export function createRequestId(): string {
  return crypto.randomUUID().replaceAll('-', '');
}

/** Reuses a caller-supplied ID only when it matches the contract; otherwise mints a fresh one. */
export function resolveRequestId(candidate: string | null | undefined): string {
  return isValidRequestId(candidate) ? candidate : createRequestId();
}
