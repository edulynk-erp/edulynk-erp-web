import { NAVIGATION } from '@/config/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { requireSession, toClientPrincipal } from '@/server/auth/guards';
import { getBranding } from '@/server/branding';
import { getServerEnv } from '@/server/env';

const ENVIRONMENT_LABELS = { development: 'Development', test: 'Test', staging: 'Staging', production: null } as const;

export default async function PortalLayout({ children }: LayoutProps<'/'>) {
  const session = await requireSession();
  const principal = toClientPrincipal(session.principal);
  const branding = await getBranding();
  return (
    <AppShell
      groups={NAVIGATION}
      brandName={branding.displayName}
      displayName={principal.displayName}
      environmentLabel={ENVIRONMENT_LABELS[getServerEnv().APP_ENV]}
    >
      {children}
    </AppShell>
  );
}
