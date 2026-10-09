'use client';

import { ChevronRight } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { findNavItem } from '@/config/navigation';

export function Breadcrumbs() {
  const match = findNavItem(usePathname());
  if (!match) return null;
  const crumbs = match.group.id === 'overview' ? [match.item.label] : [match.group.label, match.item.label];
  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 sm:block">
      <ol className="flex items-center gap-1 text-sm text-muted-foreground">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={crumb} className="flex items-center gap-1">
              {index > 0 ? <ChevronRight className="size-3.5" aria-hidden="true" /> : null}
              <span
                className={last ? 'font-medium text-foreground' : undefined}
                aria-current={last ? 'page' : undefined}
              >
                {crumb}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
