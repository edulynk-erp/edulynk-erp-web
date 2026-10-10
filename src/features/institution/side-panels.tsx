'use client';

import { ArrowRight, CheckCircle2, Crown, ImageUp, Info, Network, ShieldCheck, Trash2, XCircle } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/badge';
import { getModule, PERMISSION_ACTIONS, type PermissionAction } from '@/config/modules';
import { INSTITUTION_TYPE_LABELS } from '@/config/institution';
import { levelPlural, profileOf } from '@/config/institution-types';
import type { Institution, InstitutionOverview } from '@/domain/institution';
import { typeDetailSummary } from '@/features/institution/institution-type';
import { LogoMark } from '@/features/institution/settings-sections';
import type { SetupPermissions, SetupTab } from '@/features/institution/setup-config';
import { formatDate } from '@/lib/format/date';
import { formatCount } from '@/lib/format/number';
import { cn } from '@/lib/utils/cn';

const ACTION_LABELS: Record<PermissionAction, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  export: 'Export',
  approve: 'Approve',
};

function PanelTitle({ icon: Icon, children }: { icon: typeof Info; children: string }) {
  return (
    <CardTitle className="flex items-center gap-2">
      <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary" aria-hidden>
        <Icon className="size-4" />
      </span>
      {children}
    </CardTitle>
  );
}

