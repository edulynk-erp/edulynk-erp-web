import { describe, expect, it } from 'vitest';
import { InvalidEnvironmentError, parseServerEnv } from '@/server/env';

const KEY = Buffer.alloc(32, 7).toString('base64');
const base = { APP_ENV: 'development', SESSION_ENCRYPTION_KEY: KEY };

describe('parseServerEnv', () => {
  it('applies safe defaults', () => {
    const env = parseServerEnv(base);
    expect(env.AUTH_ADAPTER).toBe('unconfigured');
    expect(env.TENANT_API_BASE_URL).toBeUndefined();
    expect(env.API_TIMEOUT_MS).toBe(10000);
    expect(env.SESSION_REFRESH_SKEW_SECONDS).toBe(60);
  });

  it('requires APP_ENV and a 32-byte base64 session key', () => {
    expect(() => parseServerEnv({ SESSION_ENCRYPTION_KEY: KEY })).toThrow(InvalidEnvironmentError);
    expect(() => parseServerEnv({ APP_ENV: 'development' })).toThrow(/SESSION_ENCRYPTION_KEY/);
    expect(() => parseServerEnv({ ...base, SESSION_ENCRYPTION_KEY: Buffer.alloc(16).toString('base64') })).toThrow(
      /32 random bytes/,
    );
    expect(() => parseServerEnv({ ...base, SESSION_ENCRYPTION_KEY: 'not base64!' })).toThrow();
  });

  it.each(['development', 'platform'])('rejects identity adapters that do not exist (%s)', (adapter) => {
    expect(() => parseServerEnv({ ...base, AUTH_ADAPTER: adapter })).toThrow(/AUTH_ADAPTER/);
  });

  it('accepts the demo adapter only outside staging and production', () => {
    expect(parseServerEnv({ ...base, AUTH_ADAPTER: 'demo' }).AUTH_ADAPTER).toBe('demo');
    expect(parseServerEnv({ ...base, APP_ENV: 'test', AUTH_ADAPTER: 'demo' }).AUTH_ADAPTER).toBe('demo');
    for (const APP_ENV of ['staging', 'production']) {
      expect(() =>
        parseServerEnv({ ...base, APP_ENV, AUTH_ADAPTER: 'demo', TENANT_API_BASE_URL: 'https://api.example.test' }),
      ).toThrow(/AUTH_ADAPTER=demo is not permitted/);
    }
  });

  it('requires https upstream in deployed environments and strips trailing slashes', () => {
    expect(() =>
      parseServerEnv({ ...base, APP_ENV: 'production', TENANT_API_BASE_URL: 'http://api.internal' }),
    ).toThrow(/https/);
    expect(
      parseServerEnv({ ...base, APP_ENV: 'production', TENANT_API_BASE_URL: 'https://api.example.test/' })
        .TENANT_API_BASE_URL,
    ).toBe('https://api.example.test');
  });

  it('rejects upstream URLs with credentials, query or non-http schemes', () => {
    expect(() => parseServerEnv({ ...base, TENANT_API_BASE_URL: 'https://u:p@api.example.test' })).toThrow();
    expect(() => parseServerEnv({ ...base, TENANT_API_BASE_URL: 'https://api.example.test?x=1' })).toThrow();
    expect(() => parseServerEnv({ ...base, TENANT_API_BASE_URL: 'ftp://api.example.test' })).toThrow();
  });

  it('never echoes secret values in error messages', () => {
    const secret = Buffer.from('a value of the wrong length').toString('base64');
    try {
      parseServerEnv({ APP_ENV: 'development', SESSION_ENCRYPTION_KEY: secret });
      expect.unreachable();
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });
});
