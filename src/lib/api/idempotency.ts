/** `Idempotency-Key` format from the common/v1 contract. */
export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export function isValidIdempotencyKey(value: unknown): value is string {
  return typeof value === 'string' && IDEMPOTENCY_KEY_PATTERN.test(value);
}

/** Generate once per user intent (e.g. when a form mounts) and reuse it for retries of that same submission. */
export function createIdempotencyKey(): string {
  return crypto.randomUUID();
}
