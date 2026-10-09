import Link from 'next/link';
import type { ReactNode } from 'react';
import type { NavGroup } from '@/config/navigation';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { MobileNav } from '@/components/layout/mobile-nav';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { UserMenu } from '@/components/layout/user-menu';
import { Badge } from '@/components/ui/badge';

interface AppShellProps {
  groups: readonly NavGroup[];
  brandName: string;
  displayName: string;
  environmentLabel: string | null;
  children: ReactNode;
}

export function AppShell({ groups, brandName, displayName, environmentLabel, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-card px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to main content
      </a>
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-14 items-center px-5">
          <Link href="/dashboard" prefetch={false} className="truncate text-sm font-semibold text-white">
            {brandName}
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-6">
          <SidebarNav groups={groups} />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card px-4">
          <MobileNav groups={groups} />
          <Breadcrumbs />
          <div className="ml-auto flex items-center gap-2">
            {environmentLabel ? <Badge variant="warning">{environmentLabel}</Badge> : null}
            <UserMenu displayName={displayName} />
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="flex-1 space-y-6 p-4 focus:outline-none md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
