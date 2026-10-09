import 'server-only';
import { getIdentityAdapter } from '@/server/auth/adapter';
import { getSessionKey } from '@/server/auth/session-key';
import { getServerEnv } from '@/server/env';

export function assertStartupConfiguration(): void {
  const env = getServerEnv();
  getSessionKey();
  const adapter = getIdentityAdapter();
  console.info(
    JSON.stringify({
      level: 'info',
      msg: 'erp-web configuration valid',
      appEnv: env.APP_ENV,
      adapter: adapter.id,
    }),
  );
}

/** Node.js runtime only (called from instrumentation.ts). Error messages name variables but never contain values. */
export function assertStartupConfigurationOrExit(): void {
  try {
    assertStartupConfiguration();
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'fatal',
        msg: 'erp-web startup configuration invalid',
        error: error instanceof Error ? error.message : 'unknown error',
      }),
    );
    process.exit(1);
  }
}
