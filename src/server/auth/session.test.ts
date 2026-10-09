import { describe, expect, it } from 'vitest';
import {
  isAccessTokenExpired,
  MAX_SEALED_SESSION_BYTES,
  needsRefresh,
  sealSession,
  sessionFromTokens,
  SessionTooLargeError,
  unsealSession,
} from '@/server/auth/session';

const key = crypto.getRandomValues(new Uint8Array(32));
const otherKey = crypto.getRandomValues(new Uint8Array(32));
const payload = sessionFromTokens({
  accessToken: 'access',
  accessTokenExpiresAt: 2_000_000_000,
  refreshToken: 'refresh',
});

describe('session sealing', () => {
  it('round-trips an encrypted payload', async () => {
    const sealed = await sealSession(payload, key);
    expect(sealed.split('.')).toHaveLength(5);
    expect(sealed).not.toContain('access');
    expect(await unsealSession(sealed, key)).toEqual(payload);
  });

  it('keeps only the minimal fields', () => {
    expect(Object.keys(payload).sort()).toEqual(['at', 'atExp', 'rt', 'sid', 'v']);
    expect(Object.keys(sessionFromTokens({ accessToken: 'a', accessTokenExpiresAt: 1 })).sort()).toEqual([
      'at',
      'atExp',
      'sid',
      'v',
    ]);
  });

  it('rejects wrong keys, tampering and garbage', async () => {
    const sealed = await sealSession(payload, key);
    expect(await unsealSession(sealed, otherKey)).toBeNull();
    const parts = sealed.split('.');
    parts[3] = parts[3]!.replace(/^./, (c) => (c === 'A' ? 'B' : 'A'));
    expect(await unsealSession(parts.join('.'), key)).toBeNull();
    expect(await unsealSession('not-a-jwe', key)).toBeNull();
    expect(await unsealSession(undefined, key)).toBeNull();
  });

  it('refuses to produce cookies beyond the browser size budget', async () => {
    const huge = sessionFromTokens({ accessToken: 'x'.repeat(MAX_SEALED_SESSION_BYTES), accessTokenExpiresAt: 1 });
    await expect(sealSession(huge, key)).rejects.toBeInstanceOf(SessionTooLargeError);
  });

  it('computes expiry and refresh windows', () => {
    const p = { ...payload, atExp: 1000 };
    expect(needsRefresh(p, 60, 900)).toBe(false);
    expect(needsRefresh(p, 60, 940)).toBe(true);
    expect(isAccessTokenExpired(p, 999)).toBe(false);
    expect(isAccessTokenExpired(p, 1000)).toBe(true);
  });
});
