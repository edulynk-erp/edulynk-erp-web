import 'server-only';
import { z } from 'zod';

export const APP_ENVIRONMENTS = ['development', 'test', 'staging', 'production'] as const;
export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

const DEPLOYED_ENVIRONMENTS: readonly AppEnvironment[] = ['staging', 'production'];

const sessionKeySchema = z
  .string()
  .min(1, 'SESSION_ENCRYPTION_KEY is required')
  .refine((value) => decodeBase64(value)?.length === 32, {
    message: 'SESSION_ENCRYPTION_KEY must be base64 encoding exactly 32 random bytes',
  });

const baseSchema = z.object({
  APP_ENV: z.enum(APP_ENVIRONMENTS),
  /** Tenant-realm identity integration. Only `unconfigured` exists until the identity contract is approved. */
  AUTH_ADAPTER: z.enum(['unconfigured']).default('unconfigured'),
  SESSION_ENCRYPTION_KEY: sessionKeySchema,
  TENANT_API_BASE_URL: z
    .url({ protocol: /^https?$/ })
    .optional()
    .transform((value) => (value ? value.replace(/\/+$/, '') : undefined)),
  API_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(10000),
  SESSION_REFRESH_SKEW_SECONDS: z.coerce.number().int().min(0).max(600).default(60),
});

export const serverEnvSchema = baseSchema.superRefine((env, ctx) => {
  const deployed = DEPLOYED_ENVIRONMENTS.includes(env.APP_ENV);
  if (deployed && env.TENANT_API_BASE_URL && !env.TENANT_API_BASE_URL.startsWith('https://')) {
    ctx.addIssue({
      code: 'custom',
      path: ['TENANT_API_BASE_URL'],
      message: 'TENANT_API_BASE_URL must use https in staging and production',
    });
  }
  if (env.TENANT_API_BASE_URL) {
    const url = new URL(env.TENANT_API_BASE_URL);
    if (url.username || url.password || url.search || url.hash) {
      ctx.addIssue({
        code: 'custom',
        path: ['TENANT_API_BASE_URL'],
        message: 'TENANT_API_BASE_URL must not contain credentials, a query string or a fragment',
      });
    }
  }
});

export type ServerEnv = z.output<typeof serverEnvSchema>;

export class InvalidEnvironmentError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Invalid server environment:\n${issues.map((issue) => `  - ${issue}`).join('\n')}`);
    this.name = 'InvalidEnvironmentError';
  }
}

/** Parses environment variables. Issue messages name variables but never echo their values. */
export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse({
    APP_ENV: source.APP_ENV,
    AUTH_ADAPTER: emptyToUndefined(source.AUTH_ADAPTER),
    SESSION_ENCRYPTION_KEY: source.SESSION_ENCRYPTION_KEY,
    TENANT_API_BASE_URL: emptyToUndefined(source.TENANT_API_BASE_URL),
    API_TIMEOUT_MS: emptyToUndefined(source.API_TIMEOUT_MS),
    SESSION_REFRESH_SKEW_SECONDS: emptyToUndefined(source.SESSION_REFRESH_SKEW_SECONDS),
  });
  if (!result.success) {
    throw new InvalidEnvironmentError(
      result.error.issues.map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`),
    );
  }
  return result.data;
}

let cached: ServerEnv | undefined;

/** Lazily validated so `next build` does not need runtime secrets; `instrumentation.ts` forces it at startup. */
export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}

export function resetServerEnvForTests(): void {
  cached = undefined;
}

export function isDeployedEnvironment(env: AppEnvironment): boolean {
  return DEPLOYED_ENVIRONMENTS.includes(env);
}

function emptyToUndefined(value: string | undefined): string | undefined {
  return value === undefined || value.trim() === '' ? undefined : value;
}

function decodeBase64(value: string): Uint8Array | undefined {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return undefined;
  try {
    return Uint8Array.from(Buffer.from(value, 'base64'));
  } catch {
    return undefined;
  }
}

export function decodeSessionKey(value: string): Uint8Array {
  const key = decodeBase64(value);
  if (key?.length !== 32) throw new InvalidEnvironmentError(['SESSION_ENCRYPTION_KEY: invalid']);
  return key;
}
