'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Info, Layers, PencilRuler, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { EmptyState, ErrorState } from '@/components/feedback/states';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input, Select } from '@/components/ui/input';
import { Tabs } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { COURSE_TYPE_LABELS, DURATION_UNIT_LABELS, PROGRAMME_LEVEL_LABELS } from '@/config/institution';
import {
  INSTITUTION_TYPE_LABELS,
  levelName,
  levelPlural,
  PERIOD_TYPE_LABELS,
  profileOf,
  type StructureLevel,
} from '@/config/institution-types';
import {
  PERIOD_TYPES,
  type AcademicUnit,
  type Campus,
  type Institution,
  type InstitutionType,
  type StructureSettings,
} from '@/domain/institution';
import { ClassesSectionsPanel } from '@/features/institution/classes-sections';
import { DepartmentsPanel, SubjectsPanel } from '@/features/institution/departments-subjects';
import {
  DeleteRecordDialog,
  RecordDialog,
  useRecordSubmit,
  useReportBusy,
  type EditorState,
} from '@/features/institution/record-dialog';
import {
  canManageCampus,
  institutionWidePermissions,
  STRUCTURE_SECTIONS,
  type SetupPermissions,
  type StructureSection,
} from '@/features/institution/setup-config';
import { RowActions, SectionCard, SetupTable } from '@/features/institution/setup-ui';
import { StructureUnitForm, UNIT_FORM_ID } from '@/features/institution/structure-unit-form';
import { formatDate } from '@/lib/format/date';
import { structureSettingsSchema, type StructureSettingsInput } from '@/lib/validation/institution';
import { describeError, useServiceQuery, useServices } from '@/services/provider';
import { LIVE_VALIDATION } from '@/lib/validation/form-options';

const SETTINGS_FORM_ID = 'structure-settings-form';

function sectionsFor(type: InstitutionType) {
  if (profileOf(type).usesSchoolClasses) {
    return [
      STRUCTURE_SECTIONS[1],
      STRUCTURE_SECTIONS[2],
      { value: 'structure' as const, label: 'Examinations' },
      { value: 'departments' as const, label: 'Departments' },
    ];
  }
  return [
    { value: 'structure' as const, label: 'Academic Structure' },
    { value: 'departments' as const, label: 'Staff Departments' },
  ];
}

export function AcademicStructureTab({
  institution,
  pendingType,
  section,
  onSectionChange,
  permissions,
}: {
  institution: Institution;
  /** A type selected on General Information but not saved yet. */
  pendingType: InstitutionType | null;
  section: StructureSection | null;
  onSectionChange: (section: StructureSection) => void;
  permissions: SetupPermissions;
}) {
  const type = institution.type;
  const options = sectionsFor(type);
  const current = options.find((option) => option.value === section)?.value ?? options[0]!.value;
  const wide = institutionWidePermissions(permissions);
  return (
    <div className="space-y-6">
      {pendingType ? (
        <p
          role="note"
          className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground"
        >
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          You selected {INSTITUTION_TYPE_LABELS[pendingType]} on General Information but have not saved it. This tab
          shows the saved {INSTITUTION_TYPE_LABELS[type]} structure until you save.
        </p>
      ) : null}
      <StructureOverview institution={institution} permissions={permissions} />
      <Tabs label="Academic structure sections" value={current} options={options} onChange={onSectionChange}>
        {current === 'classes' ? (
          <ClassesSectionsPanel permissions={permissions} />
        ) : current === 'subjects' ? (
          <SubjectsPanel permissions={wide} />
        ) : current === 'departments' ? (
          <DepartmentsPanel permissions={wide} />
        ) : (
          <StructureLevels institution={institution} permissions={permissions} />
        )}
      </Tabs>
    </div>
  );
}

