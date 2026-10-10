import type { Metadata } from 'next';
import { AccessDenied } from '@/components/feedback/access-denied';
import { NotAvailableState } from '@/components/feedback/states';
import { PageHeader } from '@/components/layout/page-header';
import { UsersAccess } from '@/features/users/users-access';
import { isDemoMode } from '@/server/auth/adapter';
import { checkModuleAccess } from '@/server/auth/guards';

export const metadata: Metadata = { title: 'Users & Access' };

export default async function UsersPage({ searchParams }: PageProps<'/users'>) {
  const access = await checkModuleAccess('users');
  if (!access.allowed) {
    return (
      <>
        <PageHeader title="Users & Access" />
        <AccessDenied module="users" roleName={access.session.principal.roleName} />
      </>
    );
  }
  if (!isDemoMode()) {
    return (
      <>
        <PageHeader title="Users & Access" />
        <NotAvailableState
          title="User management is not connected yet"
          description="Users and roles appear here once the identity service is available."
        />
      </>
    );
  }
  const { tab } = await searchParams;
  return <UsersAccess initialTab={tab === 'roles' ? 'roles' : 'users'} />;
}
