'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, MapPinned, Phone, Plus, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorState } from '@/components/feedback/states';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input, Select } from '@/components/ui/input';
import { ALL_CITIES, cityName } from '@/config/institution';
import { LOCATION_KIND_LABELS, profileOf } from '@/config/institution-types';
import type { Campus, InstitutionType, LocationKind } from '@/domain/institution';
import {
  DeleteRecordDialog,
  RecordDialog,
  useRecordSubmit,
  useReportBusy,
  type EditorState,
} from '@/features/institution/record-dialog';
import { canManageCampus, type SetupPermissions } from '@/features/institution/setup-config';
import { IconInput, RowActions, SectionCard, SetupTable } from '@/features/institution/setup-ui';
import { campusSchema, type CampusInput } from '@/lib/validation/institution';
import { useServiceQuery, useServices } from '@/services/provider';
import { LIVE_VALIDATION } from '@/lib/validation/form-options';

const FORM_ID = 'campus-form';
const FIELDS = Object.keys(campusSchema.shape);

const DESCRIPTIONS: Record<InstitutionType, string> = {
  school: 'Campuses and branches. Each appears in the header campus selector and in user, class and calendar forms.',
  'junior-college':
    'Campuses and branches. Each appears in the header campus selector and in admissions and staff forms.',
  'degree-college': 'The main campus and any study centres. Programmes can be offered at a specific campus.',
  university:
    'Campuses, constituent colleges, affiliated colleges and study centres, each with its own code and contact.',
  coaching: 'Branches and centres. Batches run at a specific centre.',
  other: 'Every place you teach. Groups and programmes can be tied to a location.',
};

