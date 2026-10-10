import type { Services } from '@/services/types';

/** Resolved in place of src/demo/index.ts for production builds (see next.config.ts). Contains no mock data. */
export const DEMO_SERVICES_EXCLUDED_MARKER = 'edulynk-demo-services:excluded';

export function createDemoServices(): Services | null {
  return null;
}
