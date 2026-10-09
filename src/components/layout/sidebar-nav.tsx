'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavGroup } from '@/config/navigation';
import { NavIcon } from '@/components/layout/nav-icon';
import { cn } from '@/lib/utils/cn';

export function SidebarNav({ groups, onNavigate }: { groups: readonly NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="space-y-5">
      {groups.map((group) => (
        <div key={group.id}>
          <h2 className="mb-1 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/70">
            <NavIcon icon={group.icon} className="size-3.5" />
            {group.label}
          </h2>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    prefetch={false}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'block rounded-md px-3 py-1.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active && 'bg-sidebar-accent font-medium text-white',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
