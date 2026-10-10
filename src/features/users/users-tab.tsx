'use client';

import { SelectMenu } from '@/components/ui/select-menu';
import { designationName } from '@/config/designations';
import { Download, KeyRound, MailPlus, MoreHorizontal, Pencil, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTable, type DataColumn, type TableSort } from '@/components/data/data-table';
import { Avatar } from '@/components/ui/avatar';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Tabs } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import type { Role } from '@/domain/access';
import type { Tone } from '@/domain/common';
import type { User, UserStatus } from '@/domain/users';
import { UserFormDialog } from '@/features/users/user-form-dialog';
import { roleStyle } from '@/features/users/role-style';
import { inCampusScope } from '@/lib/access/grants';
import { formatRelative } from '@/lib/format/date';
import { MAX_PAGE_SIZE } from '@/lib/query/list';
import { cn } from '@/lib/utils/cn';
import { describeError, useCan, usePrincipal, useServiceQuery, useServices, useWorkspace } from '@/services/provider';
import type { UserFilters } from '@/services/users';

type StatusTab = 'all' | UserStatus;

const STATUS: Record<UserStatus, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'success' },
  inactive: { label: 'Inactive', tone: 'neutral' },
  invited: { label: 'Invited', tone: 'warning' },
};

const PAGE_SIZE = 8;

interface UsersTabProps {
  roles: readonly Role[];
  roleFilter: string;
  onRoleFilterChange: (roleId: string) => void;
}

