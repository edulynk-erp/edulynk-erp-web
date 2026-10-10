import 'server-only';
import { notFound } from 'next/navigation';
import { isDemoMode } from '@/server/auth/adapter';

/** Simulated onboarding screens exist only while the demo identity adapter is active; elsewhere they are 404. */
export function requireDemoMode(): void {
  if (!isDemoMode()) notFound();
}
