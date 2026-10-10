'use client';

import {
  BookOpenText,
  FileBadge,
  GraduationCap,
  Hash,
  Landmark,
  Presentation,
  School,
  Shapes,
  type LucideIcon,
} from 'lucide-react';
import { useId, useState, type ComponentProps } from 'react';
import { get, useFormContext, useWatch } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import { Checkbox, Switch } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input, Select, Textarea } from '@/components/ui/input';
import {
  ACCREDITATIONS,
  COURSE_CATEGORIES,
  EDUCATION_BOARDS,
  INTERMEDIATE_BOARDS,
  UNIVERSITY_CATEGORIES,
  nameOf,
  type ReferenceOption,
} from '@/config/institution';
import { INSTITUTION_TYPE_PROFILES, profileOf } from '@/config/institution-types';
import type { InstitutionType, InstitutionTypeDetails } from '@/domain/institution';
import { IconInput, SectionCard } from '@/features/institution/setup-ui';
import type { InstitutionSettingsInput } from '@/lib/validation/institution';

type Settings = InstitutionSettingsInput;

const GRID = 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3';

export const TYPE_ICONS: Record<InstitutionType, LucideIcon> = {
  school: School,
  'junior-college': BookOpenText,
  'degree-college': GraduationCap,
  university: Landmark,
  coaching: Presentation,
  other: Shapes,
};

/** The one identifying detail of the type, for summaries: board, affiliation, category or course areas. */
export function typeDetailSummary(
  type: InstitutionType,
  details: InstitutionTypeDetails,
): { label: string; value: string } {
  switch (type) {
    case 'school':
      return {
        label: 'Board',
        value: EDUCATION_BOARDS.find((board) => board.id === details.school.boardId)?.shortName ?? '—',
      };
    case 'junior-college':
      return {
        label: 'Board',
        value: INTERMEDIATE_BOARDS.find((board) => board.id === details['junior-college'].boardId)?.shortName ?? '—',
      };
    case 'degree-college': {
      const college = details['degree-college'];
      return {
        label: college.autonomous ? 'Autonomous, affiliated to' : 'Affiliated to',
        value: college.affiliatingUniversity || '—',
      };
    }
    case 'university':
      return { label: 'Category', value: nameOf(UNIVERSITY_CATEGORIES, details.university.universityCategoryId) };
    case 'coaching': {
      const [first, ...rest] = details.coaching.courseCategoryIds.map((id) => nameOf(COURSE_CATEGORIES, id));
      return { label: 'Courses', value: first ? `${first}${rest.length ? ` +${rest.length}` : ''}` : '—' };
    }
    case 'other':
      return { label: 'Offers', value: details.other.description || '—' };
  }
}

/**
 * Institution type cards. Changing the type asks for confirmation and only takes effect on save; the service also
 * requires the Approve permission, so the cards are disabled for roles without it.
 */
