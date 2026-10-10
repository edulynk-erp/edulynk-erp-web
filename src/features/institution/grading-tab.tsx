'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Award, FileText, ListChecks, Plus, RotateCcw, Save, Scale, Trash2 } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { useFieldArray, useForm, useWatch, type Control } from 'react-hook-form';
import { ErrorState, LoadingState } from '@/components/feedback/states';
import { Button } from '@/components/ui/button';
import { IncompleteFormHint } from '@/components/ui/form-status';
import { Checkbox, Switch } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input, Select } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { gradingDefaultsFor } from '@/config/grading';
import { ASSESSMENT_KIND_LABELS, GRADING_METHOD_LABELS, ROUNDING_LABELS } from '@/config/institution';
import { INSTITUTION_TYPE_LABELS } from '@/config/institution-types';
import {
  ASSESSMENT_KINDS,
  GRADING_METHODS,
  ROUNDING_RULES,
  type GradingConfig,
  type InstitutionType,
} from '@/domain/institution';
import type { SetupPermissions } from '@/features/institution/setup-config';
import { applyFieldErrors, SectionCard } from '@/features/institution/setup-ui';
import { useUnsavedChangesWarning } from '@/features/institution/use-unsaved-changes';
import { formatDate } from '@/lib/format/date';
import { gradingConfigSchema, gradingInputOf, type GradingConfigInput } from '@/lib/validation/institution';
import { cn } from '@/lib/utils/cn';
import { describeError, useServiceQuery, useServices } from '@/services/provider';
import { LIVE_VALIDATION } from '@/lib/validation/form-options';

const GRID = 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3';
const nullableNumber = { setValueAs: (value: unknown) => (value === '' || value === null ? null : Number(value)) };
const newId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

export function GradingTab({
  institutionType,
  permissions,
}: {
  institutionType: InstitutionType;
  permissions: SetupPermissions;
}) {
  const grading = useServiceQuery((s) => s.institution.getGradingConfig(), []);
  if (grading.error && !grading.data) {
    return (
      <ErrorState
        title="Grading rules could not be loaded"
        description={grading.error}
        action={
          <Button variant="outline" onClick={grading.reload}>
            Try again
          </Button>
        }
      />
    );
  }
  if (!grading.data) return <LoadingState label="Loading grading rules" rows={6} />;
  return (
    <GradingForm
      config={grading.data}
      institutionType={institutionType}
      editable={permissions.edit && permissions.institutionWide}
    />
  );
}

