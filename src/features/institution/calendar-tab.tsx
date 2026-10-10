'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarClock, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorState } from '@/components/feedback/states';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input, Label } from '@/components/ui/input';
import { SelectMenu } from '@/components/ui/select-menu';
import { Tabs } from '@/components/ui/tabs';
import { PERIOD_TYPE_LABELS } from '@/config/institution-types';
import type { AcademicTerm, InstitutionType, StructureSettings } from '@/domain/institution';
import { AcademicCalendarPanel } from '@/features/institution/academic-calendar';
import { AcademicYearsPanel } from '@/features/institution/academic-years';
import {
  DeleteRecordDialog,
  RecordDialog,
  useRecordSubmit,
  useReportBusy,
  type EditorState,
} from '@/features/institution/record-dialog';
import {
  CALENDAR_SECTIONS,
  institutionWidePermissions,
  type CalendarSection,
  type SetupPermissions,
} from '@/features/institution/setup-config';
import { RowActions, SectionCard, SetupTable } from '@/features/institution/setup-ui';
import { daysBetween, formatDate } from '@/lib/format/date';
import { academicTermSchema, type AcademicTermInput } from '@/lib/validation/institution';
import { useServiceQuery, useServices, useWorkspace } from '@/services/provider';
import { LIVE_VALIDATION } from '@/lib/validation/form-options';

const TERM_FORM = 'academic-term-form';

export function CalendarTab({
  institutionType,
  structure,
  section,
  onSectionChange,
  permissions,
}: {
  institutionType: InstitutionType;
  structure: StructureSettings;
  section: CalendarSection;
  onSectionChange: (section: CalendarSection) => void;
  permissions: SetupPermissions;
}) {
  const period = PERIOD_TYPE_LABELS[structure.periodType];
  const options = CALENDAR_SECTIONS.map((option) =>
    option.value === 'terms' ? { ...option, label: period.plural } : option,
  );
  const wide = institutionWidePermissions(permissions);
  return (
    <Tabs label="Academic calendar sections" value={section} options={options} onChange={onSectionChange}>
      {section === 'years' ? (
        <AcademicYearsPanel permissions={wide} />
      ) : section === 'terms' ? (
        <TermsPanel key={institutionType} structure={structure} permissions={wide} />
      ) : (
        <AcademicCalendarPanel permissions={permissions} />
      )}
    </Tabs>
  );
}