export function InstitutionTypePicker({ savedType, canChange }: { savedType: InstitutionType; canChange: boolean }) {
  const { control, setValue } = useFormContext<Settings>();
  const type = useWatch({ control, name: 'type' });
  const [pending, setPending] = useState<InstitutionType | null>(null);
  const name = useId();
  const select = (next: InstitutionType) => {
    if (next === type) return;
    if (next === savedType) setValue('type', next, { shouldDirty: true });
    else setPending(next);
  };
  const saved = profileOf(savedType);
  return (
    <SectionCard
      icon={Shapes}
      title="Institution Type"
      description="Sets the terminology, academic structure, required identifiers and dashboard summaries."
    >
      <fieldset disabled={!canChange} className="min-w-0 space-y-3">
        <legend className="sr-only">Institution type</legend>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Object.values(INSTITUTION_TYPE_PROFILES).map((profile) => {
            const Icon = TYPE_ICONS[profile.id];
            return (
              <label
                key={profile.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40 has-checked:border-primary has-checked:bg-primary/5 has-checked:ring-1 has-checked:ring-primary has-focus-visible:ring-2 has-focus-visible:ring-ring has-disabled:cursor-not-allowed has-disabled:hover:bg-transparent"
              >
                <input
                  type="radio"
                  name={name}
                  value={profile.id}
                  checked={type === profile.id}
                  onChange={() => select(profile.id)}
                  className="sr-only"
                />
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                  aria-hidden
                >
                  <Icon className="size-4.5" />
                </span>
                <span className="min-w-0 space-y-0.5">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {profile.label}
                    {profile.id === savedType ? <Badge variant="neutral">Saved</Badge> : null}
                  </span>
                  <span className="block text-xs text-muted-foreground">{profile.description}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {!canChange ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Changing the institution type needs the Approve permission. Ask the institution owner.
        </p>
      ) : null}
      {type !== savedType ? (
        <p
          role="status"
          className="mt-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning-foreground"
        >
          The type changes from {saved.label} to {profileOf(type).label} when you save. {saved.label} details and
          academic structure are kept and come back if you switch back.
        </p>
      ) : null}
      <ConfirmDialog
        open={pending !== null}
        title={`Change the institution type to ${pending ? profileOf(pending).label : ''}?`}
        description={`Terminology, the academic structure, required identifiers and dashboard summaries will follow the new type. Nothing is deleted: ${saved.label} details, classes and structure entries are kept and come back if you switch back. The change applies when you save.`}
        confirmLabel="Change type"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) setValue('type', pending, { shouldDirty: true });
          setPending(null);
        }}
      />
    </SectionCard>
  );
}

function OptionSelect({
  options,
  placeholder,
  ...props
}: ComponentProps<'select'> & { options: readonly ReferenceOption[]; placeholder: string }) {
  return (
    <Select {...props}>
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </Select>
  );
}

