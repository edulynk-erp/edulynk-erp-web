'use client';

import { SelectMenu } from '@/components/ui/select-menu';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarDays, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorState } from '@/components/feedback/states';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input, Label, Select } from '@/components/ui/input';
import { EVENT_KIND_LABELS } from '@/config/institution';
import type { CalendarEvent } from '@/domain/communication';
import type { Campus } from '@/domain/institution';
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
import { calendarEventSchema, type CalendarEventInput } from '@/lib/validation/institution';
import { useServiceQuery, useServices, useWorkspace } from '@/services/provider';
import { LIVE_VALIDATION } from '@/lib/validation/form-options';

const FORM_ID = 'calendar-event-form';
const KIND_TONE = { event: 'info', examination: 'warning', holiday: 'success', meeting: 'neutral' } as const;

export function AcademicCalendarPanel({ permissions }: { permissions: SetupPermissions }) {
  const services = useServices();
  const { workspace, years } = useWorkspace();
  const campuses = useServiceQuery((s) => s.institution.listCampuses(), []);
  const [yearId, setYearId] = useState('');
  const activeYear = yearId || workspace?.academicYearId || '';
  const events = useServiceQuery(
    (s) => (activeYear ? s.institution.listCalendarEvents(activeYear) : Promise.resolve([])),
    [activeYear],
  );
  const [editor, setEditor] = useState<EditorState<CalendarEvent>>(null);
  const [deleting, setDeleting] = useState<CalendarEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const campusName = (id: string) =>
    id === 'all' ? 'All campuses' : (campuses.data?.find((campus) => campus.id === id)?.name ?? '—');

  return (
    <SectionCard
      icon={CalendarDays}
      title="Academic Calendar"
      description="Holidays, examinations, meetings and events. Upcoming entries also appear on the dashboard."
      actions={
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="calendar-year" className="text-xs text-muted-foreground">
              Year
            </Label>
            <SelectMenu
              id="calendar-year"
              className="h-9 w-36"
              value={activeYear}
              onValueChange={setYearId}
              options={years.map((year) => ({ value: year.id, label: year.label }))}
            />
          </div>
          {permissions.create ? (
            <Button onClick={() => setEditor({ record: null })}>
              <Plus aria-hidden />
              Add Entry
            </Button>
          ) : null}
        </div>
      }
    >
      {events.error ? (
        <ErrorState title="The calendar could not be loaded" description={events.error} />
      ) : (
        <SetupTable
          caption="Academic calendar entries"
          loading={events.loading}
          rows={events.data ?? []}
          getRowId={(item) => item.id}
          emptyTitle={events.loading ? 'Loading calendar' : 'No calendar entries for this year'}
          columns={[
            {
              header: 'Date',
              cell: (item) =>
                item.startsOn === item.endsOn
                  ? formatDate(item.startsOn)
                  : `${formatDate(item.startsOn)} – ${formatDate(item.endsOn)}`,
              className: 'whitespace-nowrap',
            },
            { header: 'Title', cell: (item) => <span className="font-medium">{item.title}</span> },
            {
              header: 'Type',
              cell: (item) => <StatusBadge tone={KIND_TONE[item.kind]}>{EVENT_KIND_LABELS[item.kind]}</StatusBadge>,
            },
            { header: 'Campus', cell: (item) => campusName(item.campusId) },
            { header: 'Audience', cell: (item) => item.audience },
            {
              header: 'Actions',
              srOnlyHeader: true,
              className: 'text-right',
              cell: (item) => (
                <RowActions
                  label={item.title}
                  onEdit={permissions.edit ? () => setEditor({ record: item }) : null}
                  onDelete={permissions.delete ? () => setDeleting(item) : null}
                />
              ),
            },
          ]}
        />
      )}
      <RecordDialog
        open={editor !== null}
        title={editor?.record ? 'Edit Calendar Entry' : 'Add Calendar Entry'}
        formId={FORM_ID}
        submitting={busy}
        submitLabel={editor?.record ? 'Save Entry' : 'Add Entry'}
        onClose={() => setEditor(null)}
      >
        {editor ? (
          <EventForm
            record={editor.record}
            campuses={campuses.data ?? []}
            onBusy={setBusy}
            onDone={() => setEditor(null)}
          />
        ) : null}
      </RecordDialog>
      <DeleteRecordDialog
        record={deleting}
        title={`Delete "${deleting?.title ?? 'entry'}"?`}
        description="The entry is removed from the academic calendar and the dashboard."
        success="Calendar entry deleted"
        onCancel={() => setDeleting(null)}
        onDelete={async (item) => {
          if (services) await services.institution.deleteCalendarEvent(item.id);
        }}
      />
    </SectionCard>
  );
}

function EventForm({
  record,
  campuses,
  onBusy,
  onDone,
}: {
  record: CalendarEvent | null;
  campuses: readonly Campus[];
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
  } = useForm<CalendarEventInput>({
    resolver: zodResolver(calendarEventSchema),
    ...LIVE_VALIDATION,
    defaultValues: record
      ? {
          title: record.title,
          kind: record.kind,
          startsOn: record.startsOn,
          endsOn: record.endsOn,
          campusId: record.campusId,
          audience: record.audience,
        }
      : { title: '', kind: 'event', startsOn: '', endsOn: '', campusId: 'all', audience: 'Whole school' },
  });
  useReportBusy(isSubmitting, onBusy, isValid, trigger);

  const onSubmit = handleSubmit(async (values) => {
    if (!services) return;
    await submit({
      run: () =>
        record
          ? services.institution.updateCalendarEvent(record.id, values)
          : services.institution.createCalendarEvent(values),
      setError,
      fields: ['title', 'kind', 'startsOn', 'endsOn', 'campusId', 'audience'],
      success: record ? 'Calendar entry updated' : 'Calendar entry added',
      failure: record ? 'Calendar entry not updated' : 'Calendar entry not added',
      onDone,
    });
  });

  return (
    <form id={FORM_ID} onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <FormField label="Title" error={errors.title?.message} required className="sm:col-span-2">
        <Input {...register('title')} />
      </FormField>
      <FormField label="Type" error={errors.kind?.message} required>
        <Select {...register('kind')}>
          {Object.entries(EVENT_KIND_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Campus" error={errors.campusId?.message} required>
        <Select {...register('campusId')}>
          <option value="all">All campuses</option>
          {campuses.map((campus) => (
            <option key={campus.id} value={campus.id}>
              {campus.name}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Starts On" error={errors.startsOn?.message} required>
        <Input type="date" {...register('startsOn')} />
      </FormField>
      <FormField label="Ends On" error={errors.endsOn?.message} required>
        <Input type="date" {...register('endsOn')} />
      </FormField>
      <FormField label="Audience" error={errors.audience?.message} required className="sm:col-span-2">
        <Input {...register('audience')} />
      </FormField>
    </form>
  );
}
