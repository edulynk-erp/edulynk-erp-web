import { navigationFor } from '@/config/navigation';
import { AppShell } from '@/components/layout/app-shell';
import type { DemoRoleOption } from '@/components/layout/role-switcher';
import { PortalProviders } from '@/components/providers/portal-providers';
import { hasGrant } from '@/lib/access/grants';
import { getIdentityAdapter, isDemoMode } from '@/server/auth/adapter';
import { requireSession, toClientPrincipal } from '@/server/auth/guards';
import { getBranding } from '@/server/branding';
import { getServerEnv } from '@/server/env';

const ENVIRONMENT_LABELS = { development: 'Development', test: 'Test', staging: 'Staging', production: null } as const;

async function demoRoles(): Promise<DemoRoleOption[] | null> {
  if (!isDemoMode()) return null;
  const step = await getIdentityAdapter().beginSignIn();
  if (step.kind !== 'demo-credentials') return null;
  return step.accounts.map(({ roleId, roleName, displayName }) => ({ roleId, roleName, displayName }));
}

export default async function PortalLayout({ children }: LayoutProps<'/'>) {
  const session = await requireSession();
  const principal = toClientPrincipal(session.principal);
  const [branding, roles] = await Promise.all([getBranding(), demoRoles()]);
  return (
    <PortalProviders principal={principal}>
      <AppShell
        groups={navigationFor(principal.grants)}
        brandName={branding.displayName}
        displayName={principal.displayName}
        roleName={principal.roleName}
        email={principal.email}
        environmentLabel={ENVIRONMENT_LABELS[getServerEnv().APP_ENV]}
        demo={roles ? { roles, currentRoleId: principal.roleId } : null}
        showHelp={hasGrant(principal.grants, 'help')}
      >
        {children}
      </AppShell>
    </PortalProviders>
  );
}
