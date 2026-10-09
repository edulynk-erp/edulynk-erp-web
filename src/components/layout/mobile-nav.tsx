'use client';

import { Menu, X } from 'lucide-react';
import { useId, useState } from 'react';
import type { NavGroup } from '@/config/navigation';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { Button } from '@/components/ui/button';

/** Disclosure (not a modal dialog) so no scroll-lock style injection is needed under the strict CSP. */
export function MobileNav({ groups }: { groups: readonly NavGroup[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div className="lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X /> : <Menu />}
      </Button>
      {open ? (
        <div id={panelId} className="fixed inset-x-0 top-14 bottom-0 z-40 overflow-y-auto bg-sidebar p-4">
          <SidebarNav groups={groups} onNavigate={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}
