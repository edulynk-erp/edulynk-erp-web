// Build-time aliases configured in next.config.ts (turbopack.resolveAlias) and vitest.config.mts. Each resolves to
// either the demo module or its inert `*.excluded.ts` stub; both satisfy these declarations.
declare module '@edulynk/demo-identity-adapter' {
  import type { CreateDemoIdentityAdapter } from '@/server/auth/types';

  export const createDemoIdentityAdapter: CreateDemoIdentityAdapter;
}

declare module '@edulynk/demo-services' {
  import type { Services } from '@/services/types';

  /** Returns null when mock services are not part of this build. */
  export function createDemoServices(): Services | null;
}
