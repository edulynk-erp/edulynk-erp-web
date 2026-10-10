'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarRange, CheckCircle2, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorState } from '@/components/feedback/states';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import type { AcademicYear } from '@/domain/institution';
import {
  DeleteRecordDialog,
  RecordDialog,
  useRecordSubmit,
  useReportBusy,
  type EditorState,
} from '@/features/institution/record-dialog';
import type { SetupPermissions } from '@/features/institution/setup-config';
import { RowActions, SectionCard, SetupTable } from '@/features/institution/setup-ui';
import { formatDate } from '@/lib/format/date';
import { academicYearSchema, type AcademicYearInput } from '@/lib/validation/institution';
import { describeError, useServiceQuery, useServices } from '@/services/provider';
import { LIVE_VALIDATION } from '@/lib/validation/form-options';

const FORM_ID = 'academic-year-form';
const FIELDS = ['label', 'startsOn', 'endsOn'];
const STATUS_TONE = { current: 'success', planned: 'info', closed: 'neutral' } as const;
const STATUS_LABEL = { current: 'Current', planned: 'Planned', closed: 'Closed' } as const;

export function AcademicYearsPanel({ permissions }: { permissions: SetupPermissions }) {
  const services = useServices();
  const toast = useToast();
  const years = useServiceQuery((s) => s.institution.listAcademicYears(), []);
  const [editor, setEditor] = useState<EditorState<AcademicYear>>(null);
  const [deleting, setDeleting] = useState<AcademicYear | null>(null);
  const [activating, setActivating] = useState<AcademicYear | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const current = years.data?.find((year) => year.status === 'current');

  const activate = async () => {
    if (!services || !activating) return;
    setPending(true);
    try {
      await services.institution.setCurrentAcademicYear(activating.id);
      toast.notify({ tone: 'success', title: `${activating.label} is now the current academic year` });
      setActivating(null);
    } catch (error) {
      toast.notify({ tone: 'error', title: 'Academic year not changed', description: describeError(error) });
    } finally {
      setPending(false);
    }
  };

  if (years.error) return <ErrorState title="Academic years could not be loaded" description={years.error} />;

  return (
    <SectionCard
      icon={CalendarRange}
      title="Academic Years"
      description="Indian academic years usually run April to March. The current year is the default in the header."
      actions={
        permissions.create ? (
          <Button onClick={() => setEditor({ record: null })}>
            <Plus aria-hidden />
            Plan Academic Year
          </Button>
        ) : null
      }
    >
      {!permissions.approve ? (
        <p className="mb-3 text-xs text-muted-foreground">
          Changing the current academic year needs the Approve permission, which your role does not have.
        </p>
      ) : null}
      <SetupTable
        caption="Academic years"
        loading={years.loading}
        rows={years.data ?? []}
        getRowId={(year) => year.id}
        emptyTitle={years.loading ? 'Loading academic years' : 'No academic years yet'}
        columns={[
          { header: 'Academic Year', cell: (year) => <span className="font-medium">{year.label}</span> },
          { header: 'Starts', cell: (year) => formatDate(year.startsOn) },
          { header: 'Ends', cell: (year) => formatDate(year.endsOn) },
          {
            header: 'Status',
            cell: (year) => <StatusBadge tone={STATUS_TONE[year.status]}>{STATUS_LABEL[year.status]}</StatusBadge>,
          },
          {
            header: 'Actions',
            srOnlyHeader: true,
            className: 'text-right',
            cell: (year) => (
              <RowActions
                label={`academic year ${year.label}`}
                onEdit={permissions.edit && year.status !== 'closed' ? () => setEditor({ record: year }) : null}
                onDelete={permissions.delete && year.status === 'planned' ? () => setDeleting(year) : null}
              >
                {year.status === 'planned' && permissions.approve ? (
                  <Button variant="outline" size="sm" onClick={() => setActivating(year)}>
                    <CheckCircle2 aria-hidden />
                    Make current
                  </Button>
                ) : null}
              </RowActions>
            ),
          },
        ]}
      />
      <RecordDialog
        open={editor !== null}
        title={editor?.record ? `Edit ${editor.record.label}` : 'Plan Academic Year'}
        description="Years cannot overlap. New years start as planned."
        formId={FORM_ID}
        submitting={busy}
        submitLabel={editor?.record ? 'Save Year' : 'Plan Year'}
        onClose={() => setEditor(null)}
      >
        {editor ? <YearForm year={editor.record} onBusy={setBusy} onDone={() => setEditor(null)} /> : null}
      </RecordDialog>
      <ConfirmDialog
        open={activating !== null}
        title={`Make ${activating?.label ?? 'this year'} the current academic year?`}
        description={`${current ? `${current.label} will be closed. ` : ''}Attendance, fees and the dashboard will default to the new year for everyone.`}
        confirmLabel="Make current"
        pending={pending}
        onCancel={() => setActivating(null)}
        onConfirm={() => void activate()}
      />
      <DeleteRecordDialog
        record={deleting}
        title={`Delete ${deleting?.label ?? 'academic year'}?`}
        description="Only planned years without sections or students can be deleted."
        success="Academic year deleted"
        onCancel={() => setDeleting(null)}
        onDelete={async (year) => {
          if (services) await services.institution.deleteAcademicYear(year.id);
        }}
      />
    </SectionCard>
  );
}

function YearForm({
  year,
  onBusy,
  onDone,
}: {
  year: AcademicYear | null;
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
  } = useForm<AcademicYearInput>({
    resolver: zodResolver(academicYearSchema),
    ...LIVE_VALIDATION,
    defaultValues: year
      ? { label: year.label, startsOn: year.startsOn, endsOn: year.endsOn }
      : { label: '', startsOn: '', endsOn: '' },
  });
  useReportBusy(isSubmitting, onBusy, isValid, trigger);

  const onSubmit = handleSubmit(async (values) => {
    if (!services) return;
    await submit({
      run: () =>
        year
          ? services.institution.updateAcademicYear(year.id, values)
          : services.institution.createAcademicYear(values),
      setError,
      fields: FIELDS,
      success: year ? 'Academic year updated' : 'Academic year planned',
      failure: year ? 'Academic year not updated' : 'Academic year not planned',
      onDone,
    });
  });

  return (
    <form id={FORM_ID} onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-3">
      <FormField label="Label" error={errors.label?.message} required hint="For example 2027–28.">
        <Input {...register('label')} />
      </FormField>
      <FormField label="Starts On" error={errors.startsOn?.message} required>
        <Input type="date" {...register('startsOn')} />
      </FormField>
      <FormField label="Ends On" error={errors.endsOn?.message} required>
        <Input type="date" {...register('endsOn')} />
      </FormField>
    </form>
  );
}
