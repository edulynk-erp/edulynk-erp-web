import 'server-only';
import { decodeSessionKey, getServerEnv } from '@/server/env';

let cached: Uint8Array | undefined;

export function getSessionKey(): Uint8Array {
  cached ??= decodeSessionKey(getServerEnv().SESSION_ENCRYPTION_KEY);
  return cached;
}
