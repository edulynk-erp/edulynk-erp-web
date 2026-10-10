'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IncompleteFormHint } from '@/components/ui/form-status';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input, Label, Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import {
  MODULES,
  NAV_GROUP_IDS,
  NAV_GROUP_LABELS,
  PERMISSION_ACTIONS,
  type Grant,
  type ModuleDefinition,
  type PermissionAction,
} from '@/config/modules';
import type { Role } from '@/domain/access';
import { cn } from '@/lib/utils/cn';
import { isServiceError } from '@/services/errors';
import { describeError, usePrincipal, useServices } from '@/services/provider';

export const ACTION_LABELS: Record<PermissionAction, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  export: 'Export',
  approve: 'Approve',
};

interface RoleEditorProps {
  open: boolean;
  /** The custom role to edit, or null to create one. */
  role: Role | null;
  roles: readonly Role[];
  onClose: () => void;
  onSaved: (role: Role) => void;
}

/** Create or edit an institution-defined role and its module permissions. */
export function RoleEditor({ open, role, roles, onClose, onSaved }: RoleEditorProps) {
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(true);
  return (
    <Dialog
      open={open}
      onClose={busy ? () => {} : onClose}
      variant="drawer"
      className="max-w-3xl"
      title={role ? `Edit ${role.name}` : 'Create Custom Role'}
      description={
        role
          ? `Changes apply to everyone who holds this role.${role.custom ? '' : ' You can reset a built-in role to its default permissions at any time.'}`
          : 'Define a role for your institution and choose exactly what it can do.'
      }
      footer={
        <>
          {!ready && !busy ? <IncompleteFormHint className="mr-auto self-center" /> : null}
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="role-editor-form" loading={busy} disabled={!ready}>
            {busy ? 'Saving…' : role ? 'Save changes' : 'Create role'}
          </Button>
        </>
      }
    >
      {open ? (
        <RoleForm
          key={role?.id ?? 'new'}
          role={role}
          roles={roles}
          onBusy={setBusy}
          onReady={setReady}
          onSaved={onSaved}
        />
      ) : null}
    </Dialog>
  );
}