function GradingForm({
  config,
  institutionType,
  editable,
}: {
  config: GradingConfig;
  institutionType: InstitutionType;
  editable: boolean;
}) {
  const services = useServices();
  const toast = useToast();
  const [confirm, setConfirm] = useState<'discard' | 'defaults' | null>(null);
  const form = useForm<GradingConfigInput>({
    resolver: zodResolver(gradingConfigSchema),
    ...LIVE_VALIDATION,
    defaultValues: gradingInputOf(config),
  });
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty, isSubmitting, isValid },
  } = form;
  const bands = useFieldArray({ control, name: 'bands', keyName: 'key' });
  const components = useFieldArray({ control, name: 'components', keyName: 'key' });
  const method = useWatch({ control, name: 'method' });
  const usesPoints = method === 'gpa' || method === 'cgpa';
  useUnsavedChangesWarning(isDirty && editable);

  const save = handleSubmit(
    async (values) => {
      if (!services) return;
      try {
        const saved = await services.institution.updateGradingConfig(values);
        reset(gradingInputOf(saved));
        toast.notify({ tone: 'success', title: 'Grading rules saved' });
      } catch (error) {
        applyFieldErrors(error, setError, Object.keys(values));
        toast.notify({ tone: 'error', title: 'Grading rules not saved', description: describeError(error) });
      }
    },
    () => toast.notify({ tone: 'error', title: 'Some grading details need attention' }),
  );

  const bandsError = errors.bands?.root?.message ?? errors.bands?.message;
  const componentsError = errors.components?.root?.message ?? errors.components?.message;

  return (
    <form onSubmit={(event) => void save(event)} noValidate aria-label="Grading and assessment">
      <fieldset disabled={!editable || isSubmitting} className="min-w-0 space-y-6">
        <legend className="sr-only">Grading and assessment</legend>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {config.updatedAt
              ? `Last updated by ${config.updatedBy ?? 'someone'} on ${formatDate(config.updatedAt)}.`
              : 'Using the starting rules for your institution type. Adjust them to match your board or university.'}
          </p>
          {editable ? (
            <div className="flex flex-wrap items-center gap-2">
              {isDirty ? (
                <span role="status" className="flex items-center gap-1.5 text-xs font-medium text-warning-foreground">
                  <span className="size-2 rounded-full bg-warning" aria-hidden />
                  Unsaved changes
                </span>
              ) : null}
              <Button variant="outline" onClick={() => setConfirm('defaults')}>
                <RotateCcw aria-hidden />
                Load {INSTITUTION_TYPE_LABELS[institutionType]} Defaults
              </Button>
              <Button variant="outline" onClick={() => setConfirm('discard')} disabled={!isDirty}>
                Cancel
              </Button>
              {!isValid && !isSubmitting ? <IncompleteFormHint onReveal={() => void save()} /> : null}
              <Button type="submit" loading={isSubmitting} disabled={!isValid || !isDirty || !services}>
                <Save aria-hidden />
                {isSubmitting ? 'Saving…' : 'Save Grading'}
              </Button>
            </div>
          ) : null}
        </div>

        <SectionCard icon={Scale} title="Method & Pass Rules" description="How results are calculated and who passes.">
          <div className={GRID}>
            <FormField label="Grading Method" error={errors.method?.message} required>
              <Select {...register('method')}>
                {GRADING_METHODS.map((value) => (
                  <option key={value} value={value}>
                    {GRADING_METHOD_LABELS[value]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Maximum Marks per Subject" error={errors.maxMarks?.message} required>
              <Input type="number" min={10} max={1000} {...register('maxMarks', { valueAsNumber: true })} />
            </FormField>
            <FormField label="Rounding" error={errors.rounding?.message} required>
              <Select {...register('rounding')}>
                {ROUNDING_RULES.map((value) => (
                  <option key={value} value={value}>
                    {ROUNDING_LABELS[value]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Overall Pass Mark (%)" error={errors.passPercent?.message} required>
              <Input type="number" min={1} max={100} {...register('passPercent', { valueAsNumber: true })} />
            </FormField>
            <FormField
              label="Pass Mark per Subject (%)"
              error={errors.subjectPassPercent?.message}
              required
              hint="0 if subjects have no separate minimum."
            >
              <Input type="number" min={0} max={100} {...register('subjectPassPercent', { valueAsNumber: true })} />
            </FormField>
            <ToggleRow
              label="Pass each component separately"
              description="For example, theory and practical must each be passed."
            >
              {(id, describedBy) => (
                <Switch id={id} aria-describedby={describedBy} {...register('passEachComponent')} />
              )}
            </ToggleRow>
            {usesPoints ? (
              <>
                <FormField label="Grade-Point Scale" error={errors.gradePointScale?.message} required>
                  <Select {...register('gradePointScale', { valueAsNumber: true })}>
                    {[10, 5, 4].map((value) => (
                      <option key={value} value={value}>
                        {value}-point
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField
                  label="CGPA to Percentage Multiplier"
                  error={errors.cgpaToPercent?.message}
                  hint="For example 9.5. Leave blank to hide the conversion."
                >
                  <Input type="number" step={0.1} min={1} max={25} {...register('cgpaToPercent', nullableNumber)} />
                </FormField>
                <ToggleRow label="Credit-weighted" description="Weight grade points by course credits.">
                  {(id, describedBy) => <Switch id={id} aria-describedby={describedBy} {...register('useCredits')} />}
                </ToggleRow>
              </>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard
          icon={Award}
          title="Grade Bands"
          description="Bands must cover 0–100% without gaps or overlaps. Mark which grades are a pass."
          actions={
            editable ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  bands.append({
                    id: newId('gbd'),
                    grade: '',
                    minPercent: 0,
                    maxPercent: 0,
                    gradePoint: null,
                    remark: '',
                    isPass: true,
                  })
                }
              >
                <Plus aria-hidden />
                Add Band
              </Button>
            ) : null
          }
        >
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[44rem] text-sm">
              <caption className="sr-only">Grade bands</caption>
              <thead className="border-b bg-muted/60 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    Grade
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    From %
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    To %
                  </th>
                  {usesPoints ? (
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Grade Point
                    </th>
                  ) : null}
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    Remark
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-center font-medium">
                    Pass
                  </th>
                  <th scope="col" className="w-px px-3 py-2.5">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {bands.fields.map((field, index) => {
                  const rowErrors = errors.bands?.[index];
                  return (
                    <tr key={field.key} className="align-top">
                      <Cell error={rowErrors?.grade?.message}>
                        <Input
                          aria-label={`Grade ${index + 1}`}
                          className="w-24"
                          {...register(`bands.${index}.grade`)}
                        />
                      </Cell>
                      <Cell error={rowErrors?.minPercent?.message}>
                        <Input
                          aria-label={`Grade ${index + 1} from percent`}
                          type="number"
                          min={0}
                          max={100}
                          className="w-20"
                          {...register(`bands.${index}.minPercent`, { valueAsNumber: true })}
                        />
                      </Cell>
                      <Cell error={rowErrors?.maxPercent?.message}>
                        <Input
                          aria-label={`Grade ${index + 1} to percent`}
                          type="number"
                          min={0}
                          max={100}
                          className="w-20"
                          {...register(`bands.${index}.maxPercent`, { valueAsNumber: true })}
                        />
                      </Cell>
                      {usesPoints ? (
                        <Cell error={rowErrors?.gradePoint?.message}>
                          <Input
                            aria-label={`Grade ${index + 1} grade point`}
                            type="number"
                            step={0.5}
                            min={0}
                            max={10}
                            className="w-20"
                            {...register(`bands.${index}.gradePoint`, nullableNumber)}
                          />
                        </Cell>
                      ) : null}
                      <Cell error={rowErrors?.remark?.message}>
                        <Input aria-label={`Grade ${index + 1} remark`} {...register(`bands.${index}.remark`)} />
                      </Cell>
                      <td className="px-3 py-2 text-center">
                        <Checkbox
                          aria-label={`Grade ${index + 1} is a pass`}
                          className="mt-2.5"
                          {...register(`bands.${index}.isPass`)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        {editable ? (
                          <RemoveButton
                            label={`Remove grade ${index + 1}`}
                            disabled={bands.fields.length <= 2}
                            onClick={() => bands.remove(index)}
                          />
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {bandsError ? (
            <p role="alert" className="mt-2 text-xs font-medium text-destructive">
              {bandsError}
            </p>
          ) : null}
        </SectionCard>

        <SectionCard
          icon={ListChecks}
          title="Assessment Components"
          description="Internal and external assessment, practicals and projects. Weightages must total 100%."
          actions={
            editable ? (
              <Button
                variant="outline"
                size="sm"
                disabled={components.fields.length >= 10}
                onClick={() => components.append({ id: newId('asc'), name: '', kind: 'internal', weightage: 0 })}
              >
                <Plus aria-hidden />
                Add Component
              </Button>
            ) : null
          }
        >
          <div className="space-y-3">
            {components.fields.map((field, index) => {
              const rowErrors = errors.components?.[index];
              return (
                <div
                  key={field.key}
                  className="grid items-start gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_8rem_auto]"
                >
                  <FormField label="Component" error={rowErrors?.name?.message} required>
                    <Input {...register(`components.${index}.name`)} />
                  </FormField>
                  <FormField label="Type" error={rowErrors?.kind?.message} required>
                    <Select {...register(`components.${index}.kind`)}>
                      {ASSESSMENT_KINDS.map((value) => (
                        <option key={value} value={value}>
                          {ASSESSMENT_KIND_LABELS[value]}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Weightage (%)" error={rowErrors?.weightage?.message} required>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      {...register(`components.${index}.weightage`, { valueAsNumber: true })}
                    />
                  </FormField>
                  {editable ? (
                    <div className="sm:pt-6">
                      <RemoveButton
                        label={`Remove component ${index + 1}`}
                        disabled={components.fields.length <= 1}
                        onClick={() => components.remove(index)}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
            <WeightageTotal control={control} />
            {componentsError ? (
              <p role="alert" className="text-xs font-medium text-destructive">
                {componentsError}
              </p>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard
          icon={FileText}
          title="Report Card & Transcript"
          description="What appears on report cards, marks memos and transcripts."
        >
          <div className="space-y-4">
            <div className={GRID}>
              <FormField label="Document Title" error={errors.transcript?.title?.message} required>
                <Input {...register('transcript.title')} />
              </FormField>
              <FormField
                label="Footer Note"
                error={errors.transcript?.footerNote?.message}
                hint="Optional"
                className="xl:col-span-2"
              >
                <Input {...register('transcript.footerNote')} />
              </FormField>
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['showMarks', 'Marks'],
                  ['showGrades', 'Grades'],
                  ['showGradePoints', 'Grade points'],
                  ['showCredits', 'Credits'],
                  ['showCumulative', 'SGPA / CGPA or cumulative %'],
                  ['showRank', 'Rank'],
                ] as const
              ).map(([name, label]) => (
                <label
                  key={name}
                  className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm has-checked:border-primary has-checked:bg-primary/5"
                >
                  <Checkbox {...register(`transcript.${name}`)} />
                  Show {label.charAt(0).toLowerCase() + label.slice(1)}
                </label>
              ))}
            </div>
          </div>
        </SectionCard>
      </fieldset>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'defaults' ? 'Load the default rules?' : 'Discard unsaved grading changes?'}
        description={
          confirm === 'defaults'
            ? `The form is filled with typical ${INSTITUTION_TYPE_LABELS[institutionType]} grading rules. Nothing is saved until you choose Save Grading.`
            : 'Your edits will be lost and the saved grading rules restored.'
        }
        confirmLabel={confirm === 'defaults' ? 'Load defaults' : 'Discard changes'}
        destructive={confirm === 'discard'}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm === 'defaults') {
            reset(gradingInputOf(gradingDefaultsFor(institutionType)), { keepDefaultValues: true });
          } else {
            reset(gradingInputOf(config));
          }
          setConfirm(null);
        }}
      />
    </form>
  );
}

function Cell({ error, children }: { error: string | undefined; children: ReactNode }) {
  return (
    <td className="px-3 py-2">
      {children}
      {error ? <p className="mt-1 max-w-40 text-xs font-medium text-destructive">{error}</p> : null}
    </td>
  );
}

function RemoveButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Trash2 />
    </Button>
  );
}

function ToggleRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: (id: string, describedBy: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border p-3">
      <div className="space-y-0.5">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <p id={`${id}-description`} className="text-xs text-muted-foreground">
          {description}
        </p>
      </div>
      {children(id, `${id}-description`)}
    </div>
  );
}

function WeightageTotal({ control }: { control: Control<GradingConfigInput> }) {
  const components = useWatch({ control, name: 'components' });
  const total = components.reduce(
    (sum, component) => sum + (Number.isFinite(component.weightage) ? component.weightage : 0),
    0,
  );
  return (
    <p className={cn('text-sm font-medium', total === 100 ? 'text-success-foreground' : 'text-warning-foreground')}>
      Total weightage: {total}%{total === 100 ? '' : ' (must be 100%)'}
    </p>
  );
}
