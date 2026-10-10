'use client';

import { Check, Info, Minus, Pencil, Plus, RotateCcw, Trash2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { MODULES, NAV_GROUP_IDS, NAV_GROUP_LABELS, PERMISSION_ACTIONS, type Grant } from '@/config/modules';
import { LOCKED_ROLE_IDS, type Role } from '@/domain/access';
import { ACTION_LABELS, RoleEditor } from '@/features/users/role-editor';
import { roleStyle } from '@/features/users/role-style';
import { formatDate } from '@/lib/format/date';
import { formatCount } from '@/lib/format/number';
import { cn } from '@/lib/utils/cn';
import { describeError, useCan, usePrincipal, useServiceQuery, useServices } from '@/services/provider';

interface RolesTabProps {
  roles: readonly Role[];
  onViewUsers: (roleId: string) => void;
}

type Editing = { kind: 'create' } | { kind: 'edit'; role: Role };

export function RolesTab({ roles, onViewUsers }: RolesTabProps) {
  const services = useServices();
  const can = useCan();
  const principal = usePrincipal();
  const toast = useToast();
  const [selectedId, setSelectedId] = useState(roles[0]?.id ?? '');
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<Role | null>(null);
  const [resetting, setResetting] = useState<Role | null>(null);
  const [pending, setPending] = useState(false);
  const customCount = roles.filter((role) => role.custom).length;

  const confirmDelete = async () => {
    if (!services || !deleting) return;
    setPending(true);
    try {
      await services.roles.delete(deleting.id);
      toast.notify({ tone: 'success', title: `${deleting.name} deleted` });
      setSelectedId(roles[0]?.id ?? '');
      setDeleting(null);
    } catch (error) {
      toast.notify({ tone: 'error', title: 'Role not deleted', description: describeError(error) });
    } finally {
      setPending(false);
    }
  };

  const confirmReset = async () => {
    if (!services || !resetting) return;
    setPending(true);
    try {
      await services.roles.resetToDefault(resetting.id);
      toast.notify({ tone: 'success', title: `${resetting.name} reset to default permissions` });
      setResetting(null);
    } catch (error) {
      toast.notify({ tone: 'error', title: 'Role not reset', description: describeError(error) });
    } finally {
      setPending(false);
    }
  };
  const memberCounts = useServiceQuery(
    async (s) => {
      const totals = await Promise.all(
        roles.map(async (role) => [role.id, (await s.users.list({ filters: { roleId: role.id }, pageSize: 1 })).total]),
      );
      return new Map(totals as [string, number][]);
    },
    [roles.map((role) => role.id).join()],
  );
  const selected = roles.find((role) => role.id === selectedId) ?? roles[0];

  return (
    <div className="space-y-6">
      <section aria-labelledby="roles-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h2 id="roles-heading" className="text-base font-semibold">
              Select Role
            </h2>
            <p className="text-sm text-muted-foreground">
              {roles.length - customCount} built-in roles · {customCount} custom {customCount === 1 ? 'role' : 'roles'}
            </p>
          </div>
          {can('users', 'create') ? (
            <Button onClick={() => setEditing({ kind: 'create' })}>
              <Plus aria-hidden />
              Create Custom Role
            </Button>
          ) : null}
        </div>
        <div role="radiogroup" aria-label="Roles" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
          {roles.map((role) => {
            const style = roleStyle(role.id);
            const active = role.id === selected?.id;
            const members = memberCounts.data?.get(role.id);
            return (
              <button
                key={role.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelectedId(role.id)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border bg-card p-4 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'relative',
                  active ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-primary/40',
                )}
              >
                {role.custom ? (
                  <Badge variant="info" className="absolute top-2 right-2 px-1.5 text-[0.625rem]">
                    Custom
                  </Badge>
                ) : role.modified ? (
                  <Badge variant="warning" className="absolute top-2 right-2 px-1.5 text-[0.625rem]">
                    Modified
                  </Badge>
                ) : null}
                <span className={cn('flex size-10 items-center justify-center rounded-full', style.tone)} aria-hidden>
                  <style.icon className="size-5" />
                </span>
                <span className="text-sm font-semibold leading-tight">{role.name}</span>
                <span className="text-xs text-muted-foreground">
                  {members === undefined ? '…' : `${formatCount(members)} ${members === 1 ? 'user' : 'users'}`}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {selected ? (
        <RoleDetail
          role={selected}
          members={memberCounts.data?.get(selected.id)}
          showAll={showAll}
          onToggleShowAll={() => setShowAll((value) => !value)}
          onViewUsers={() => onViewUsers(selected.id)}
          onEdit={
            !LOCKED_ROLE_IDS.includes(selected.id) && selected.id !== principal.roleId && can('users', 'edit')
              ? () => setEditing({ kind: 'edit', role: selected })
              : null
          }
          onReset={
            selected.modified && selected.id !== principal.roleId && can('users', 'edit')
              ? () => setResetting(selected)
              : null
          }
          onDelete={selected.custom && can('users', 'delete') ? () => setDeleting(selected) : null}
        />
      ) : null}

      <RoleEditor
        open={editing !== null}
        role={editing?.kind === 'edit' ? editing.role : null}
        roles={roles}
        onClose={() => setEditing(null)}
        onSaved={(role) => {
          setEditing(null);
          setSelectedId(role.id);
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${deleting?.name ?? 'role'}?`}
        description="The role and its permissions are removed. Roles that are still assigned to users cannot be deleted."
        confirmLabel="Delete role"
        destructive
        pending={pending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
      <ConfirmDialog
        open={resetting !== null}
        title={`Reset ${resetting?.name ?? 'role'} to default?`}
        description="Your permission changes are discarded and the role goes back to its default access for everyone who holds it."
        confirmLabel="Reset to default"
        pending={pending}
        onCancel={() => setResetting(null)}
        onConfirm={() => void confirmReset()}
      />
    </div>
  );
}

function RoleDetail({
  role,
  members,
  showAll,
  onToggleShowAll,
  onViewUsers,
  onEdit,
  onReset,
  onDelete,
}: {
  role: Role;
  members: number | undefined;
  showAll: boolean;
  onToggleShowAll: () => void;
  onViewUsers: () => void;
  onEdit: (() => void) | null;
  onReset: (() => void) | null;
  onDelete: (() => void) | null;
}) {
  const style = roleStyle(role.id);
  const granted = useMemo(() => new Set<Grant>(role.grants), [role.grants]);
  const moduleCount = MODULES.filter((module) => granted.has(`${module.id}:view`)).length;
  const groups = NAV_GROUP_IDS.map((group) => ({
    id: group,
    label: NAV_GROUP_LABELS[group],
    modules: MODULES.filter(
      (module) =>
        module.group === group &&
        (showAll || PERMISSION_ACTIONS.some((action) => granted.has(`${module.id}:${action}`))),
    ),
  })).filter((group) => group.modules.length > 0);

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div className="flex items-start gap-3">
          <span className={cn('flex size-11 items-center justify-center rounded-lg', style.tone)} aria-hidden>
            <style.icon className="size-5" />
          </span>
          <div className="space-y-1">
            <CardTitle className="text-lg">{role.name}</CardTitle>
            <p className="max-w-2xl text-sm text-muted-foreground">{role.description}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="neutral">{moduleCount} modules</Badge>
              <Badge variant="neutral">{role.grants.length} permissions</Badge>
              {role.custom ? <Badge variant="info">Custom role</Badge> : <Badge variant="outline">Built-in</Badge>}
              {role.modified ? <Badge variant="warning">Modified</Badge> : null}
              {role.allowsCustomPermissions ? (
                <Badge variant="success">Per-user extras allowed</Badge>
              ) : (
                <Badge variant="outline">Fixed permissions</Badge>
              )}
            </div>
            {role.custom ? (
              <p className="pt-1 text-xs text-muted-foreground">
                Created by {role.custom.createdBy} on {formatDate(role.custom.createdAt)}
              </p>
            ) : null}
            {role.modified ? (
              <p className="pt-1 text-xs text-muted-foreground">
                Permissions changed by {role.modified.updatedBy} on {formatDate(role.modified.updatedAt)}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onToggleShowAll}>
            {showAll ? 'Hide modules without access' : 'Show all modules'}
          </Button>
          {onEdit ? (
            <Button variant="outline" onClick={onEdit}>
              <Pencil aria-hidden />
              {role.custom ? 'Edit role' : 'Edit permissions'}
            </Button>
          ) : null}
          {onReset ? (
            <Button variant="outline" onClick={onReset}>
              <RotateCcw aria-hidden />
              Reset to default
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              variant="outline"
              onClick={onDelete}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 aria-hidden />
              Delete
            </Button>
          ) : null}
          <Button onClick={onViewUsers}>
            <Users aria-hidden />
            View users{members === undefined ? '' : ` (${formatCount(members)})`}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <p className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {role.custom
            ? 'Custom role defined by your institution. Changes apply to everyone who holds it.'
            : LOCKED_ROLE_IDS.includes(role.id)
              ? 'The owner always has full access to every module. This role cannot be edited.'
              : 'Built-in role. You can adjust its permissions for every module; changes apply to everyone who holds it and can be reset to the default at any time.'}
        </p>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[40rem] text-sm">
            <caption className="sr-only">Module permissions for {role.name}</caption>
            <thead className="bg-muted/60 text-xs text-muted-foreground uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-medium tracking-wide">
                  Module
                </th>
                {PERMISSION_ACTIONS.map((action) => (
                  <th key={action} scope="col" className="w-20 px-2 py-3 text-center font-medium tracking-wide">
                    {ACTION_LABELS[action]}
                  </th>
                ))}
              </tr>
            </thead>
            {groups.map((group) => (
              <tbody key={group.id} className="divide-y border-t">
                <tr className="bg-primary/10">
                  <th
                    scope="colgroup"
                    colSpan={PERMISSION_ACTIONS.length + 1}
                    className="border-l-4 border-l-primary px-4 py-2.5 text-left text-xs font-bold tracking-wider text-primary uppercase"
                  >
                    {group.label}
                  </th>
                </tr>
                {group.modules.map((module) => (
                  <tr key={module.id}>
                    <th scope="row" className="px-4 py-2.5 text-left font-medium">
                      {module.label}
                    </th>
                    {PERMISSION_ACTIONS.map((action) => {
                      const allowed = granted.has(`${module.id}:${action}`);
                      return (
                        <td key={action} className="px-2 py-2.5 text-center">
                          {allowed ? (
                            <span className="inline-flex size-5 items-center justify-center rounded bg-primary text-primary-foreground">
                              <Check className="size-3.5" aria-hidden />
                              <span className="sr-only">Allowed</span>
                            </span>
                          ) : (
                            <span className="inline-flex size-5 items-center justify-center text-muted-foreground/50">
                              <Minus className="size-3.5" aria-hidden />
                              <span className="sr-only">Not allowed</span>
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function RolesTabSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="h-28 rounded-lg" />
      ))}
    </div>
  );
}
