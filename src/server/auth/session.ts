import 'server-only';
import { EncryptJWT, jwtDecrypt } from 'jose';
import { z } from 'zod';
import type { TokenSet } from '@/server/auth/types';

/**
 * Session cookie contents: a random session ID and the identity-service tokens, nothing else. Identity, roles and
 * grants are re-derived from the access token on each request, which keeps the cookie small and avoids stale grants.
 */
const sessionPayloadSchema = z.object({
  v: z.literal(1),
  sid: z.string().min(16),
  at: z.string().min(1),
  atExp: z.number().int().positive(),
  rt: z.string().min(1).optional(),
});

export type SessionPayload = z.infer<typeof sessionPayloadSchema>;

/** Browsers cap a cookie (name + value + attributes) around 4096 bytes; leave headroom for the attributes. */
export const MAX_SEALED_SESSION_BYTES = 3800;

export class SessionTooLargeError extends Error {
  constructor(size: number) {
    super(`Sealed session is ${size} bytes; the limit is ${MAX_SEALED_SESSION_BYTES}.`);
    this.name = 'SessionTooLargeError';
  }
}

export function sessionFromTokens(tokens: TokenSet, sid: string = crypto.randomUUID()): SessionPayload {
  return {
    v: 1,
    sid,
    at: tokens.accessToken,
    atExp: tokens.accessTokenExpiresAt,
    ...(tokens.refreshToken ? { rt: tokens.refreshToken } : {}),
  };
}

/** Encrypts (dir + A256GCM) so tokens are neither readable nor forgeable by the browser. */
export async function sealSession(payload: SessionPayload, key: Uint8Array): Promise<string> {
  const sealed = await new EncryptJWT({ ...payload })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .encrypt(key);
  const size = new TextEncoder().encode(sealed).length;
  if (size > MAX_SEALED_SESSION_BYTES) throw new SessionTooLargeError(size);
  return sealed;
}

/** Returns null for any malformed, tampered or wrongly keyed value. */
export async function unsealSession(value: string | undefined, key: Uint8Array): Promise<SessionPayload | null> {
  if (!value || value.length > MAX_SEALED_SESSION_BYTES) return null;
  try {
    const { payload } = await jwtDecrypt(value, key, {
      keyManagementAlgorithms: ['dir'],
      contentEncryptionAlgorithms: ['A256GCM'],
    });
    const parsed = sessionPayloadSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function needsRefresh(payload: SessionPayload, skewSeconds: number, now: number = nowSeconds()): boolean {
  return payload.atExp - skewSeconds <= now;
}

export function isAccessTokenExpired(payload: SessionPayload, now: number = nowSeconds()): boolean {
  return payload.atExp <= now;
}
