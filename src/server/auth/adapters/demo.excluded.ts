import 'server-only';
import { IdentityError, type CreateDemoIdentityAdapter } from '@/server/auth/types';

/** Resolved in place of `demo.ts` for production builds (see next.config.ts). Contains no fixtures. */
export const DEMO_ADAPTER_EXCLUDED_MARKER = 'edulynk-demo-identity-adapter:excluded';

export const createDemoIdentityAdapter: CreateDemoIdentityAdapter = () => {
  throw new IdentityError(
    'ADAPTER_EXCLUDED',
    `The demo identity adapter is not included in this build (${DEMO_ADAPTER_EXCLUDED_MARKER}).`,
  );
};
