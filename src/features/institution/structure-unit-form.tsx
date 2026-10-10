'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { useForm, type RegisterOptions } from 'react-hook-form';
import { Checkbox, Switch } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { Input, Select } from '@/components/ui/input';
import { COURSE_TYPE_LABELS, DURATION_UNIT_LABELS, PROGRAMME_LEVEL_LABELS } from '@/config/institution';
import {
  levelName,
  levelOf,
  PERIOD_TYPE_LABELS,
  type StructureLevel,
  type UnitField,
} from '@/config/institution-types';
import type { AcademicUnit, Campus, InstitutionType, StructureSettings } from '@/domain/institution';
import { useRecordSubmit, useReportBusy } from '@/features/institution/record-dialog';
import { academicUnitSchemaFor, EMPTY_UNIT_INPUT, type AcademicUnitInput } from '@/lib/validation/institution';
import { useServices } from '@/services/provider';
import { LIVE_VALIDATION } from '@/lib/validation/form-options';

export const UNIT_FORM_ID = 'structure-unit-form';
const FIELDS = Object.keys(EMPTY_UNIT_INPUT);

const asNumber = { setValueAs: (value: unknown) => (value === '' || value === null ? null : Number(value)) };
const asOptional = { setValueAs: (value: unknown) => (value === '' ? null : value) };
const asCode = { setValueAs: (value: unknown) => String(value ?? '').toUpperCase() };

export function unitInputOf(unit: AcademicUnit): AcademicUnitInput {
  return {
    kind: unit.kind,
    parentId: unit.parentId ?? '',
    name: unit.name,
    code: unit.code,
    campusId: unit.campusId ?? '',
    status: unit.status,
    durationValue: unit.durationValue,
    durationUnit: unit.durationUnit,
    periods: unit.periods,
    credits: unit.credits,
    courseType: unit.courseType,
    programmeLevel: unit.programmeLevel,
    degree: unit.degree,
    research: unit.research,
    practical: unit.practical,
    capacity: unit.capacity,
    startsOn: unit.startsOn ?? '',
    endsOn: unit.endsOn ?? '',
    schedule: unit.schedule,
    maxMarks: unit.maxMarks,
    weightage: unit.weightage,
    memberIds: [...unit.memberIds],
  };
}

