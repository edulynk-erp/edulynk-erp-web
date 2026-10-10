'use client';

import { Lock, PackageCheck, Star } from 'lucide-react';
import Link from 'next/link';
import { ErrorState } from '@/components/feedback/states';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getModule } from '@/config/modules';
import { profileOf } from '@/config/institution-types';
import type { EntitlementStatus, FeatureEntitlement, InstitutionType } from '@/domain/institution';
import { SectionCard, SetupTable } from '@/features/institution/setup-ui';
import { useServiceQuery } from '@/services/provider';

const STATUS: Record<EntitlementStatus, { label: string; tone: 'success' | 'info' | 'neutral' }> = {
  included: { label: 'Included', tone: 'success' },
  'add-on': { label: 'Add-on', tone: 'info' },
  'not-included': { label: 'Not included', tone: 'neutral' },
};

/**
 * What the subscription includes. Read-only by design: entitlements are managed by Edulynk, and no role inside the
 * institution can grant them, so there are no edit controls and the service exposes no write method.
 */
export function EntitlementsTab({
  institutionType,
  plan,
  canManageRoles,
}: {
  institutionType: InstitutionType;
  plan: string;
  canManageRoles: boolean;
}) {
  const entitlements = useServiceQuery((s) => s.institution.listEntitlements(), []);
  const keyModules = new Set(profileOf(institutionType).keyModules);

  if (entitlements.error) {
    return (
      <ErrorState
        title="Feature entitlements could not be loaded"
        description={entitlements.error}
        action={
          <Button variant="outline" onClick={entitlements.reload}>
            Try again
          </Button>
        }
      />
    );
  }

  const rows = [...(entitlements.data ?? [])].sort(
    (a, b) => Number(keyModules.has(b.moduleId)) - Number(keyModules.has(a.moduleId)),
  );
  const included = rows.filter((row) => row.status === 'included').length;

  return (
    <SectionCard
      icon={PackageCheck}
      title="Feature Entitlements"
      description={`Modules available on your ${plan} plan. ${included} of ${rows.length} modules are included.`}
    >
      <p
        role="note"
        className="mb-4 flex items-start gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
      >
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          Entitlements are managed by Edulynk under your subscription and cannot be changed here. Who can use an
          included module is controlled by roles
          {canManageRoles ? (
            <>
              {' '}
              in{' '}
              <Link href="/users?tab=roles" prefetch={false} className="font-medium text-primary hover:underline">
                Users & Roles
              </Link>
            </>
          ) : null}
          .
        </span>
      </p>
      <SetupTable<FeatureEntitlement>
        caption="Feature entitlements"
        loading={entitlements.loading}
        rows={rows}
        getRowId={(row) => row.moduleId}
        emptyTitle={entitlements.loading ? 'Loading entitlements' : 'No entitlements found'}
        columns={[
          {
            header: 'Module',
            cell: (row) => {
              const definition = getModule(row.moduleId);
              return (
                <div>
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {definition.label}
                    {keyModules.has(row.moduleId) ? (
                      <Badge variant="warning">
                        <Star className="size-3" aria-hidden />
                        Key for your type
                      </Badge>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{definition.description}</p>
                </div>
              );
            },
          },
          {
            header: 'Status',
            className: 'whitespace-nowrap',
            cell: (row) => <StatusBadge tone={STATUS[row.status].tone}>{STATUS[row.status].label}</StatusBadge>,
          },
          {
            header: 'Limit',
            className: 'whitespace-nowrap text-muted-foreground',
            cell: (row) => row.limit ?? '—',
          },
        ]}
      />
    </SectionCard>
  );
}
