import type { Metadata } from 'next';
import { InboxMessage } from '@/features/onboarding/inbox';
import { requireDemoMode } from '@/server/demo-mode';

export const metadata: Metadata = { title: 'Simulated email' };

export default async function DemoInboxMessagePage({ params }: PageProps<'/demo/inbox/[id]'>) {
  requireDemoMode();
  const { id } = await params;
  return (
    <main id="main-content" className="min-h-screen bg-background">
      <InboxMessage id={id} />
    </main>
  );
}
