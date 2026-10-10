'use client';

import { SelectMenu } from '@/components/ui/select-menu';
import { zodResolver } from '@hookform/resolvers/zod';
import { Layers, Plus, School } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorState } from '@/components/feedback/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input, Label, Select } from '@/components/ui/input';
import { CLASS_LEVELS, classLevelName } from '@/config/institution';
import type { Campus, SchoolClass } from '@/domain/institution';
import {
  DeleteRecordDialog,
  RecordDialog,
  useRecordSubmit,
  useReportBusy,
  type EditorState,
} from '@/features/institution/record-dialog';
import type { SetupPermissions } from '@/features/institution/setup-config';
import { RowActions, SectionCard, SetupTable } from '@/features/institution/setup-ui';
import { formatCount } from '@/lib/format/number';
import { classSchema, sectionSchema, type ClassInput, type SectionInput } from '@/lib/validation/institution';
import type { SectionSummary } from '@/services/institution';
import { useServiceQuery, useServices, useWorkspace } from '@/services/provider';
import { LIVE_VALIDATION } from '@/lib/validation/form-options';

const CLASS_FORM = 'class-form';
const SECTION_FORM = 'section-form';

export function ClassesSectionsPanel({ permissions }: { permissions: SetupPermissions }) {
  const services = useServices();
  const { workspace, years } = useWorkspace();
  const campuses = useServiceQuery((s) => s.institution.listCampuses(), []);
  const classes = useServiceQuery((s) => s.institution.listClasses(), []);
  const [campusId, setCampusId] = useState('');
  const [yearId, setYearId] = useState('');
  const activeCampus = campusId || campuses.data?.[0]?.id || '';
  const activeYear = yearId || workspace?.academicYearId || '';
  const sections = useServiceQuery(
    (s) => (activeYear ? s.institution.listSections(activeYear) : Promise.resolve([])),
    [activeYear],
  );

  const [classEditor, setClassEditor] = useState<EditorState<SchoolClass>>(null);
  const [sectionEditor, setSectionEditor] = useState<EditorState<SectionSummary>>(null);
  const [deletingClass, setDeletingClass] = useState<SchoolClass | null>(null);
  const [deletingSection, setDeletingSection] = useState<SectionSummary | null>(null);
  const [busy, setBusy] = useState(false);

  const campusClasses = useMemo(
    () => (classes.data ?? []).filter((item) => item.campusId === activeCampus),
    [classes.data, activeCampus],
  );
  const className = useMemo(() => new Map((classes.data ?? []).map((item) => [item.id, item.name])), [classes.data]);
  const campusSections = (sections.data ?? []).filter((section) => section.campusId === activeCampus);
  const sectionCount = (classId: string) => campusSections.filter((section) => section.classId === classId).length;
  const yearLabel = years.find((year) => year.id === activeYear)?.label ?? '';
  const yearClosed = years.find((year) => year.id === activeYear)?.status === 'closed';

  if (classes.error || campuses.error) {
    return <ErrorState title="Classes could not be loaded" description={classes.error ?? campuses.error} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4">
        <div className="space-y-1.5">
          <Label htmlFor="classes-campus">Campus</Label>
          <SelectMenu
            id="classes-campus"
            className="h-9 w-52"
            value={activeCampus}
            onValueChange={setCampusId}
            options={(campuses.data ?? []).map((campus) => ({ value: campus.id, label: campus.name }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="classes-year">Academic Year (sections)</Label>
          <SelectMenu
            id="classes-year"
            className="h-9 w-52"
            value={activeYear}
            onValueChange={setYearId}
            options={years.map((year) => ({
              value: year.id,
              label: `${year.label}${year.status === 'current' ? ' (current)' : ''}`,
            }))}
          />
        </div>
      </div>

      <SectionCard
        icon={School}
        title="Classes"
        description="Classes are defined per campus and reused every academic year."
        actions={
          permissions.create ? (
            <Button onClick={() => setClassEditor({ record: null })}>
              <Plus aria-hidden />
              Add Class
            </Button>
          ) : null
        }
      >
        <SetupTable
          caption="Classes"
          loading={classes.loading}
          rows={campusClasses}
          getRowId={(item) => item.id}
          emptyTitle={classes.loading ? 'Loading classes' : 'No classes on this campus yet'}
          columns={[
            { header: 'Class', cell: (item) => <span className="font-medium">{item.name}</span> },
            { header: 'Level', cell: (item) => classLevelName(item.level) },
            {
              header: `Sections ${yearLabel}`.trim(),
              className: 'tabular',
              cell: (item) => (sections.data ? sectionCount(item.id) : '…'),
            },
            {
              header: 'Actions',
              srOnlyHeader: true,
              className: 'text-right',
              cell: (item) => (
                <RowActions
                  label={item.name}
                  onEdit={permissions.edit ? () => setClassEditor({ record: item }) : null}
                  onDelete={permissions.delete ? () => setDeletingClass(item) : null}
                />
              ),
            },
          ]}
        />
      </SectionCard>

      <SectionCard
        icon={Layers}
        title={`Sections${yearLabel ? ` · ${yearLabel}` : ''}`}
        description={
          yearClosed ? 'This academic year is closed; its sections are read-only.' : 'Sections and their seat capacity.'
        }
        actions={
          permissions.create && !yearClosed && campusClasses.length > 0 ? (
            <Button onClick={() => setSectionEditor({ record: null })}>
              <Plus aria-hidden />
              Add Section
            </Button>
          ) : null
        }
      >
        {sections.error ? (
          <ErrorState title="Sections could not be loaded" description={sections.error} />
        ) : (
          <SetupTable
            caption={`Sections for ${yearLabel}`}
            loading={sections.loading}
            rows={campusSections}
            getRowId={(section) => section.id}
            emptyTitle={sections.loading ? 'Loading sections' : 'No sections for this campus and year'}
            columns={[
              {
                header: 'Section',
                cell: (section) => (
                  <span className="font-medium">
                    {className.get(section.classId) ?? 'Class'} {section.name}
                  </span>
                ),
              },
              { header: 'Capacity', className: 'tabular', cell: (section) => formatCount(section.capacity) },
              {
                header: 'Enrolled',
                cell: (section) => (
                  <span className="flex items-center gap-2">
                    <span className="tabular">{formatCount(section.enrolled)}</span>
                    {section.enrolled >= section.capacity ? <Badge variant="warning">Full</Badge> : null}
                  </span>
                ),
              },
              {
                header: 'Actions',
                srOnlyHeader: true,
                className: 'text-right',
                cell: (section) => (
                  <RowActions
                    label={`section ${className.get(section.classId) ?? ''} ${section.name}`}
                    onEdit={permissions.edit && !yearClosed ? () => setSectionEditor({ record: section }) : null}
                    onDelete={permissions.delete && !yearClosed ? () => setDeletingSection(section) : null}
                  />
                ),
              },
            ]}
          />
        )}
      </SectionCard>

      <RecordDialog
        open={classEditor !== null}
        title={classEditor?.record ? `Edit ${classEditor.record.name}` : 'Add Class'}
        formId={CLASS_FORM}
        submitting={busy}
        submitLabel={classEditor?.record ? 'Save Class' : 'Add Class'}
        onClose={() => setClassEditor(null)}
      >
        {classEditor ? (
          <ClassForm
            record={classEditor.record}
            campuses={campuses.data ?? []}
            defaultCampusId={activeCampus}
            onBusy={setBusy}
            onDone={() => setClassEditor(null)}
          />
        ) : null}
      </RecordDialog>
      <RecordDialog
        open={sectionEditor !== null}
        title={sectionEditor?.record ? 'Edit Section' : `Add Section · ${yearLabel}`}
        formId={SECTION_FORM}
        submitting={busy}
        submitLabel={sectionEditor?.record ? 'Save Section' : 'Add Section'}
        onClose={() => setSectionEditor(null)}
      >
        {sectionEditor ? (
          <SectionForm
            record={sectionEditor.record}
            academicYearId={activeYear}
            classes={campusClasses}
            onBusy={setBusy}
            onDone={() => setSectionEditor(null)}
          />
        ) : null}
      </RecordDialog>
      <DeleteRecordDialog
        record={deletingClass}
        title={`Delete ${deletingClass?.name ?? 'class'}?`}
        description="Classes that still have sections or students cannot be deleted."
        success="Class deleted"
        onCancel={() => setDeletingClass(null)}
        onDelete={async (item) => {
          if (services) await services.institution.deleteClass(item.id);
        }}
      />
      <DeleteRecordDialog
        record={deletingSection}
        title="Delete this section?"
        description="Sections with enrolled students cannot be deleted."
        success="Section deleted"
        onCancel={() => setDeletingSection(null)}
        onDelete={async (section) => {
          if (services) await services.institution.deleteSection(section.id);
        }}
      />
    </div>
  );
}

function ClassForm({
  record,
  campuses,
  defaultCampusId,
  onBusy,
  onDone,
}: {
  record: SchoolClass | null;
  campuses: readonly Campus[];
  defaultCampusId: string;
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
    setValue,
    formState: { errors, isSubmitting, isValid, dirtyFields },
  } = useForm<ClassInput>({
    resolver: zodResolver(classSchema),
    ...LIVE_VALIDATION,
    defaultValues: record
      ? { campusId: record.campusId, level: record.level, name: record.name }
      : { campusId: defaultCampusId, level: 1, name: classLevelName(1) },
  });
  useReportBusy(isSubmitting, onBusy, isValid, trigger);

  const onSubmit = handleSubmit(async (values) => {
    if (!services) return;
    await submit({
      run: () =>
        record ? services.institution.updateClass(record.id, values) : services.institution.createClass(values),
      setError,
      fields: ['campusId', 'level', 'name'],
      success: record ? 'Class updated' : 'Class added',
      failure: record ? 'Class not updated' : 'Class not added',
      onDone,
    });
  });

  return (
    <form id={CLASS_FORM} onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-3">
      <FormField label="Campus" error={errors.campusId?.message} required>
        <Select {...register('campusId')}>
          {campuses.map((campus) => (
            <option key={campus.id} value={campus.id}>
              {campus.name}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Level" error={errors.level?.message} required>
        <Select
          {...register('level', {
            valueAsNumber: true,
            onChange: (event: { target: { value: string } }) => {
              if (!dirtyFields.name) setValue('name', classLevelName(Number(event.target.value)));
            },
          })}
        >
          {CLASS_LEVELS.map((level) => (
            <option key={level} value={level}>
              {classLevelName(level)}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Display Name" error={errors.name?.message} required>
        <Input {...register('name')} />
      </FormField>
    </form>
  );
}

function SectionForm({
  record,
  academicYearId,
  classes,
  onBusy,
  onDone,
}: {
  record: SectionSummary | null;
  academicYearId: string;
  classes: readonly SchoolClass[];
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
  } = useForm<SectionInput>({
    resolver: zodResolver(sectionSchema),
    ...LIVE_VALIDATION,
    defaultValues: record
      ? { classId: record.classId, name: record.name, capacity: record.capacity }
      : { classId: classes[0]?.id ?? '', name: '', capacity: 36 },
  });
  useReportBusy(isSubmitting, onBusy, isValid, trigger);

  const onSubmit = handleSubmit(async (values) => {
    if (!services) return;
    await submit({
      run: () =>
        record
          ? services.institution.updateSection(record.id, values)
          : services.institution.createSection(academicYearId, values),
      setError,
      fields: ['classId', 'name', 'capacity'],
      success: record ? 'Section updated' : 'Section added',
      failure: record ? 'Section not updated' : 'Section not added',
      onDone,
    });
  });

  return (
    <form id={SECTION_FORM} onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-3">
      <FormField label="Class" error={errors.classId?.message} required>
        <Select {...register('classId')}>
          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Section Name" error={errors.name?.message} required hint="For example A or Rose.">
        <Input maxLength={10} {...register('name')} />
      </FormField>
      <FormField
        label="Capacity"
        error={errors.capacity?.message}
        required
        hint={record ? `${record.enrolled} enrolled now.` : undefined}
      >
        <Input type="number" min={1} max={80} {...register('capacity', { valueAsNumber: true })} />
      </FormField>
    </form>
  );
}
