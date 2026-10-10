'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ErrorState } from '@/components/feedback/states';
import { PageHeader } from '@/components/layout/page-header';
import { Tabs } from '@/components/ui/tabs';
import { RolesTab, RolesTabSkeleton } from '@/features/users/roles-tab';
import { UsersTab } from '@/features/users/users-tab';
import { useServiceQuery } from '@/services/provider';

export type UsersAccessTab = 'users' | 'roles';

const TABS = [
  { value: 'users' as const, label: 'Users' },
  { value: 'roles' as const, label: 'Roles & Permissions' },
];

export function UsersAccess({ initialTab }: { initialTab: UsersAccessTab }) {
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<UsersAccessTab>(initialTab);
  const [roleFilter, setRoleFilter] = useState('');
  const roles = useServiceQuery((s) => s.roles.list(), []);

  const changeTab = (next: UsersAccessTab) => {
    setTab(next);
    router.replace(next === 'users' ? pathname : `${pathname}?tab=${next}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & Access"
        description="Manage who can sign in to your institution and what each role can do."
      />
      <Tabs label="Users and access" value={tab} options={TABS} onChange={changeTab}>
        {roles.error ? (
          <ErrorState title="Roles could not be loaded" description={roles.error} />
        ) : tab === 'users' ? (
          <UsersTab roles={roles.data ?? []} roleFilter={roleFilter} onRoleFilterChange={setRoleFilter} />
        ) : roles.data ? (
          <RolesTab
            roles={roles.data}
            onViewUsers={(roleId) => {
              setRoleFilter(roleId);
              changeTab('users');
            }}
          />
        ) : (
          <RolesTabSkeleton />
        )}
      </Tabs>
    </div>
  );
}