/** The configuration flow for the type, plus the institution's own naming and period settings. */
function StructureOverview({ institution, permissions }: { institution: Institution; permissions: SetupPermissions }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const profile = profileOf(institution.type);
  const settings = institution.structure[institution.type];
  const period = PERIOD_TYPE_LABELS[settings.periodType];
  const flow = [
    ...(profile.usesSchoolClasses ? ['Classes', 'Sections', 'Subjects'] : []),
    ...profile.levels.map((level) => levelPlural(level, settings)),
  ];
  return (
    <SectionCard
      icon={Layers}
      title={`${profile.label} Structure`}
      description="How your academic structure nests. Rename levels and set how your year is divided to match your institution."
      actions={
        permissions.edit && permissions.institutionWide ? (
          <Button variant="outline" onClick={() => setEditing(true)}>
            <PencilRuler aria-hidden />
            Naming & Periods
          </Button>
        ) : null
      }
    >
      <ol className="flex flex-wrap items-center gap-2" aria-label="Structure levels">
        {flow.map((label, index) => (
          <li key={`${label}-${index}`} className="flex items-center gap-2">
            {index > 0 ? <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden /> : null}
            <Badge variant="outline" className="px-2.5 py-1 text-sm">
              {label}
            </Badge>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted-foreground">
        The academic year is divided into {settings.periodsPerYear}{' '}
        {(settings.periodsPerYear === 1 ? period.singular : period.plural).toLowerCase()}. Dates are set per year on the
        Academic Calendar tab.
      </p>
      <RecordDialog
        open={editing}
        title="Naming & Periods"
        description="Use the names your institution uses. Changes apply to this type's screens and summaries."
        formId={SETTINGS_FORM_ID}
        submitting={busy}
        submitLabel="Save Settings"
        onClose={() => setEditing(false)}
      >
        {editing ? (
          <StructureSettingsForm institution={institution} onBusy={setBusy} onDone={() => setEditing(false)} />
        ) : null}
      </RecordDialog>
    </SectionCard>
  );
}

function StructureSettingsForm({
  institution,
  onBusy,
  onDone,
}: {
  institution: Institution;
  onBusy: (busy: boolean) => void;
  onDone: () => void;
}) {
  const services = useServices();
  const submit = useRecordSubmit();
  const type = institution.type;
  const profile = profileOf(type);
  const current = institution.structure[type];
  const {
    register,
    handleSubmit,
    trigger,
    setError,
    formState: { errors, isSubmitting, isValid },
  } = useForm<StructureSettingsInput>({
    resolver: zodResolver(structureSettingsSchema),
    ...LIVE_VALIDATION,
    defaultValues: {
      labels: { ...current.labels },
      periodType: current.periodType,
      periodsPerYear: current.periodsPerYear,
    },
  });
  useReportBusy(isSubmitting, onBusy, isValid, trigger);
  const onSubmit = handleSubmit(async (values) => {
    if (!services) return;
    await submit({
      run: () => services.institution.updateStructureSettings(type, values),
      setError,
      fields: ['labels', 'periodType', 'periodsPerYear'],
      success: 'Structure settings saved',
      failure: 'Structure settings not saved',
      onDone,
    });
  });
  return (
    <form id={SETTINGS_FORM_ID} onSubmit={onSubmit} noValidate className="space-y-5">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-medium">Level names</legend>
        {profile.levels.map((level) => (
          <FormField
            key={level.kind}
            label={`Name for "${level.singular}"`}
            error={errors.labels?.[level.kind]?.message}
            hint="Leave blank to use the default."
          >
            <Input placeholder={level.singular} {...register(`labels.${level.kind}`)} />
          </FormField>
        ))}
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-medium">Academic periods</legend>
        <FormField label="Year Divided Into" error={errors.periodType?.message} required>
          <Select {...register('periodType')}>
            {PERIOD_TYPES.map((value) => (
              <option key={value} value={value}>
                {PERIOD_TYPE_LABELS[value].plural}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Periods per Year" error={errors.periodsPerYear?.message} required>
          <Input type="number" min={1} max={6} {...register('periodsPerYear', { valueAsNumber: true })} />
        </FormField>
      </fieldset>
    </form>
  );
}

function StructureLevels({ institution, permissions }: { institution: Institution; permissions: SetupPermissions }) {
  const services = useServices();
  const toast = useToast();
  const units = useServiceQuery((s) => s.institution.listAcademicUnits(), []);
  const campuses = useServiceQuery((s) => s.institution.listCampuses(), []);
  const [confirmTemplate, setConfirmTemplate] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const type = institution.type;
  const profile = profileOf(type);

  if (units.error) {
    return (
      <ErrorState
        title="The academic structure could not be loaded"
        description={units.error}
        action={
          <Button variant="outline" onClick={units.reload}>
            Try again
          </Button>
        }
      />
    );
  }

  const all = units.data ?? [];
  const own = all.filter((unit) => unit.institutionType === type);
  const kept = new Map<InstitutionType, number>();
  for (const unit of all) {
    if (unit.institutionType !== type) kept.set(unit.institutionType, (kept.get(unit.institutionType) ?? 0) + 1);
  }
  const canTemplate = !profile.usesSchoolClasses && permissions.create && permissions.institutionWide;

  const loadTemplate = async () => {
    if (!services) return;
    setLoadingTemplate(true);
    try {
      const count = await services.institution.applyStructureTemplate();
      toast.notify({
        tone: 'success',
        title: 'Starter structure loaded',
        description: `${count} entries added. Rename, edit or delete them to match your institution.`,
      });
      setConfirmTemplate(false);
    } catch (error) {
      toast.notify({ tone: 'error', title: 'Starter structure not loaded', description: describeError(error) });
    } finally {
      setLoadingTemplate(false);
    }
  };

  return (
    <div className="space-y-6">
      {kept.size > 0 ? (
        <p role="note" className="flex items-start gap-2 rounded-md border bg-muted/50 px-4 py-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          {[...kept]
            .map(
              ([keptType, count]) =>
                `${count} ${INSTITUTION_TYPE_LABELS[keptType]} entr${count === 1 ? 'y is' : 'ies are'}`,
            )
            .join(' and ')}{' '}
          kept from an earlier institution type. They are hidden here and come back if you switch the type back.
        </p>
      ) : null}
      {!units.loading && own.length === 0 && !profile.usesSchoolClasses ? (
        <EmptyState
          title={`Set up your ${profile.label.toLowerCase()} structure`}
          description={
            canTemplate
              ? 'Start from a typical structure and adapt it, or add entries level by level below.'
              : 'Nothing has been added yet.'
          }
          action={
            canTemplate ? (
              <Button onClick={() => setConfirmTemplate(true)}>
                <Sparkles aria-hidden />
                Load Starter Structure
              </Button>
            ) : undefined
          }
        />
      ) : null}
      {profile.levels.map((level) => (
        <LevelPanel
          key={level.kind}
          type={type}
          level={level}
          units={own}
          loading={units.loading}
          campuses={campuses.data ?? []}
          institution={institution}
          permissions={permissions}
        />
      ))}
      <ConfirmDialog
        open={confirmTemplate}
        title="Load the starter structure?"
        description={`Adds typical ${profile.label} entries (${profile.levels.map((level) => level.plural.toLowerCase()).join(', ')}) that you can then rename, edit or delete.`}
        confirmLabel="Load structure"
        pending={loadingTemplate}
        onCancel={() => setConfirmTemplate(false)}
        onConfirm={() => void loadTemplate()}
      />
    </div>
  );
}

function describeUnit(
  unit: AcademicUnit,
  level: StructureLevel,
  units: readonly AcademicUnit[],
  campuses: readonly Campus[],
  settings: StructureSettings,
) {
  const parts: string[] = [];
  const has = (field: (typeof level.fields)[number]) => level.fields.includes(field);
  if (has('degree') && unit.degree) parts.push(unit.degree);
  if (has('programmeLevel') && unit.programmeLevel) parts.push(PROGRAMME_LEVEL_LABELS[unit.programmeLevel]);
  if (has('duration') && unit.durationValue && unit.durationUnit) {
    parts.push(`${unit.durationValue} ${DURATION_UNIT_LABELS[unit.durationUnit].toLowerCase()}`);
  }
  if (has('periods') && unit.periods) {
    const period = PERIOD_TYPE_LABELS[settings.periodType];
    parts.push(`${unit.periods} ${(unit.periods === 1 ? period.singular : period.plural).toLowerCase()}`);
  }
  if (has('courseType') && unit.courseType) parts.push(COURSE_TYPE_LABELS[unit.courseType]);
  if (has('credits') && unit.credits !== null) parts.push(`${unit.credits} credits`);
  if (has('capacity') && unit.capacity) parts.push(`${unit.capacity} seats`);
  if (has('marks') && unit.maxMarks) parts.push(`${unit.maxMarks} marks`);
  if (has('weightage') && unit.weightage !== null) parts.push(`${unit.weightage}% weight`);
  if (has('dates') && unit.startsOn && unit.endsOn)
    parts.push(`${formatDate(unit.startsOn)} – ${formatDate(unit.endsOn)}`);
  if (has('schedule') && unit.schedule) parts.push(unit.schedule);
  if (has('research') && unit.research) parts.push('Research');
  if (has('practical') && unit.practical) parts.push('Practical');
  if (has('members') && unit.memberIds.length) {
    parts.push(unit.memberIds.map((id) => units.find((item) => item.id === id)?.name ?? '?').join(', '));
  }
  if (has('campus')) parts.push(campuses.find((campus) => campus.id === unit.campusId)?.name ?? 'All locations');
  return parts.join(' · ') || '—';
}

function LevelPanel({
  type,
  level,
  units,
  loading,
  campuses,
  institution,
  permissions,
}: {
  type: InstitutionType;
  level: StructureLevel;
  units: readonly AcademicUnit[];
  loading: boolean;
  campuses: readonly Campus[];
  institution: Institution;
  permissions: SetupPermissions;
}) {
  const services = useServices();
  const [editor, setEditor] = useState<EditorState<AcademicUnit>>(null);
  const [deleting, setDeleting] = useState<AcademicUnit | null>(null);
  const [busy, setBusy] = useState(false);
  const [parentFilter, setParentFilter] = useState('');
  const settings = institution.structure[type];
  const name = levelName(level, settings);
  const parents = units.filter((unit) => level.parents.includes(unit.kind));
  const rows = units.filter((unit) => unit.kind === level.kind && (!parentFilter || unit.parentId === parentFilter));
  const scoped = level.fields.includes('campus');
  const canCreate = permissions.create && (permissions.institutionWide || scoped);
  const blockedByParent = level.parentRequired && parents.length === 0;
  const canChange = (unit: AcademicUnit) => canManageCampus(permissions, unit.campusId);
  const parentLevels = profileOf(type).levels.filter((candidate) => level.parents.includes(candidate.kind));
  const parentLabel = parentLevels.map((parentLevel) => levelName(parentLevel, settings)).join(' / ');
  const parentPlural = parentLevels.map((parentLevel) => levelPlural(parentLevel, settings)).join(' / ');

  return (
    <SectionCard
      icon={Layers}
      title={levelPlural(level, settings)}
      description={level.description}
      actions={
        <>
          {parents.length > 1 ? (
            <Select
              aria-label={`Filter by ${parentLabel}`}
              value={parentFilter}
              onChange={(event) => setParentFilter(event.target.value)}
              className="h-9 w-48"
            >
              <option value="">All {parentPlural.toLowerCase()}</option>
              {parents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.name}
                </option>
              ))}
            </Select>
          ) : null}
          {canCreate ? (
            <Button onClick={() => setEditor({ record: null })} disabled={blockedByParent}>
              <Plus aria-hidden />
              Add {name}
            </Button>
          ) : null}
        </>
      }
    >
      {canCreate && blockedByParent ? (
        <p className="mb-3 text-xs text-muted-foreground">Add a {parentLabel.toLowerCase()} first.</p>
      ) : null}
      <SetupTable
        caption={levelPlural(level, settings)}
        loading={loading}
        rows={rows}
        getRowId={(unit) => unit.id}
        emptyTitle={
          loading
            ? `Loading ${levelPlural(level, settings).toLowerCase()}`
            : `No ${levelPlural(level, settings).toLowerCase()} yet`
        }
        columns={[
          {
            header: name,
            cell: (unit) => (
              <div>
                <p className="font-medium">{unit.name}</p>
                {unit.code ? <p className="font-mono text-xs text-muted-foreground">{unit.code}</p> : null}
              </div>
            ),
          },
          ...(level.parents.length > 0
            ? [
                {
                  header: parentLabel,
                  cell: (unit: AcademicUnit) => units.find((item) => item.id === unit.parentId)?.name ?? '—',
                },
              ]
            : []),
          {
            header: 'Details',
            cell: (unit) => (
              <span className="text-xs text-muted-foreground">
                {describeUnit(unit, level, units, campuses, settings)}
              </span>
            ),
          },
          {
            header: 'Status',
            cell: (unit) => (
              <StatusBadge tone={unit.status === 'active' ? 'success' : 'neutral'}>
                {unit.status === 'active' ? 'Active' : 'Inactive'}
              </StatusBadge>
            ),
          },
          {
            header: 'Actions',
            srOnlyHeader: true,
            className: 'w-px text-right',
            cell: (unit) => (
              <RowActions
                label={unit.name}
                onEdit={permissions.edit && canChange(unit) ? () => setEditor({ record: unit }) : null}
                onDelete={permissions.delete && canChange(unit) ? () => setDeleting(unit) : null}
              />
            ),
          },
        ]}
      />
      <RecordDialog
        open={editor !== null}
        title={editor?.record ? `Edit ${editor.record.name}` : `Add ${name}`}
        description={level.description}
        formId={UNIT_FORM_ID}
        submitting={busy}
        submitLabel={editor?.record ? `Save ${name}` : `Add ${name}`}
        onClose={() => setEditor(null)}
      >
        {editor ? (
          <StructureUnitForm
            type={type}
            level={level}
            unit={editor.record}
            defaultParentId={parentFilter || (parents.length === 1 ? parents[0]!.id : '')}
            units={units}
            campuses={campuses}
            settings={settings}
            onBusy={setBusy}
            onDone={() => setEditor(null)}
          />
        ) : null}
      </RecordDialog>
      <DeleteRecordDialog
        record={deleting}
        title={`Delete ${deleting?.name ?? name}?`}
        description="Entries with other entries under them, or used in a subject combination, cannot be deleted."
        success={`${name} deleted`}
        onCancel={() => setDeleting(null)}
        onDelete={async (unit) => {
          if (services) await services.institution.deleteAcademicUnit(unit.id);
        }}
      />
    </SectionCard>
  );
}