function RoleForm({
  role,
  roles,
  onBusy,
  onReady,
  onSaved,
}: {
  role: Role | null;
  roles: readonly Role[];
  onBusy: (busy: boolean) => void;
  /** Reports whether the required fields are complete, so the footer can enable Save. */
  onReady: (ready: boolean) => void;
  onSaved: (role: Role) => void;
}) {
  const services = useServices();
  const toast = useToast();
  const held = new Set<string>(usePrincipal().grants);
  const builtIn = role !== null && !role.custom;
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [allowsCustom, setAllowsCustom] = useState(role?.allowsCustomPermissions ?? true);
  const [grants, setGrants] = useState<ReadonlySet<Grant>>(
    () => new Set<Grant>(role?.grants ?? ['dashboard:view', 'help:view']),
  );
  const [templates, setTemplates] = useState<readonly string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [nameTouched, setNameTouched] = useState(false);
  const clearError = (field: string) =>
    setErrors((current) =>
      field in current ? Object.fromEntries(Object.entries(current).filter(([key]) => key !== field)) : current,
    );
  const nameError = (nameTouched && name.trim().length < 2 ? 'Enter a role name.' : undefined) ?? errors.name;
  const grantsError = (grants.size === 0 ? 'Select at least one permission.' : undefined) ?? errors.grants;
  const allowsCustomId = useId();
  const ready = name.trim().length >= 2 && grants.size > 0;
  useEffect(() => {
    onReady(ready);
    return () => onReady(true);
  }, [ready, onReady]);

  const toggle = (module: ModuleDefinition, action: PermissionAction, on: boolean) => {
    clearError('grants');
    setGrants((current) => {
      const next = new Set(current);
      if (action === 'view' && !on) {
        for (const each of PERMISSION_ACTIONS) next.delete(`${module.id}:${each}`);
      } else if (on) {
        next.add(`${module.id}:${action}`);
        next.add(`${module.id}:view`);
      } else {
        next.delete(`${module.id}:${action}`);
      }
      return next;
    });
  };

  const toggleRow = (module: ModuleDefinition, on: boolean) => {
    clearError('grants');
    setGrants((current) => {
      const next = new Set(current);
      for (const action of PERMISSION_ACTIONS) {
        if (on) {
          if (held.has(`${module.id}:${action}`)) next.add(`${module.id}:${action}`);
        } else next.delete(`${module.id}:${action}`);
      }
      return next;
    });
  };

  const applyTemplates = (roleIds: readonly string[]) => {
    clearError('grants');
    setTemplates(roleIds);
    const sources = roles.filter((candidate) => roleIds.includes(candidate.id));
    if (sources.length === 0) {
      setGrants(new Set<Grant>(['dashboard:view', 'help:view']));
      return;
    }
    setGrants(new Set(sources.flatMap((source) => source.grants).filter((grant) => held.has(grant))));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!services) return;
    setNameTouched(true);
    const local: Record<string, string> = {};
    if (name.trim().length < 2) local.name = 'Enter a role name.';
    if (grants.size === 0) local.grants = 'Select at least one permission.';
    setErrors(local);
    if (Object.keys(local).length > 0) return;

    onBusy(true);
    try {
      const input = { name, description, allowsCustomPermissions: allowsCustom, grants: [...grants] };
      const saved = role ? await services.roles.update(role.id, input) : await services.roles.create(input);
      toast.notify({ tone: 'success', title: role ? `${saved.name} updated` : `${saved.name} created` });
      onSaved(saved);
    } catch (error) {
      if (isServiceError(error)) setErrors({ ...error.fieldErrors });
      toast.notify({ tone: 'error', title: 'Role not saved', description: describeError(error) });
    } finally {
      onBusy(false);
    }
  };

  const groups = NAV_GROUP_IDS.map((group) => ({
    id: group,
    label: NAV_GROUP_LABELS[group],
    modules: MODULES.filter((module) => module.group === group),
  })).filter((group) => group.modules.length > 0);
  const moduleCount = MODULES.filter((module) => grants.has(`${module.id}:view`)).length;

  return (
    <form id="role-editor-form" onSubmit={submit} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Role Name"
          error={nameError}
          required={!builtIn}
          hint={builtIn ? 'Built-in role names cannot be changed.' : undefined}
        >
          <Input
            value={name}
            maxLength={60}
            readOnly={builtIn}
            className={cn(builtIn && 'bg-muted text-muted-foreground')}
            placeholder="e.g. Sports Coordinator"
            onChange={(event) => {
              setName(event.target.value);
              setNameTouched(true);
              clearError('name');
            }}
            onBlur={() => setNameTouched(true)}
          />
        </FormField>
        {role ? null : <RoleTemplatePicker roles={roles} selected={templates} onChange={applyTemplates} />}
        <FormField label="Description" error={errors.description} className="sm:col-span-2">
          <Textarea
            value={description}
            maxLength={200}
            rows={2}
            readOnly={builtIn}
            className={cn(builtIn && 'bg-muted text-muted-foreground')}
            placeholder="What this role is responsible for"
            onChange={(event) => {
              setDescription(event.target.value);
              clearError('description');
            }}
          />
        </FormField>
        <div className="flex items-start gap-2 sm:col-span-2">
          <Checkbox
            id={allowsCustomId}
            checked={allowsCustom}
            onChange={(event) => setAllowsCustom(event.target.checked)}
            className="mt-0.5"
          />
          <div>
            <Label htmlFor={allowsCustomId}>Allow extra permissions per user</Label>
            <p className="text-xs text-muted-foreground">
              Lets administrators grant individual users non-sensitive permissions beyond this role.
            </p>
          </div>
        </div>
      </div>

      <section aria-labelledby="role-permissions-heading" className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="role-permissions-heading" className="text-sm font-semibold">
            Module Permissions
          </h3>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {moduleCount} modules · {grants.size} permissions
          </p>
        </div>
        {grantsError ? (
          <p role="alert" className="text-xs font-medium text-destructive">
            {grantsError}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Any action automatically includes View for that module. You can only grant permissions you hold yourself.
        </p>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[40rem] text-sm">
            <caption className="sr-only">Module permissions</caption>
            <thead className="bg-muted/60 text-xs text-muted-foreground uppercase">
              <tr>
                <th scope="col" className="px-3 py-2.5 text-left font-medium tracking-wide">
                  Module
                </th>
                <th scope="col" className="w-12 px-2 py-2.5 text-center font-medium tracking-wide">
                  All
                </th>
                {PERMISSION_ACTIONS.map((action) => (
                  <th key={action} scope="col" className="w-16 px-1 py-2.5 text-center font-medium tracking-wide">
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
                    colSpan={PERMISSION_ACTIONS.length + 2}
                    className="border-l-4 border-l-primary px-3 py-2 text-left text-xs font-bold tracking-wider text-primary uppercase"
                  >
                    {group.label}
                  </th>
                </tr>
                {group.modules.map((module) => {
                  const full = PERMISSION_ACTIONS.every((action) => grants.has(`${module.id}:${action}`));
                  const any = grants.has(`${module.id}:view`);
                  return (
                    <tr key={module.id} className={cn(!any && 'text-muted-foreground')}>
                      <th scope="row" className="px-3 py-2 text-left font-medium">
                        <span className="inline-flex items-center gap-2">
                          {module.label}
                          {module.sensitive ? <Badge variant="warning">Sensitive</Badge> : null}
                        </span>
                      </th>
                      <td className="px-2 py-2 text-center">
                        <Checkbox
                          aria-label={`${module.label}: all permissions`}
                          checked={full}
                          disabled={!grants.has(`${module.id}:view`) && !held.has(`${module.id}:view`)}
                          onChange={(event) => toggleRow(module, event.target.checked)}
                        />
                      </td>
                      {PERMISSION_ACTIONS.map((action) => (
                        <td key={action} className="px-1 py-2 text-center">
                          <Checkbox
                            aria-label={`${module.label}: ${ACTION_LABELS[action]}`}
                            checked={grants.has(`${module.id}:${action}`)}
                            disabled={
                              !grants.has(`${module.id}:${action}`) &&
                              !(held.has(`${module.id}:${action}`) && held.has(`${module.id}:view`))
                            }
                            onChange={(event) => toggle(module, action, event.target.checked)}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>
        </div>
      </section>
    </form>
  );
}

/** Multi-select of existing roles whose permissions are combined into the new role. */
function RoleTemplatePicker({
  roles,
  selected,
  onChange,
}: {
  roles: readonly Role[];
  selected: readonly string[];
  onChange: (roleIds: readonly string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointer);
    container.current?.addEventListener('keydown', onKey);
    const node = container.current;
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      node?.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const names = roles.filter((role) => selected.includes(role.id)).map((role) => role.name);
  const summary =
    names.length === 0 ? 'Blank role' : names.length <= 2 ? names.join(' + ') : `${names.length} roles combined`;
  const toggle = (roleId: string, on: boolean) =>
    onChange(on ? [...selected, roleId] : selected.filter((id) => id !== roleId));

  return (
    <div ref={container} className="relative space-y-1.5">
      <Label id={labelId}>Start from</Label>
      <button
        type="button"
        aria-labelledby={labelId}
        aria-describedby={`${labelId}-value`}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-left text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span id={`${labelId}-value`} className={cn('truncate', names.length === 0 && 'text-muted-foreground')}>
          {summary}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
      <p className="text-xs text-muted-foreground">Pick one or more roles to combine their permissions.</p>
      {open ? (
        <div
          id={listId}
          role="group"
          aria-labelledby={labelId}
          className="absolute top-[3.75rem] right-0 left-0 z-20 max-h-64 overflow-y-auto rounded-md border bg-card p-1 shadow-lg"
        >
          {roles.map((role) => {
            const id = `${listId}-${role.id}`;
            return (
              <div key={role.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted">
                <Checkbox
                  id={id}
                  checked={selected.includes(role.id)}
                  onChange={(event) => toggle(role.id, event.target.checked)}
                />
                <Label htmlFor={id} className="flex-1 cursor-pointer font-normal">
                  {role.name}
                  {role.custom ? <span className="ml-1.5 text-xs text-muted-foreground">(custom)</span> : null}
                </Label>
              </div>
            );
          })}
          {selected.length > 0 ? (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-1 w-full rounded border-t px-2 py-1.5 text-left text-xs font-medium text-primary hover:bg-muted"
            >
              Clear selection (blank role)
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
