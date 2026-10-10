import Link from 'next/link';
import type { ReactNode } from 'react';
import type { NavGroup } from '@/config/navigation';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { MobileNav } from '@/components/layout/mobile-nav';
import { NotificationsMenu } from '@/components/layout/notifications-menu';
import { RoleSwitcher, type DemoRoleOption } from '@/components/layout/role-switcher';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { UserMenu } from '@/components/layout/user-menu';
import { WorkspaceSelectors } from '@/components/layout/workspace-selectors';
import { Badge } from '@/components/ui/badge';

interface AppShellProps {
  groups: readonly NavGroup[];
  brandName: string;
  displayName: string;
  roleName?: string;
  email?: string;
  environmentLabel: string | null;
  /** Present only when the demo identity adapter is active. */
  demo?: { roles: readonly DemoRoleOption[]; currentRoleId: string } | null;
  showHelp?: boolean;
  children: ReactNode;
}

export function AppShell({
  groups,
  brandName,
  displayName,
  roleName,
  email,
  environmentLabel,
  demo = null,
  showHelp = false,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-card px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to main content
      </a>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white"
          >
            {brandName.slice(0, 1).toUpperCase()}
          </span>
          <Link href="/dashboard" prefetch={false} className="truncate text-sm font-semibold text-white">
            {brandName}
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav groups={groups} />
        </div>
        {demo ? (
          <p className="border-t border-sidebar-border px-5 py-3 text-xs text-sidebar-foreground/80">
            Demo mode: simulated data and sign-in. Nothing here is a real account or record.
          </p>
        ) : null}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card px-4 md:px-6">
          <MobileNav groups={groups} />
          <Breadcrumbs />
          <div className="ml-auto flex items-center gap-2">
            {demo ? <WorkspaceSelectors /> : null}
            {environmentLabel ? <Badge variant="warning">{environmentLabel}</Badge> : null}
            {demo ? <RoleSwitcher roles={demo.roles} currentRoleId={demo.currentRoleId} /> : null}
            {demo ? <NotificationsMenu /> : null}
            <UserMenu
              displayName={displayName}
              {...(roleName ? { roleName } : {})}
              {...(email ? { email } : {})}
              showInbox={Boolean(demo)}
              showHelp={showHelp}
            />
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="flex-1 space-y-6 p-4 focus:outline-none md:p-6 xl:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