function TermsPanel({ structure, permissions }: { structure: StructureSettings; permissions: SetupPermissions }) {
  const services = useServices();
  const { workspace, years } = useWorkspace();
  const [yearId, setYearId] = useState('');
  const activeYearId = yearId || workspace?.academicYearId || years[0]?.id || '';
  const year = years.find((item) => item.id === activeYearId);
  const terms = useServiceQuery(
    (s) => (activeYearId ? s.institution.listAcademicTerms(activeYearId) : Promise.resolve([])),
    [activeYearId],
  );
  const [editor, setEditor] = useState<EditorState<AcademicTerm>>(null);
  const [deleting, setDeleting] = useState<AcademicTerm | null>(null);
  const [busy, setBusy] = useState(false);
  const period = PERIOD_TYPE_LABELS[structure.periodType];
  const closed = year?.status === 'closed';
  const count = terms.data?.length ?? 0;

  return (
    <SectionCard
      icon={CalendarClock}
      title={period.plural}
      description={`Dates of each ${period.singular.toLowerCase()} in the year. They must fall inside the academic year and cannot overlap.`}
      actions={
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="terms-year" className="text-xs text-muted-foreground">
              Year
            </Label>
            <SelectMenu
              id="terms-year"
              className="h-9 w-36"
              value={activeYearId}
              onValueChange={setYearId}
              options={years.map((item) => ({ value: item.id, label: item.label }))}
            />
          </div>
          {permissions.create && !closed ? (
            <Button onClick={() => setEditor({ record: null })} disabled={!year}>
              <Plus aria-hidden />
              Add {period.singular}
            </Button>
          ) : null}
        </div>
      }
    >
      {year ? (
        <p className="mb-3 text-xs text-muted-foreground">
          {year.label} runs {formatDate(year.startsOn)} – {formatDate(year.endsOn)}.{' '}
          {closed
            ? 'This year is closed, so its dates can no longer change.'
            : count !== structure.periodsPerYear
              ? `Your structure expects ${structure.periodsPerYear} ${(structure.periodsPerYear === 1 ? period.singular : period.plural).toLowerCase()} a year; ${count} ${count === 1 ? 'is' : 'are'} set up.`
              : null}
        </p>
      ) : null}
      {terms.error ? (
        <ErrorState title={`${period.plural} could not be loaded`} description={terms.error} />
      ) : (
        <SetupTable
          caption={`${period.plural} for ${year?.label ?? 'the selected year'}`}
          loading={terms.loading}
          rows={terms.data ?? []}
          getRowId={(term) => term.id}
          emptyTitle={
            terms.loading ? `Loading ${period.plural.toLowerCase()}` : `No ${period.plural.toLowerCase()} yet`
          }
          columns={[
            { header: 'Name', cell: (term) => <span className="font-medium">{term.name}</span> },
            { header: 'Starts', cell: (term) => formatDate(term.startsOn), className: 'whitespace-nowrap' },
            { header: 'Ends', cell: (term) => formatDate(term.endsOn), className: 'whitespace-nowrap' },
            {
              header: 'Length',
              cell: (term) => `${Math.round((daysBetween(term.startsOn, term.endsOn) + 1) / 7)} weeks`,
              className: 'tabular',
            },
            {
              header: 'Actions',
              srOnlyHeader: true,
              className: 'w-px text-right',
              cell: (term) => (
                <RowActions
                  label={term.name}
                  onEdit={permissions.edit && !closed ? () => setEditor({ record: term }) : null}
                  onDelete={permissions.delete && !closed ? () => setDeleting(term) : null}
                />
              ),
            },
          ]}
        />
      )}
      <RecordDialog
        open={editor !== null}
        title={editor?.record ? `Edit ${editor.record.name}` : `Add ${period.singular}`}
        description={year ? `Between ${formatDate(year.startsOn)} and ${formatDate(year.endsOn)}.` : undefined}
        formId={TERM_FORM}
        submitting={busy}
        submitLabel={editor?.record ? 'Save' : `Add ${period.singular}`}
        onClose={() => setEditor(null)}
      >
        {editor ? (
          <TermForm
            yearId={activeYearId}
            term={editor.record}
            nextName={`${period.singular} ${count + 1}`}
            onBusy={setBusy}
            onDone={() => setEditor(null)}
          />
        ) : null}
      </RecordDialog>
      <DeleteRecordDialog
        record={deleting}
        title={`Delete ${deleting?.name ?? period.singular.toLowerCase()}?`}
        description="The dates are removed from this academic year."
        success={`${period.singular} deleted`}
        onCancel={() => setDeleting(null)}
        onDelete={async (term) => {
          if (services) await services.institution.deleteAcademicTerm(term.id);
        }}
      />
    </SectionCard>
  );
}

function TermForm({
  yearId,
  term,
  nextName,
  onBusy,
  onDone,
}: {
  yearId: string;
  term: AcademicTerm | null;
  nextName: string;
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
  } = useForm<AcademicTermInput>({
    resolver: zodResolver(academicTermSchema),
    ...LIVE_VALIDATION,
    defaultValues: term
      ? { name: term.name, startsOn: term.startsOn, endsOn: term.endsOn }
      : { name: nextName, startsOn: '', endsOn: '' },
  });
  useReportBusy(isSubmitting, onBusy, isValid, trigger);
  const onSubmit = handleSubmit(async (values) => {
    if (!services) return;
    await submit({
      run: () =>
        term
          ? services.institution.updateAcademicTerm(term.id, values)
          : services.institution.createAcademicTerm(yearId, values),
      setError,
      fields: ['name', 'startsOn', 'endsOn'],
      success: term ? 'Dates updated' : 'Added to the calendar',
      failure: term ? 'Not updated' : 'Not added',
      onDone,
    });
  });
  return (
    <form id={TERM_FORM} onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-3">
      <FormField label="Name" error={errors.name?.message} required>
        <Input {...register('name')} />
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
