import 'server-only';
import { createDemoIdentityAdapter } from '@edulynk/demo-identity-adapter';
import { getServerEnv, isDeployedEnvironment } from '@/server/env';
import { unconfiguredIdentityAdapter } from '@/server/auth/adapters/unconfigured';
import { IdentityError, type IdentityAdapter } from '@/server/auth/types';

let cached: IdentityAdapter | undefined;

/**
 * The only way to obtain an identity adapter. Two independent controls keep the demo adapter out of production: env
 * validation rejects AUTH_ADAPTER=demo in staging/production, and production builds alias the module to an inert stub
 * that throws (so even a misconfigured environment cannot activate it).
 */
export function getIdentityAdapter(): IdentityAdapter {
  if (cached) return cached;
  const env = getServerEnv();
  switch (env.AUTH_ADAPTER) {
    case 'unconfigured':
      cached = unconfiguredIdentityAdapter;
      break;
    case 'demo':
      if (isDeployedEnvironment(env.APP_ENV)) {
        throw new IdentityError('ADAPTER_EXCLUDED', 'The demo identity adapter is not permitted here.');
      }
      cached = createDemoIdentityAdapter();
      break;
  }
  return cached;
}

export function isDemoMode(): boolean {
  return getIdentityAdapter().id === 'demo';
}

export function resetIdentityAdapterForTests(): void {
  cached = undefined;
}
