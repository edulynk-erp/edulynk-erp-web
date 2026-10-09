import type { Metadata } from 'next';
import { NotAvailableState } from '@/components/feedback/states';
import { PageHeader } from '@/components/layout/page-header';
import { requireSession } from '@/server/auth/guards';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const session = await requireSession();
  return (
    <>
      <PageHeader title="Dashboard" description={`Welcome, ${session.principal.displayName}.`} />
      <NotAvailableState
        title="No modules are connected yet"
        description="Institution modules appear here once their APIs are available."
      />
    </>
  );
}
