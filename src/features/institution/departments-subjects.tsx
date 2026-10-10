'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { BookOpen, Network, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorState } from '@/components/feedback/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input, Select } from '@/components/ui/input';
import { CLASS_LEVELS, classLevelName, SUBJECT_KIND_LABELS } from '@/config/institution';
import type { Department, Subject } from '@/domain/institution';
import {
  DeleteRecordDialog,
  RecordDialog,
  useRecordSubmit,
  useReportBusy,
  type EditorState,
} from '@/features/institution/record-dialog';
import type { SetupPermissions } from '@/features/institution/setup-config';
import { RowActions, SectionCard, SetupTable } from '@/features/institution/setup-ui';
import { departmentSchema, subjectSchema, type DepartmentInput, type SubjectInput } from '@/lib/validation/institution';
import { useServiceQuery, useServices } from '@/services/provider';
import { LIVE_VALIDATION } from '@/lib/validation/form-options';

const DEPARTMENT_FORM = 'department-form';
const SUBJECT_FORM = 'subject-form';
const toCode = (value: string) => value.toUpperCase();

export function DepartmentsPanel({ permissions }: { permissions: SetupPermissions }) {
  const services = useServices();
  const departments = useServiceQuery((s) => s.institution.listDepartments(), []);
  const [editor, setEditor] = useState<EditorState<Department>>(null);
  const [deleting, setDeleting] = useState<Department | null>(null);
  const [busy, setBusy] = useState(false);

  if (departments.error) return <ErrorState title="Departments could not be loaded" description={departments.error} />;

  return (
    <SectionCard
      icon={Network}
      title="Departments"
      description="Used when creating users and staff, and to group subjects."
      actions={
        permissions.create ? (
          <Button onClick={() => setEditor({ record: null })}>
            <Plus aria-hidden />
            Add Department
          </Button>
        ) : null
      }
    >
      <SetupTable
        caption="Departments"
        loading={departments.loading}
        rows={departments.data ?? []}
        getRowId={(item) => item.id}
        emptyTitle={departments.loading ? 'Loading departments' : 'No departments yet'}
        columns={[
          { header: 'Department', cell: (item) => <span className="font-medium">{item.name}</span> },
          { header: 'Code', cell: (item) => <span className="font-mono text-xs">{item.code}</span> },
          {
            header: 'Actions',
            srOnlyHeader: true,
            className: 'text-right',
            cell: (item) => (
              <RowActions
                label={item.name}
                onEdit={permissions.edit ? () => setEditor({ record: item }) : null}
                onDelete={permissions.delete ? () => setDeleting(item) : null}
              />
            ),
          },
        ]}
      />
      <RecordDialog
        open={editor !== null}
        title={editor?.record ? `Edit ${editor.record.name}` : 'Add Department'}
        formId={DEPARTMENT_FORM}
        submitting={busy}
        submitLabel={editor?.record ? 'Save Department' : 'Add Department'}
        onClose={() => setEditor(null)}
      >
        {editor ? <DepartmentForm record={editor.record} onBusy={setBusy} onDone={() => setEditor(null)} /> : null}
      </RecordDialog>
      <DeleteRecordDialog
        record={deleting}
        title={`Delete ${deleting?.name ?? 'department'}?`}
        description="Departments used by users, staff or subjects cannot be deleted."
        success="Department deleted"
        onCancel={() => setDeleting(null)}
        onDelete={async (item) => {
          if (services) await services.institution.deleteDepartment(item.id);
        }}
      />
    </SectionCard>
  );
}

function DepartmentForm({
  record,
  onBusy,
  onDone,
}: {
  record: Department | null;
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
  } = useForm<DepartmentInput>({
    resolver: zodResolver(departmentSchema),
    ...LIVE_VALIDATION,
    defaultValues: record ? { name: record.name, code: record.code } : { name: '', code: '' },
  });
  useReportBusy(isSubmitting, onBusy, isValid, trigger);

  const onSubmit = handleSubmit(async (values) => {
    if (!services) return;
    await submit({
      run: () =>
        record
          ? services.institution.updateDepartment(record.id, values)
          : services.institution.createDepartment(values),
      setError,
      fields: ['name', 'code'],
      success: record ? 'Department updated' : 'Department added',
      failure: record ? 'Department not updated' : 'Department not added',
      onDone,
    });
  });

  return (
    <form id={DEPARTMENT_FORM} onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <FormField label="Department Name" error={errors.name?.message} required>
        <Input {...register('name')} />
      </FormField>
      <FormField label="Code" error={errors.code?.message} required>
        <Input className="font-mono uppercase" {...register('code', { setValueAs: toCode })} />
      </FormField>
    </form>
  );
}