export function CampusesTab({
  permissions,
  institutionType,
}: {
  permissions: SetupPermissions;
  institutionType: InstitutionType;
}) {
  const profile = profileOf(institutionType);
  const services = useServices();
  const campuses = useServiceQuery((s) => s.institution.listCampuses(), []);
  const classes = useServiceQuery((s) => s.institution.listClasses(), []);
  const [editor, setEditor] = useState<EditorState<Campus>>(null);
  const [deleting, setDeleting] = useState<Campus | null>(null);
  const [busy, setBusy] = useState(false);

  const classCount = (id: string) => classes.data?.filter((item) => item.campusId === id).length;
  const kindCounts = new Map<LocationKind, number>();
  for (const campus of campuses.data ?? []) kindCounts.set(campus.kind, (kindCounts.get(campus.kind) ?? 0) + 1);
  const canAdd = permissions.create && permissions.institutionWide;

  if (campuses.error) {
    return (
      <ErrorState
        title="Campuses could not be loaded"
        description={campuses.error}
        action={
          <Button variant="outline" onClick={campuses.reload}>
            Try again
          </Button>
        }
      />
    );
  }

  return (
    <SectionCard
      icon={MapPinned}
      title="Campuses & Locations"
      description={DESCRIPTIONS[institutionType]}
      actions={
        canAdd ? (
          <Button onClick={() => setEditor({ record: null })}>
            <Plus aria-hidden />
            Add Location
          </Button>
        ) : null
      }
    >
      {kindCounts.size > 0 ? (
        <ul className="mb-3 flex flex-wrap gap-2" aria-label="Locations by type">
          {[...kindCounts].map(([kind, count]) => (
            <li key={kind}>
              <Badge variant="neutral">
                {LOCATION_KIND_LABELS[kind]}: {count}
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}
      {permissions.create && !permissions.institutionWide ? (
        <p className="mb-3 text-xs text-muted-foreground">
          Your access covers specific campuses, so you can update those but not add new locations.
        </p>
      ) : null}
      <SetupTable
        caption="Campuses and locations"
        loading={campuses.loading}
        rows={campuses.data ?? []}
        getRowId={(campus) => campus.id}
        emptyTitle={campuses.loading ? 'Loading locations' : 'No locations yet'}
        emptyDescription={canAdd ? 'Add your main campus first; it appears in every campus selector.' : undefined}
        columns={[
          {
            header: 'Location',
            cell: (campus) => (
              <div>
                <p className="font-medium">{campus.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{campus.code}</p>
              </div>
            ),
          },
          {
            header: 'Type',
            className: 'whitespace-nowrap',
            cell: (campus) => <Badge variant="outline">{LOCATION_KIND_LABELS[campus.kind]}</Badge>,
          },
          {
            header: 'Address',
            cell: (campus) => (
              <div className="max-w-64">
                <p className="truncate" title={campus.address}>
                  {campus.address}
                </p>
                <p className="text-xs text-muted-foreground">
                  {cityName(campus.cityId)}
                  {campus.pinCode ? ` – ${campus.pinCode}` : ''}
                </p>
              </div>
            ),
          },
          {
            header: 'Contact',
            cell: (campus) => (
              <div className="text-xs">
                {campus.contactPerson ? <p className="font-medium">{campus.contactPerson}</p> : null}
                <p>{campus.phone}</p>
                <p className="text-muted-foreground">{campus.email}</p>
              </div>
            ),
          },
          ...(profile.usesSchoolClasses
            ? [
                {
                  header: 'Classes',
                  cell: (campus: Campus) => classCount(campus.id) ?? '…',
                  className: 'tabular text-right',
                },
              ]
            : []),
          {
            header: 'Status',
            cell: (campus) => (
              <StatusBadge tone={campus.status === 'active' ? 'success' : 'neutral'}>
                {campus.status === 'active' ? 'Active' : 'Inactive'}
              </StatusBadge>
            ),
          },
          {
            header: 'Actions',
            srOnlyHeader: true,
            className: 'text-right',
            cell: (campus) => (
              <RowActions
                label={campus.name}
                onEdit={
                  permissions.edit && canManageCampus(permissions, campus.id)
                    ? () => setEditor({ record: campus })
                    : null
                }
                onDelete={
                  permissions.delete && canManageCampus(permissions, campus.id) ? () => setDeleting(campus) : null
                }
              />
            ),
          },
        ]}
      />
      <RecordDialog
        open={editor !== null}
        title={editor?.record ? `Edit ${editor.record.name}` : 'Add Location'}
        description="Location codes appear on reports and ID cards."
        formId={FORM_ID}
        submitting={busy}
        submitLabel={editor?.record ? 'Save Location' : 'Add Location'}
        onClose={() => setEditor(null)}
      >
        {editor ? (
          <CampusForm
            campus={editor.record}
            kinds={profile.locationKinds}
            onBusy={setBusy}
            onDone={() => setEditor(null)}
          />
        ) : null}
      </RecordDialog>
      <DeleteRecordDialog
        record={deleting}
        title={`Delete ${deleting?.name ?? 'location'}?`}
        description="Locations that still have classes, academic structure entries, users, staff or students cannot be deleted."
        success="Location deleted"
        onCancel={() => setDeleting(null)}
        onDelete={async (campus) => {
          if (services) await services.institution.deleteCampus(campus.id);
        }}
      />
    </SectionCard>
  );
}

function CampusForm({
  campus,
  kinds,
  onBusy,
  onDone,
}: {
  campus: Campus | null;
  kinds: readonly LocationKind[];
  onBusy: (busy: boolean) => void;
  onDone: () => void;
}) {
  const services = useServices();
  const submit = useRecordSubmit();
  const {
    register,
    handleSubmit,
    trigger,
    setError,
    formState: { errors, isSubmitting, isValid },
  } = useForm<CampusInput>({
    resolver: zodResolver(campusSchema),
    ...LIVE_VALIDATION,
    defaultValues: campus
      ? {
          kind: campus.kind,
          name: campus.name,
          code: campus.code,
          address: campus.address,
          cityId: campus.cityId,
          pinCode: campus.pinCode,
          contactPerson: campus.contactPerson,
          phone: campus.phone,
          email: campus.email,
          status: campus.status,
        }
      : {
          kind: kinds[0] ?? 'campus',
          name: '',
          code: '',
          address: '',
          cityId: '',
          pinCode: '',
          contactPerson: '',
          phone: '',
          email: '',
          status: 'active',
        },
  });
  const kindOptions = campus && !kinds.includes(campus.kind) ? [campus.kind, ...kinds] : kinds;

  useReportBusy(isSubmitting, onBusy, isValid, trigger);

  const onSubmit = handleSubmit(async (values) => {
    if (!services) return;
    await submit({
      run: () =>
        campus ? services.institution.updateCampus(campus.id, values) : services.institution.createCampus(values),
      setError,
      fields: FIELDS,
      success: campus ? 'Location updated' : 'Location added',
      failure: campus ? 'Location not updated' : 'Location not added',
      onDone,
    });
  });

  return (
    <form id={FORM_ID} onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <FormField label="Location Type" error={errors.kind?.message} required>
        <Select {...register('kind')}>
          {kindOptions.map((kind) => (
            <option key={kind} value={kind}>
              {LOCATION_KIND_LABELS[kind]}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Name" error={errors.name?.message} required>
        <Input {...register('name')} />
      </FormField>
      <FormField label="Code" error={errors.code?.message} required hint="Capital letters, digits and hyphens.">
        <Input
          className="font-mono uppercase"
          {...register('code', { setValueAs: (value: string) => value.toUpperCase() })}
        />
      </FormField>
      <FormField label="Address" error={errors.address?.message} required className="sm:col-span-2">
        <Input {...register('address')} />
      </FormField>
      <FormField label="City" error={errors.cityId?.message} required>
        <Select {...register('cityId')}>
          <option value="">Select city</option>
          {ALL_CITIES.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}, {city.stateName}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="PIN Code" error={errors.pinCode?.message} required>
        <Input inputMode="numeric" maxLength={6} {...register('pinCode')} />
      </FormField>
      <FormField label="Contact Person" error={errors.contactPerson?.message} hint="Optional">
        {(control) => <IconInput icon={UserRound} {...control} {...register('contactPerson')} />}
      </FormField>
      <FormField label="Status" error={errors.status?.message} required>
        <Select {...register('status')}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </FormField>
      <FormField label="Phone" error={errors.phone?.message} required>
        {(control) => <IconInput icon={Phone} type="tel" {...control} {...register('phone')} />}
      </FormField>
      <FormField label="Email" error={errors.email?.message} required>
        {(control) => <IconInput icon={Mail} type="email" {...control} {...register('email')} />}
      </FormField>
    </form>
  );
}
