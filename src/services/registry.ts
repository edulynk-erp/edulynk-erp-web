import { createDemoServices } from '@edulynk/demo-services';
import type { Services } from '@/services/types';

let instance: Services | null | undefined;

/**
 * The single place the UI obtains its data layer. Today it resolves to the mock implementation in demo builds and to
 * null otherwise (screens then show "not available"). When the institution API exists, return API-backed services here.
 * Browser only: mock data lives in the browser and must never be created during server rendering.
 */
export function getServices(): Services | null {
  if (typeof window === 'undefined') return null;
  instance ??= createDemoServices();
  return instance;
}

export function resetServicesForTests(): void {
  instance = undefined;
}