export function SubjectsPanel({ permissions }: { permissions: SetupPermissions }) {
  const services = useServices();
  const subjects = useServiceQuery((s) => s.institution.listSubjects(), []);
  const departments = useServiceQuery((s) => s.institution.listDepartments(), []);
  const [editor, setEditor] = useState<EditorState<Subject>>(null);
  const [deleting, setDeleting] = useState<Subject | null>(null);
  const [busy, setBusy] = useState(false);
  const departmentName = useMemo(
    () => new Map((departments.data ?? []).map((item) => [item.id, item.name])),
    [departments.data],
  );

  if (subjects.error) return <ErrorState title="Subjects could not be loaded" description={subjects.error} />;

  return (
    <SectionCard
      icon={BookOpen}
      title="Subjects"
      description="The subject catalogue used by timetables, examinations and report cards."
      actions={
        permissions.create ? (
          <Button onClick={() => setEditor({ record: null })}>
            <Plus aria-hidden />
            Add Subject
          </Button>
        ) : null
      }
    >
      <SetupTable
        caption="Subjects"
        loading={subjects.loading}
        rows={subjects.data ?? []}
        getRowId={(item) => item.id}
        emptyTitle={subjects.loading ? 'Loading subjects' : 'No subjects yet'}
        columns={[
          {
            header: 'Subject',
            cell: (item) => (
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{item.code}</p>
              </div>
            ),
          },
          { header: 'Type', cell: (item) => <Badge variant="neutral">{SUBJECT_KIND_LABELS[item.kind]}</Badge> },
          {
            header: 'Taught In',
            cell: (item) =>
              item.levelFrom === item.levelTo
                ? classLevelName(item.levelFrom)
                : `${classLevelName(item.levelFrom)} – ${classLevelName(item.levelTo)}`,
          },
          {
            header: 'Department',
            cell: (item) => (item.departmentId ? (departmentName.get(item.departmentId) ?? '—') : '—'),
          },
          {
            header: 'Actions',
            srOnlyHeader: true,
            className: 'text-right',
            cell: (item) => (
              <RowActions
                label={item.name}
                onEdit={permissions.edit ? () => setEditor({ record: item }) : null}
                onDelete={permissions.delete ? () => setDeleting(item) : null}
              />
            ),
          },
        ]}
      />
      <RecordDialog
        open={editor !== null}
        title={editor?.record ? `Edit ${editor.record.name}` : 'Add Subject'}
        formId={SUBJECT_FORM}
        submitting={busy}
        submitLabel={editor?.record ? 'Save Subject' : 'Add Subject'}
        onClose={() => setEditor(null)}
      >
        {editor ? (
          <SubjectForm
            record={editor.record}
            departments={departments.data ?? []}
            onBusy={setBusy}
            onDone={() => setEditor(null)}
          />
        ) : null}
      </RecordDialog>
      <DeleteRecordDialog
        record={deleting}
        title={`Delete ${deleting?.name ?? 'subject'}?`}
        description="The subject is removed from the catalogue."
        success="Subject deleted"
        onCancel={() => setDeleting(null)}
        onDelete={async (item) => {
          if (services) await services.institution.deleteSubject(item.id);
        }}
      />
    </SectionCard>
  );
}

function SubjectForm({
  record,
  departments,
  onBusy,
  onDone,
}: {
  record: Subject | null;
  departments: readonly Department[];
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
  } = useForm<SubjectInput>({
    resolver: zodResolver(subjectSchema),
    ...LIVE_VALIDATION,
    defaultValues: record
      ? {
          name: record.name,
          code: record.code,
          kind: record.kind,
          levelFrom: record.levelFrom,
          levelTo: record.levelTo,
          departmentId: record.departmentId ?? '',
        }
      : { name: '', code: '', kind: 'core', levelFrom: 1, levelTo: 10, departmentId: '' },
  });
  useReportBusy(isSubmitting, onBusy, isValid, trigger);

  const onSubmit = handleSubmit(async (values) => {
    if (!services) return;
    await submit({
      run: () =>
        record ? services.institution.updateSubject(record.id, values) : services.institution.createSubject(values),
      setError,
      fields: ['name', 'code', 'kind', 'levelFrom', 'levelTo', 'departmentId'],
      success: record ? 'Subject updated' : 'Subject added',
      failure: record ? 'Subject not updated' : 'Subject not added',
      onDone,
    });
  });

  const levelOptions = CLASS_LEVELS.map((level) => (
    <option key={level} value={level}>
      {classLevelName(level)}
    </option>
  ));

  return (
    <form id={SUBJECT_FORM} onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <FormField label="Subject Name" error={errors.name?.message} required>
        <Input {...register('name')} />
      </FormField>
      <FormField label="Code" error={errors.code?.message} required>
        <Input className="font-mono uppercase" {...register('code', { setValueAs: toCode })} />
      </FormField>
      <FormField label="Type" error={errors.kind?.message} required>
        <Select {...register('kind')}>
          {Object.entries(SUBJECT_KIND_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Department" error={errors.departmentId?.message} hint="Optional">
        <Select {...register('departmentId')}>
          <option value="">No department</option>
          {departments.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="From Class" error={errors.levelFrom?.message} required>
        <Select {...register('levelFrom', { valueAsNumber: true })}>{levelOptions}</Select>
      </FormField>
      <FormField label="To Class" error={errors.levelTo?.message} required>
        <Select {...register('levelTo', { valueAsNumber: true })}>{levelOptions}</Select>
      </FormField>
    </form>
  );
}
