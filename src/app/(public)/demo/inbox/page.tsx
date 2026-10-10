import type { Metadata } from 'next';
import { InboxList } from '@/features/onboarding/inbox';
import { requireDemoMode } from '@/server/demo-mode';

export const metadata: Metadata = { title: 'Simulated inbox' };

export default function DemoInboxPage() {
  requireDemoMode();
  return (
    <main id="main-content" className="min-h-screen bg-background">
      <InboxList />
    </main>
  );
}