/** Create or edit one structure entry. The fields shown and required come from the level's definition. */
export function StructureUnitForm({
  type,
  level,
  unit,
  defaultParentId,
  units,
  campuses,
  settings,
  onBusy,
  onDone,
}: {
  type: InstitutionType;
  level: StructureLevel;
  unit: AcademicUnit | null;
  defaultParentId: string;
  /** Entries of the current type, for the parent and member pickers. */
  units: readonly AcademicUnit[];
  campuses: readonly Campus[];
  settings: StructureSettings;
  onBusy: (busy: boolean) => void;
  onDone: () => void;
}) {
  const services = useServices();
  const submit = useRecordSubmit();
  const schema = useMemo(() => academicUnitSchemaFor(type), [type]);
  const {
    register,
    handleSubmit,
    trigger,
    setError,
    formState: { errors, isSubmitting, isValid },
  } = useForm<AcademicUnitInput>({
    resolver: zodResolver(schema),
    ...LIVE_VALIDATION,
    defaultValues: unit
      ? unitInputOf(unit)
      : { ...EMPTY_UNIT_INPUT, kind: level.kind, parentId: defaultParentId, memberIds: [] },
  });
  useReportBusy(isSubmitting, onBusy, isValid, trigger);

  const has = (field: UnitField) => level.fields.includes(field);
  const needs = (field: UnitField) => level.required.includes(field);
  const name = levelName(level, settings);
  const parents = units.filter((item) => level.parents.includes(item.kind) && item.id !== unit?.id);
  const subjects = units.filter((item) => item.kind === 'subject');
  const period = PERIOD_TYPE_LABELS[settings.periodType];

  const onSubmit = handleSubmit(async (values) => {
    if (!services) return;
    await submit({
      run: () =>
        unit
          ? services.institution.updateAcademicUnit(unit.id, values)
          : services.institution.createAcademicUnit(values),
      setError,
      fields: FIELDS,
      success: unit ? `${name} updated` : `${name} added`,
      failure: unit ? `${name} not updated` : `${name} not added`,
      onDone,
    });
  });

  const numberField = (
    field: 'durationValue' | 'periods' | 'credits' | 'capacity' | 'maxMarks' | 'weightage',
    label: string,
    required: boolean,
    props: { min?: number; max?: number; step?: number; hint?: string } = {},
  ) => (
    <FormField label={label} error={errors[field]?.message} required={required} hint={props.hint}>
      <Input
        type="number"
        inputMode="decimal"
        min={props.min}
        max={props.max}
        step={props.step}
        {...register(field, asNumber as RegisterOptions<AcademicUnitInput, typeof field>)}
      />
    </FormField>
  );

  return (
    <form id={UNIT_FORM_ID} onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <FormField label={`${name} Name`} error={errors.name?.message} required>
        <Input {...register('name')} />
      </FormField>
      {has('code') ? (
        <FormField label="Code" error={errors.code?.message} required={needs('code')} hint="Capital letters, digits, -">
          <Input className="font-mono uppercase" maxLength={16} {...register('code', asCode)} />
        </FormField>
      ) : null}
      {level.parents.length > 0 ? (
        <FormField
          label={level.parents.map((kind) => levelName(levelOf(type, kind)!, settings)).join(' / ')}
          error={errors.parentId?.message}
          required={level.parentRequired}
        >
          <Select {...register('parentId')}>
            <option value="">{level.parentRequired ? 'Select' : 'None (top level)'}</option>
            {parents.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.code ? ` (${item.code})` : ''}
              </option>
            ))}
          </Select>
        </FormField>
      ) : null}
      {has('degree') ? (
        <FormField label="Degree" error={errors.degree?.message} required={needs('degree')} hint="For example B.Sc.">
          <Input {...register('degree')} />
        </FormField>
      ) : null}
      {has('programmeLevel') ? (
        <FormField label="Level" error={errors.programmeLevel?.message} required={needs('programmeLevel')}>
          <Select {...register('programmeLevel', asOptional)}>
            <option value="">Select level</option>
            {Object.entries(PROGRAMME_LEVEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormField>
      ) : null}
      {has('duration') ? (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
          {numberField('durationValue', 'Duration', needs('duration'), { min: 1, max: 120 })}
          <FormField label="Unit" error={errors.durationUnit?.message} required={needs('duration')}>
            <Select {...register('durationUnit', asOptional)}>
              <option value="">Select</option>
              {Object.entries(DURATION_UNIT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      ) : null}
      {has('periods')
        ? numberField('periods', `Number of ${period.plural}`, needs('periods'), {
            min: 1,
            max: 24,
            hint: 'Across the whole programme.',
          })
        : null}
      {has('courseType') ? (
        <FormField label="Type" error={errors.courseType?.message} required={needs('courseType')}>
          <Select {...register('courseType', asOptional)}>
            <option value="">Select type</option>
            {Object.entries(COURSE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormField>
      ) : null}
      {has('credits') ? numberField('credits', 'Credits', needs('credits'), { min: 0, max: 60, step: 0.5 }) : null}
      {has('capacity') ? numberField('capacity', 'Seats / Intake', needs('capacity'), { min: 1 }) : null}
      {has('marks') ? numberField('maxMarks', 'Maximum Marks', needs('marks'), { min: 1, max: 1000 }) : null}
      {has('weightage')
        ? numberField('weightage', 'Weightage (%)', needs('weightage'), {
            min: 0,
            max: 100,
            hint: 'Share of the final result.',
          })
        : null}
      {has('campus') ? (
        <FormField label="Campus / Location" error={errors.campusId?.message} required={needs('campus')}>
          <Select {...register('campusId')}>
            <option value="">{needs('campus') ? 'Select location' : 'All locations'}</option>
            {campuses.map((campus) => (
              <option key={campus.id} value={campus.id}>
                {campus.name}
              </option>
            ))}
          </Select>
        </FormField>
      ) : null}
      {has('dates') ? (
        <>
          <FormField label="Starts On" error={errors.startsOn?.message} required={needs('dates')}>
            <Input type="date" {...register('startsOn')} />
          </FormField>
          <FormField label="Ends On" error={errors.endsOn?.message} required={needs('dates')}>
            <Input type="date" {...register('endsOn')} />
          </FormField>
        </>
      ) : null}
      {has('schedule') ? (
        <FormField
          label="Schedule"
          error={errors.schedule?.message}
          required={needs('schedule')}
          hint="For example Mon–Fri, 6–8 PM."
          className="sm:col-span-2"
        >
          <Input {...register('schedule')} />
        </FormField>
      ) : null}
      <FormField label="Status" error={errors.status?.message} required>
        <Select {...register('status')}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </FormField>
      {has('research') || has('practical') ? (
        <div className="flex flex-wrap items-end gap-4 sm:col-span-2">
          {has('research') ? (
            <label className="flex items-center gap-2 text-sm">
              <Switch {...register('research')} />
              Research programme
            </label>
          ) : null}
          {has('practical') ? (
            <label className="flex items-center gap-2 text-sm">
              <Switch {...register('practical')} />
              Has a practical / lab component
            </label>
          ) : null}
        </div>
      ) : null}
      {has('members') ? (
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm font-medium">
            Subjects
            {needs('members') ? (
              <span className="text-destructive" aria-hidden>
                {' '}
                *
              </span>
            ) : null}
          </legend>
          {subjects.length === 0 ? (
            <p className="text-xs text-muted-foreground">Add subjects first; combinations are made from them.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {subjects.map((subject) => (
                <label
                  key={subject.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm has-checked:border-primary has-checked:bg-primary/5"
                >
                  <Checkbox value={subject.id} {...register('memberIds')} />
                  {subject.name}
                </label>
              ))}
            </div>
          )}
          {errors.memberIds?.message ? (
            <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">
              {errors.memberIds.message}
            </p>
          ) : null}
        </fieldset>
      ) : null}
    </form>
  );
}
