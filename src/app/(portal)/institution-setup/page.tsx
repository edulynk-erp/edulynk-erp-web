import type { Metadata } from 'next';
import { AccessDenied } from '@/components/feedback/access-denied';
import { NotAvailableState } from '@/components/feedback/states';
import { PageHeader } from '@/components/layout/page-header';
import { PERMISSION_ACTIONS } from '@/config/modules';
import { InstitutionSetup } from '@/features/institution/institution-setup';
import { parseSetupLocation, type SetupPermissions } from '@/features/institution/setup-config';
import { hasGrant } from '@/lib/access/grants';
import { isDemoMode } from '@/server/auth/adapter';
import { checkModuleAccess } from '@/server/auth/guards';

export const metadata: Metadata = { title: 'Institution Setup' };

export default async function InstitutionSetupPage({ searchParams }: PageProps<'/institution-setup'>) {
  const access = await checkModuleAccess('institution');
  if (!access.allowed) {
    return (
      <>
        <PageHeader title="Institution Setup" />
        <AccessDenied module="institution" roleName={access.session.principal.roleName} />
      </>
    );
  }
  if (!isDemoMode()) {
    return (
      <>
        <PageHeader title="Institution Setup" />
        <NotAvailableState
          title="Institution Setup is not connected yet"
          description="Institution settings appear here once the institution API is available."
        />
      </>
    );
  }

  const { principal } = access.session;
  const permissions: SetupPermissions = {
    ...(Object.fromEntries(
      PERMISSION_ACTIONS.map((action) => [action, hasGrant(principal.grants, 'institution', action)]),
    ) as Record<(typeof PERMISSION_ACTIONS)[number], boolean>),
    brandingEdit: hasGrant(principal.grants, 'branding', 'edit'),
    institutionWide: principal.campusScope === 'all',
    campusIds: principal.campusScope === 'all' ? [] : [...principal.campusScope],
  };
  const { tab, section } = await searchParams;
  const location = parseSetupLocation(tab, section);
  return (
    <InstitutionSetup
      initialTab={location.tab}
      initialSection={location.section}
      permissions={permissions}
      roleId={principal.roleId}
      roleName={principal.roleName}
    />
  );
}