export function UsersTab({ roles, roleFilter, onRoleFilterChange }: UsersTabProps) {
  const services = useServices();
  const can = useCan();
  const { campuses } = useWorkspace();
  const toast = useToast();
  const [status, setStatus] = useState<StatusTab>('all');
  const [search, setSearch] = useState('');
  const [campusId, setCampusId] = useState('');
  const [sort, setSort] = useState<TableSort | null>({ field: 'fullName', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [exporting, setExporting] = useState(false);

  const filters: Partial<UserFilters> = {
    ...(status === 'all' ? {} : { status }),
    ...(roleFilter ? { roleId: roleFilter } : {}),
    ...(campusId ? { campusId } : {}),
  };
  const query = { search, filters, ...(sort ? { sort } : {}), page, pageSize: PAGE_SIZE };
  const list = useServiceQuery((s) => s.users.list(query), [query]);
  const counts = useServiceQuery((s) => s.users.counts(), []);

  const roleNames = useMemo(() => new Map(roles.map((role) => [role.id, role.name])), [roles]);
  const campusNames = useMemo(() => new Map(campuses.map((campus) => [campus.id, campus.name])), [campuses]);
  const resetPage =
    <T,>(update: (value: T) => void) =>
    (value: T) => {
      update(value);
      setPage(1);
    };

  const exportCsv = async () => {
    if (!services) return;
    setExporting(true);
    try {
      const rows: User[] = [];
      for (let next = 1; ; next += 1) {
        const result = await services.users.list({ ...query, page: next, pageSize: MAX_PAGE_SIZE });
        rows.push(...result.items);
        if (next >= result.pageCount) break;
      }
      downloadCsv(rows, roleNames, campusNames);
      toast.notify({ tone: 'success', title: `Exported ${rows.length} users`, description: 'Saved as users.csv.' });
    } catch (error) {
      toast.notify({ tone: 'error', title: 'Export failed', description: describeError(error) });
    } finally {
      setExporting(false);
    }
  };

  const columns: DataColumn<User>[] = [
    {
      id: 'fullName',
      header: 'User',
      sortable: true,
      cell: (user) => (
        <div className="flex items-center gap-3">
          <Avatar name={user.fullName} />
          <div className="min-w-0">
            <p className="truncate font-medium">{user.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{designationName(user.designationId)}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'email',
      header: 'Email',
      sortable: true,
      cell: (user) => (
        <span className="block max-w-52 truncate text-sm" title={user.email}>
          {user.email}
        </span>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      sortable: true,
      cell: (user) => (
        <Badge variant="outline" className={cn('border-transparent', roleStyle(user.roleId).tone)}>
          {roleNames.get(user.roleId) ?? user.roleId}
        </Badge>
      ),
    },
    {
      id: 'campus',
      header: 'Campus',
      sortable: true,
      cell: (user) => <span className="whitespace-nowrap">{campusNames.get(user.campusId) ?? user.campusId}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      sortable: true,
      cell: (user) => <StatusBadge tone={STATUS[user.status].tone}>{STATUS[user.status].label}</StatusBadge>,
    },
    {
      id: 'lastActiveAt',
      header: 'Last active',
      sortable: true,
      cell: (user) => (
        <span className="text-xs text-muted-foreground">
          {user.lastActiveAt ? formatRelative(user.lastActiveAt) : 'Never'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      className: 'w-px text-right',
      cell: (user) => <RowActions user={user} onEdit={setEditing} />,
    },
  ];

  const statusTabs = [
    { value: 'all' as const, label: 'All Users', count: counts.data?.all },
    { value: 'active' as const, label: 'Active', count: counts.data?.active },
    { value: 'inactive' as const, label: 'Inactive', count: counts.data?.inactive },
    { value: 'invited' as const, label: 'Invited', count: counts.data?.invited },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Tabs label="User status" value={status} options={statusTabs} onChange={resetPage(setStatus)} />
        <div className="flex gap-2">
          {can('users', 'create') ? (
            <Button onClick={() => setCreating(true)}>
              <Plus aria-hidden />
              Create User
            </Button>
          ) : null}
          {can('users', 'export') ? (
            <Button variant="outline" onClick={exportCsv} loading={exporting} disabled={!services}>
              <Download aria-hidden />
              {exporting ? 'Exporting…' : 'Export'}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-64 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            aria-label="Search users"
            placeholder="Search by name, email or mobile…"
            className="h-10 pl-9"
            value={search}
            onChange={(event) => resetPage(setSearch)(event.target.value)}
          />
        </div>
        <SelectMenu
          aria-label="Filter by role"
          className="h-10 w-52"
          value={roleFilter}
          onValueChange={(value) => resetPage(onRoleFilterChange)(value)}
          options={[{ value: '', label: 'All Roles' }, ...roles.map((role) => ({ value: role.id, label: role.name }))]}
        />
        <SelectMenu
          aria-label="Filter by campus"
          className="h-10 w-44"
          value={campusId}
          onValueChange={(value) => resetPage(setCampusId)(value)}
          options={[
            { value: '', label: 'All Campuses' },
            ...campuses.map((campus) => ({ value: campus.id, label: campus.name })),
          ]}
        />
      </div>

      <DataTable
        caption="Institution users"
        columns={columns}
        page={list.data}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        getRowId={(user) => user.id}
        sort={sort}
        onSortChange={resetPage(setSort)}
        onPageChange={setPage}
        emptyTitle="No users match"
      />

      <UserFormDialog open={creating} roles={roles} onClose={() => setCreating(false)} />
      <UserFormDialog open={editing !== null} roles={roles} user={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function RowActions({ user, onEdit }: { user: User; onEdit: (user: User) => void }) {
  const services = useServices();
  const can = useCan();
  const principal = usePrincipal();
  const toast = useToast();
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [pending, setPending] = useState(false);

  if (!can('users', 'edit')) return <span className="sr-only">No actions available</span>;

  const lockedReason =
    user.roleId === 'owner'
      ? 'The institution owner account cannot be changed here.'
      : user.id === principal.subject
        ? "You can't change your own account here."
        : !inCampusScope(principal.campusScope, user.campusId)
          ? 'This user belongs to a campus outside your access.'
          : null;
  const statusReason =
    lockedReason ??
    (user.status === 'invited' ? 'Invited users become active when they accept their invitation.' : null);
  const active = user.status === 'active';
  const menu = [
    user.status === 'invited' && !lockedReason
      ? { label: 'Resend invitation', icon: MailPlus, run: () => resend(user) }
      : null,
    active && !lockedReason ? { label: 'Send password reset', icon: KeyRound, run: () => reset(user) } : null,
  ].filter((action) => action !== null);

  async function run(work: () => Promise<unknown>, success: string, description?: string) {
    if (!services) return;
    setPending(true);
    try {
      await work();
      toast.notify({ tone: 'success', title: success, ...(description ? { description } : {}) });
      setConfirmDeactivate(false);
    } catch (error) {
      toast.notify({ tone: 'error', title: 'Action failed', description: describeError(error) });
    } finally {
      setPending(false);
    }
  }

  function resend(target: User) {
    void run(
      () => services!.users.resendInvitation(target.id),
      `Invitation re-sent to ${target.fullName}`,
      'Simulated: the email is in the demo inbox.',
    );
  }

  function reset(target: User) {
    void run(
      () => services!.users.sendPasswordReset(target.id),
      `Password reset sent to ${target.fullName}`,
      'Simulated: the email is in the demo inbox.',
    );
  }

  function setStatus(next: 'active' | 'inactive') {
    void run(
      () => services!.users.setStatus(user.id, next),
      `${user.fullName} ${next === 'active' ? 'activated' : 'deactivated'}`,
    );
  }

  return (
    <div className="flex items-center justify-end">
      <span title={lockedReason ?? `Edit ${user.fullName}`} className="inline-flex">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Edit ${user.fullName}`}
          disabled={Boolean(lockedReason) || pending}
          onClick={() => onEdit(user)}
        >
          <Pencil />
        </Button>
      </span>
      <span
        title={statusReason ?? (active ? 'Active. Switch off to deactivate.' : 'Inactive. Switch on to activate.')}
        className="inline-flex px-1"
      >
        <Switch
          aria-label={`Active: ${user.fullName}`}
          checked={active}
          disabled={Boolean(statusReason) || pending || !services}
          onChange={() => (active ? setConfirmDeactivate(true) : setStatus('active'))}
        />
      </span>
      {menu.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`More actions for ${user.fullName}`} disabled={pending}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {menu.map((action) => (
              <DropdownMenuItem key={action.label} onSelect={action.run}>
                <action.icon className="size-4" aria-hidden />
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="size-9 shrink-0" aria-hidden />
      )}
      <ConfirmDialog
        open={confirmDeactivate}
        title={`Deactivate ${user.fullName}?`}
        description="They will no longer be able to sign in. You can activate them again at any time."
        confirmLabel="Deactivate"
        destructive
        pending={pending}
        onCancel={() => setConfirmDeactivate(false)}
        onConfirm={() => setStatus('inactive')}
      />
    </div>
  );
}

function downloadCsv(users: readonly User[], roles: Map<string, string>, campuses: Map<string, string>) {
  const header = ['Name', 'Email', 'Mobile', 'Employee ID', 'Designation', 'Role', 'Campus', 'Status'];
  const rows = users.map((user) => [
    user.fullName,
    user.email,
    user.mobile,
    user.employeeId ?? '',
    designationName(user.designationId),
    roles.get(user.roleId) ?? user.roleId,
    campuses.get(user.campusId) ?? user.campusId,
    STATUS[user.status].label,
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'users.csv';
  link.click();
  URL.revokeObjectURL(url);
}

/** Quotes every cell and neutralises spreadsheet formula injection. */
function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