export function LogoCard({
  branding,
  canChange,
  onChange,
  onRemove,
}: {
  branding: Institution['branding'];
  canChange: boolean;
  onChange: () => void;
  onRemove: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <PanelTitle icon={ImageUp}>Institution Logo & Branding</PanelTitle>
        <p className="text-xs text-muted-foreground">How your logo appears in the ERP.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-muted/30 p-4 text-center">
          <LogoMark
            logoDataUrl={branding.logoDataUrl}
            name={branding.displayName || 'Institution'}
            color={branding.primaryColor}
            className="size-20"
          />
          <p className="text-sm font-semibold">{branding.displayName}</p>
          {branding.tagline ? <p className="text-xs text-muted-foreground">{branding.tagline}</p> : null}
        </div>
        {canChange ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={onChange}>
              <ImageUp aria-hidden />
              {branding.logoDataUrl ? 'Change Logo' : 'Upload Logo'}
            </Button>
            {branding.logoDataUrl ? (
              <Button
                variant="outline"
                size="sm"
                aria-label="Remove logo"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={onRemove}
              >
                <Trash2 />
              </Button>
            ) : null}
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">Recommended size: 400 × 400 px (PNG, JPG or WebP). Max 1 MB.</p>
      </CardContent>
    </Card>
  );
}

export function QuickInfoCard({
  institution,
  overview,
  onNavigate,
}: {
  institution: Institution;
  overview: InstitutionOverview | undefined;
  onNavigate: (tab: SetupTab) => void;
}) {
  const profile = profileOf(institution.type);
  const detail = typeDetailSummary(institution.type, institution.typeDetails);
  const value = (figure: number | undefined) =>
    figure === undefined ? <Skeleton className="h-4 w-10" /> : formatCount(figure);
  const rows: [string, ReactNode][] = [
    [
      'Institution Status',
      <StatusBadge key="status" tone={institution.onboardingStatus === 'onboarded' ? 'success' : 'warning'}>
        {institution.onboardingStatus === 'onboarded' ? 'Active' : 'Onboarding'}
      </StatusBadge>,
    ],
    ['Institution Type', INSTITUTION_TYPE_LABELS[institution.type]],
    [
      detail.label,
      <span key="detail" className="line-clamp-2 break-words">
        {detail.value}
      </span>,
    ],
    ['Campuses & Locations', value(overview?.campuses)],
    [`Total ${profile.terms.learners}`, value(overview?.activeStudents)],
    ['Total Staff', value(overview?.staff)],
    [
      'Academic Year',
      overview ? (overview.currentYearLabel ?? 'Not set') : <Skeleton key="year" className="h-4 w-16" />,
    ],
    ['Plan', institution.plan],
    ['Member Since', formatDate(institution.onboardedAt)],
  ];
  const settings = institution.structure[institution.type];
  const structureRows: [string, number | undefined][] = [
    ...(profile.usesSchoolClasses ? ([['Classes', overview?.classes]] as [string, number | undefined][]) : []),
    ...profile.levels.map((level): [string, number | undefined] => [
      levelPlural(level, settings),
      overview ? (overview.structure[level.kind] ?? 0) : undefined,
    ]),
  ];
  return (
    <Card>
      <CardHeader>
        <PanelTitle icon={Info}>Quick Information</PanelTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="divide-y text-sm">
          {rows.map(([label, content]) => (
            <div key={label} className="flex items-center justify-between gap-3 py-2">
              <dt className="shrink-0 text-muted-foreground">{label}</dt>
              <dd className="min-w-0 text-right font-medium">{content}</dd>
            </div>
          ))}
        </dl>
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <p className="flex items-center gap-2 text-xs font-semibold">
            <Network className="size-3.5 text-primary" aria-hidden />
            Academic structure at a glance
          </p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            {structureRows.map(([label, count]) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <dt className="truncate text-muted-foreground">{label}</dt>
                <dd className="font-semibold">{value(count)}</dd>
              </div>
            ))}
          </dl>
          <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => onNavigate('structure')}>
            Open Academic Structure
            <ArrowRight aria-hidden />
          </Button>
        </div>
        {institution.updatedAt ? (
          <p className="text-xs text-muted-foreground">
            Last updated by {institution.updatedBy} on {formatDate(institution.updatedAt)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function summary(permissions: SetupPermissions): string {
  if (PERMISSION_ACTIONS.every((action) => permissions[action]))
    return 'You have full access to manage institution settings.';
  if (!permissions.edit && !permissions.create && !permissions.delete) {
    return 'You can view institution settings but not change them.';
  }
  return 'You can make the changes your role allows; other actions are unavailable.';
}

function Allowed({ allowed, label }: { allowed: boolean; label: string }) {
  return allowed ? (
    <CheckCircle2 className="mx-auto size-4.5 text-success" aria-label={`${label}: allowed`} role="img" />
  ) : (
    <XCircle className="mx-auto size-4.5 text-muted-foreground/60" aria-label={`${label}: not allowed`} role="img" />
  );
}

export function PermissionSummaryCard({
  permissions,
  roleId,
  roleName,
}: {
  permissions: SetupPermissions;
  roleId: string;
  roleName: string;
}) {
  return (
    <Card>
      <CardHeader>
        <PanelTitle icon={ShieldCheck}>Permission Summary</PanelTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Current Role</span>
          <span className="flex items-center gap-1.5 font-semibold text-primary">
            {roleId === 'owner' ? <Crown className="size-4 text-warning" aria-hidden /> : null}
            {roleName}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{summary(permissions)}</p>
        <div>
          <p className="mb-2 text-xs font-semibold">{getModule('institution').label} Permissions</p>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-3 2xl:grid-cols-6">
            {PERMISSION_ACTIONS.map((action) => (
              <li
                key={action}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-md border px-1 py-2 text-xs',
                  permissions[action] ? 'bg-success/5' : 'bg-muted/40 text-muted-foreground',
                )}
              >
                <span>{ACTION_LABELS[action]}</span>
                <Allowed allowed={permissions[action]} label={ACTION_LABELS[action]} />
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

/** The current role's grants for this module, read-only: nobody can change their own permissions from here. */
export function ModulePermissionsCard({
  permissions,
  roleName,
  canManageRoles,
}: {
  permissions: SetupPermissions;
  roleName: string;
  canManageRoles: boolean;
}) {
  const rows = [
    { label: getModule('institution').label, allowed: (action: PermissionAction) => permissions[action] },
    {
      label: getModule('branding').label,
      allowed: (action: PermissionAction) => (action === 'edit' ? permissions.brandingEdit : null),
    },
  ];
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>Module Permissions</CardTitle>
          <p className="text-xs text-muted-foreground">
            What {roleName} can do here. Permissions come from your role and cannot be changed on this page.
          </p>
        </div>
        {canManageRoles ? (
          <Button asChild variant="outline" size="sm">
            <Link href="/users?tab=roles" prefetch={false}>
              Manage roles
            </Link>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[32rem] text-sm">
            <caption className="sr-only">Your permissions for Institution Setup</caption>
            <thead className="border-b bg-muted/60 text-xs text-muted-foreground uppercase">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">
                  Module
                </th>
                {PERMISSION_ACTIONS.map((action) => (
                  <th key={action} scope="col" className="px-2 py-2.5 text-center font-medium">
                    {ACTION_LABELS[action]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="px-4 py-2.5 text-left font-medium">
                    {row.label}
                  </th>
                  {PERMISSION_ACTIONS.map((action) => {
                    const allowed = row.allowed(action);
                    return (
                      <td key={action} className="px-2 py-2.5 text-center">
                        {allowed === null ? (
                          <>
                            <span className="text-muted-foreground" aria-hidden>
                              –
                            </span>
                            <span className="sr-only">{ACTION_LABELS[action]}: not managed here</span>
                          </>
                        ) : (
                          <Allowed allowed={allowed} label={ACTION_LABELS[action]} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