/** The registration and affiliation details that apply to the selected type. Other types' details stay untouched. */
export function TypeDetailsFields({ type }: { type: InstitutionType }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<Settings>();
  const error = (field: string): string | undefined => get(errors, `typeDetails.${type}.${field}`)?.message;
  const categoriesId = useId();
  const profile = profileOf(type);

  const body = (() => {
    switch (type) {
      case 'school':
        return (
          <div className={GRID}>
            <FormField label="Education Board" error={error('boardId')} required>
              <Select {...register('typeDetails.school.boardId')}>
                <option value="">Select board</option>
                {EDUCATION_BOARDS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Affiliation Number" error={error('affiliationNumber')} hint="Optional">
              {(control) => (
                <IconInput icon={FileBadge} {...control} {...register('typeDetails.school.affiliationNumber')} />
              )}
            </FormField>
            <FormField label="UDISE Code" error={error('udiseCode')} hint="11 digits, if allotted.">
              {(control) => (
                <IconInput
                  icon={Hash}
                  inputMode="numeric"
                  maxLength={11}
                  {...control}
                  {...register('typeDetails.school.udiseCode')}
                />
              )}
            </FormField>
          </div>
        );
      case 'junior-college':
        return (
          <div className={GRID}>
            <FormField label="Intermediate Board" error={error('boardId')} required>
              <OptionSelect
                options={INTERMEDIATE_BOARDS}
                placeholder="Select board"
                {...register('typeDetails.junior-college.boardId')}
              />
            </FormField>
            <FormField label="College Code" error={error('collegeCode')} hint="Optional. Allotted by the board.">
              <Input {...register('typeDetails.junior-college.collegeCode')} />
            </FormField>
            <FormField label="Affiliation / Recognition Number" error={error('affiliationNumber')} hint="Optional">
              {(control) => (
                <IconInput
                  icon={FileBadge}
                  {...control}
                  {...register('typeDetails.junior-college.affiliationNumber')}
                />
              )}
            </FormField>
          </div>
        );
      case 'degree-college':
        return (
          <div className={GRID}>
            <FormField label="Affiliating University" error={error('affiliatingUniversity')} required>
              <Input {...register('typeDetails.degree-college.affiliatingUniversity')} />
            </FormField>
            <FormField label="College Code" error={error('collegeCode')} hint="Optional. Allotted by the university.">
              <Input {...register('typeDetails.degree-college.collegeCode')} />
            </FormField>
            <FormField label="Affiliation Number" error={error('affiliationNumber')} hint="Optional">
              {(control) => (
                <IconInput
                  icon={FileBadge}
                  {...control}
                  {...register('typeDetails.degree-college.affiliationNumber')}
                />
              )}
            </FormField>
            <FormField label="Accreditation" error={error('accreditationId')} hint="Optional">
              <OptionSelect
                options={ACCREDITATIONS}
                placeholder="Not accredited / not listed"
                {...register('typeDetails.degree-college.accreditationId')}
              />
            </FormField>
            <SwitchField
              label="Autonomous college"
              description="Sets its own syllabus and examinations."
              {...register('typeDetails.degree-college.autonomous')}
            />
          </div>
        );
      case 'university':
        return (
          <div className={GRID}>
            <FormField label="University Category" error={error('universityCategoryId')} required>
              <OptionSelect
                options={UNIVERSITY_CATEGORIES}
                placeholder="Select category"
                {...register('typeDetails.university.universityCategoryId')}
              />
            </FormField>
            <FormField label="Accreditation" error={error('accreditationId')} hint="Optional">
              <OptionSelect
                options={ACCREDITATIONS}
                placeholder="Not accredited / not listed"
                {...register('typeDetails.university.accreditationId')}
              />
            </FormField>
            <FormField
              label="Recognition Details"
              error={error('recognitionDetails')}
              hint="Optional. For example the UGC recognition or establishing Act."
              className="sm:col-span-2 xl:col-span-3"
            >
              <Textarea rows={2} {...register('typeDetails.university.recognitionDetails')} />
            </FormField>
          </div>
        );
      case 'coaching':
        return (
          <div className="space-y-4">
            <fieldset aria-describedby={error('courseCategoryIds') ? `${categoriesId}-error` : undefined}>
              <legend className="mb-2 text-sm font-medium">
                Course Categories
                <span className="text-destructive" aria-hidden>
                  {' '}
                  *
                </span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {COURSE_CATEGORIES.map((option) => (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm has-checked:border-primary has-checked:bg-primary/5"
                  >
                    <Checkbox value={option.id} {...register('typeDetails.coaching.courseCategoryIds')} />
                    {option.name}
                  </label>
                ))}
              </div>
              {error('courseCategoryIds') ? (
                <p id={`${categoriesId}-error`} className="mt-1.5 text-xs font-medium text-destructive">
                  {error('courseCategoryIds')}
                </p>
              ) : null}
            </fieldset>
            <div className={GRID}>
              <FormField label="Registration Number" error={error('registrationNumber')} hint="Optional">
                {(control) => (
                  <IconInput icon={FileBadge} {...control} {...register('typeDetails.coaching.registrationNumber')} />
                )}
              </FormField>
            </div>
          </div>
        );
      case 'other':
        return (
          <div className={GRID}>
            <FormField
              label="What You Offer"
              error={error('description')}
              required
              hint="For example: vocational training, music academy, early-childhood centre."
              className="sm:col-span-2"
            >
              <Textarea rows={2} {...register('typeDetails.other.description')} />
            </FormField>
            <FormField label="Registration Number" error={error('registrationNumber')} hint="Optional">
              {(control) => (
                <IconInput icon={FileBadge} {...control} {...register('typeDetails.other.registrationNumber')} />
              )}
            </FormField>
          </div>
        );
    }
  })();

  return (
    <SectionCard
      icon={TYPE_ICONS[type]}
      title={`${profile.label} Details`}
      description="Only the identifiers that apply to this type are asked for."
    >
      {body}
    </SectionCard>
  );
}

function SwitchField({
  label,
  description,
  ...props
}: { label: string; description: string } & Omit<ComponentProps<'input'>, 'type' | 'role'>) {
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
      <Switch id={id} aria-describedby={`${id}-description`} {...props} />
    </div>
  );
}
