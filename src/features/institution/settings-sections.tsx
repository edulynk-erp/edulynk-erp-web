'use client';

import {
  BellRing,
  Building2,
  CalendarDays,
  Clock,
  Globe,
  Headset,
  ImageUp,
  IndianRupee,
  Languages,
  Mail,
  MapPin,
  Palette,
  Phone,
  Smartphone,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useId, useRef, useState, type ChangeEvent } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Checkbox, Switch } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { Input, Select } from '@/components/ui/input';
import {
  COUNTRIES,
  INSTITUTION_CATEGORY_LABELS,
  LANGUAGES,
  MEDIUMS,
  stateOf,
  statesOf,
  TIMEZONES,
  WEEKDAY_LABELS,
} from '@/config/institution';
import { profileOf } from '@/config/institution-types';
import { DATE_FORMATS, TIME_FORMATS, WEEKDAYS, type InstitutionType } from '@/domain/institution';
import { InstitutionTypePicker, TypeDetailsFields } from '@/features/institution/institution-type';
import { IconInput, SectionCard } from '@/features/institution/setup-ui';
import { MAX_LOGO_BYTES, type InstitutionSettingsInput } from '@/lib/validation/institution';
import { cn } from '@/lib/utils/cn';

type Settings = InstitutionSettingsInput;

const GRID = 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3';

export function GeneralSection({ savedType, canChangeType }: { savedType: InstitutionType; canChangeType: boolean }) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<Settings>();
  const type = useWatch({ control, name: 'type' });
  const terms = profileOf(type).terms;
  return (
    <div className="space-y-6">
      <InstitutionTypePicker savedType={savedType} canChange={canChangeType} />
      <SectionCard
        icon={Building2}
        title="Basic Information"
        description="Your institution's name, category and official contact."
      >
        <div className={GRID}>
          <FormField label="Institution Name" error={errors.name?.message} required>
            <Input autoComplete="organization" {...register('name')} />
          </FormField>
          <FormField label="Short Name" error={errors.shortName?.message} required hint="Shown where space is limited.">
            <Input {...register('shortName')} />
          </FormField>
          <FormField label="Category" error={errors.category?.message} required>
            <Select {...register('category')}>
              {Object.entries(INSTITUTION_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Established Year" error={errors.establishedYear?.message} required>
            {(fieldControl) => (
              <IconInput
                icon={CalendarDays}
                type="number"
                inputMode="numeric"
                {...fieldControl}
                {...register('establishedYear', { valueAsNumber: true })}
              />
            )}
          </FormField>
          <FormField label="Website" error={errors.website?.message}>
            {(fieldControl) => (
              <IconInput icon={Globe} type="url" placeholder="https://" {...fieldControl} {...register('website')} />
            )}
          </FormField>
          <FormField label="Official Email" error={errors.contactEmail?.message} required>
            {(fieldControl) => <IconInput icon={Mail} type="email" {...fieldControl} {...register('contactEmail')} />}
          </FormField>
          <FormField label={`${terms.learner} Capacity`} error={errors.studentCapacity?.message} required>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              {...register('studentCapacity', { valueAsNumber: true })}
            />
          </FormField>
          <FormField label="Medium of Instruction" error={errors.mediumId?.message} required>
            <Select {...register('mediumId')}>
              <option value="">Select medium</option>
              {MEDIUMS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </SectionCard>
      <TypeDetailsFields type={type} />
      <ContactSection />
      <AddressSection />
    </div>
  );
}

function ContactSection() {
  const {
    register,
    formState: { errors },
  } = useFormContext<Settings>();
  return (
    <SectionCard icon={Phone} title="Contact Details" description="Who parents, staff and Edulynk should contact.">
      <div className={GRID}>
        <FormField label="Primary Contact Person" error={errors.contactPerson?.message} required>
          {(control) => <IconInput icon={UserRound} autoComplete="name" {...control} {...register('contactPerson')} />}
        </FormField>
        <FormField label="Designation" error={errors.contactDesignation?.message} required>
          <Input {...register('contactDesignation')} />
        </FormField>
        <FormField label="Contact Number" error={errors.phone?.message} required>
          {(control) => (
            <IconInput
              icon={Phone}
              type="tel"
              autoComplete="tel"
              placeholder="+91 98765 43210"
              {...control}
              {...register('phone')}
            />
          )}
        </FormField>
        <FormField label="Alternate Number" error={errors.alternatePhone?.message} hint="Optional">
          {(control) => (
            <IconInput
              icon={Phone}
              type="tel"
              placeholder="+91 98765 43211"
              {...control}
              {...register('alternatePhone')}
            />
          )}
        </FormField>
        <FormField label="Contact Email" error={errors.contactPersonEmail?.message} required>
          {(control) => <IconInput icon={Mail} type="email" {...control} {...register('contactPersonEmail')} />}
        </FormField>
        <FormField label="Support Email" error={errors.supportEmail?.message} required>
          {(control) => <IconInput icon={Headset} type="email" {...control} {...register('supportEmail')} />}
        </FormField>
      </div>
    </SectionCard>
  );
}

function AddressSection() {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<Settings>();
  const [countryId, stateId] = useWatch({ control, name: ['countryId', 'stateId'] });
  const state = stateOf(stateId);
  const clear = (...fields: ('stateId' | 'districtId' | 'cityId')[]) => {
    for (const field of fields) setValue(field, '', { shouldDirty: true });
  };
  return (
    <SectionCard icon={MapPin} title="Address Information" description="The institution's registered address.">
      <div className={GRID}>
        <FormField
          label="Address Line 1"
          error={errors.addressLine1?.message}
          required
          className="sm:col-span-2 xl:col-span-2"
        >
          <Input autoComplete="address-line1" {...register('addressLine1')} />
        </FormField>
        <FormField label="Address Line 2" error={errors.addressLine2?.message} hint="Optional">
          <Input autoComplete="address-line2" {...register('addressLine2')} />
        </FormField>
        <FormField label="Country" error={errors.countryId?.message} required>
          <Select {...register('countryId', { onChange: () => clear('stateId', 'districtId', 'cityId') })}>
            <option value="">Select country</option>
            {COUNTRIES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="State" error={errors.stateId?.message} required>
          <Select disabled={!countryId} {...register('stateId', { onChange: () => clear('districtId', 'cityId') })}>
            <option value="">Select state</option>
            {statesOf(countryId).map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="District" error={errors.districtId?.message} required>
          <Select disabled={!state} {...register('districtId')}>
            <option value="">Select district</option>
            {state?.districts.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="City" error={errors.cityId?.message} required>
          <Select disabled={!state} {...register('cityId')}>
            <option value="">Select city</option>
            {state?.cities.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="PIN Code" error={errors.pinCode?.message} required>
          <Input inputMode="numeric" maxLength={6} autoComplete="postal-code" {...register('pinCode')} />
        </FormField>
      </div>
    </SectionCard>
  );
}

function SwitchRow({
  name,
  label,
  description,
}: {
  name: `policies.${'notifyGuardiansOnAbsence' | 'sendFeeReminders' | 'publishResultsOnline'}`;
  label: string;
  description: string;
}) {
  const { register } = useFormContext<Settings>();
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
      <Switch id={id} aria-describedby={`${id}-description`} {...register(name)} />
    </div>
  );
}

export function PoliciesSection({ type }: { type: InstitutionType }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<Settings>();
  const terms = profileOf(type).terms;
  const policyErrors = errors.policies;
  const daysId = useId();
  return (
    <div className="space-y-6">
      <SectionCard
        icon={Clock}
        title="Timings & Working Days"
        description={`The ${terms.day.toLowerCase()}, used by attendance and the timetable.`}
      >
        <div className="space-y-4">
          <fieldset aria-describedby={policyErrors?.workingDays ? `${daysId}-error` : undefined}>
            <legend className="mb-2 text-sm font-medium">
              Working Days
              <span className="text-destructive" aria-hidden>
                {' '}
                *
              </span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => (
                <label
                  key={day}
                  className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm has-checked:border-primary has-checked:bg-primary/5"
                >
                  <Checkbox value={day} {...register('policies.workingDays')} />
                  {WEEKDAY_LABELS[day]}
                </label>
              ))}
            </div>
            {policyErrors?.workingDays ? (
              <p id={`${daysId}-error`} className="mt-1.5 text-xs font-medium text-destructive">
                {policyErrors.workingDays.message}
              </p>
            ) : null}
          </fieldset>
          <div className={GRID}>
            <FormField label="Day Starts At" error={policyErrors?.schoolStartsAt?.message} required>
              <Input type="time" {...register('policies.schoolStartsAt')} />
            </FormField>
            <FormField label="Day Ends At" error={policyErrors?.schoolEndsAt?.message} required>
              <Input type="time" {...register('policies.schoolEndsAt')} />
            </FormField>
            <FormField
              label="Late Arrival Grace (minutes)"
              error={policyErrors?.lateArrivalGraceMinutes?.message}
              required
            >
              <Input
                type="number"
                min={0}
                max={60}
                {...register('policies.lateArrivalGraceMinutes', { valueAsNumber: true })}
              />
            </FormField>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={CalendarDays}
        title="Attendance"
        description="Pass marks and grading rules are on the Grading & Assessment tab."
      >
        <div className={GRID}>
          <FormField
            label="Minimum Attendance (%)"
            error={policyErrors?.minimumAttendancePercent?.message}
            required
            hint={`${terms.learners} below this are flagged before examinations.`}
          >
            <Input
              type="number"
              min={50}
              max={100}
              {...register('policies.minimumAttendancePercent', { valueAsNumber: true })}
            />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard icon={IndianRupee} title="Fees" description="Defaults for new fee structures.">
        <div className={GRID}>
          <FormField
            label="Fee Due Day"
            error={policyErrors?.feeDueDay?.message}
            required
            hint="Day of the month (1–28)."
          >
            <Input type="number" min={1} max={28} {...register('policies.feeDueDay', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Late Fee per Day (₹)" error={policyErrors?.lateFeePerDay?.message} required>
            <Input type="number" min={0} {...register('policies.lateFeePerDay', { valueAsNumber: true })} />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard
        icon={BellRing}
        title="Notifications"
        description="Who is notified. Time zone, language and date format are under Branding & Appearance."
      >
        <div className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-3">
            <SwitchRow
              name="policies.notifyGuardiansOnAbsence"
              label="Absence alerts to guardians"
              description={`Notify guardians when a ${terms.learner.toLowerCase()} is marked absent.`}
            />
            <SwitchRow
              name="policies.sendFeeReminders"
              label="Fee reminders"
              description="Remind guardians before and after the due day."
            />
            <SwitchRow
              name="policies.publishResultsOnline"
              label="Publish results online"
              description="Make published results visible in the portal."
            />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

/** Square logo or an initials mark in the primary colour (SVG attributes, so no inline styles are needed). */
export function LogoMark({
  logoDataUrl,
  name,
  color,
  className,
}: {
  logoDataUrl: string | null;
  name: string;
  color: string;
  className?: string;
}) {
  if (logoDataUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- local data: URL preview; next/image cannot optimise it.
    return <img src={logoDataUrl} alt={`${name} logo`} className={cn('object-contain', className)} />;
  }
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join('') || '?';
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={`${name} initials`} className={className}>
      <rect width="64" height="64" rx="14" fill={color} />
      <text x="32" y="41" textAnchor="middle" fontSize="24" fontWeight="700" fill="#ffffff" fontFamily="inherit">
        {initials}
      </text>
    </svg>
  );
}

function ColorField({ name, label }: { name: 'branding.primaryColor' | 'branding.accentColor'; label: string }) {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<Settings>();
  const value = useWatch({ control, name });
  const error = name === 'branding.primaryColor' ? errors.branding?.primaryColor : errors.branding?.accentColor;
  return (
    <FormField label={label} error={error?.message} required>
      {(fieldControl) => (
        <div className="flex items-center gap-2">
          <input
            type="color"
            aria-label={`${label} picker`}
            value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'}
            onChange={(event) => setValue(name, event.target.value, { shouldDirty: true, shouldValidate: true })}
            className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-card p-1 disabled:cursor-not-allowed"
          />
          <Input {...fieldControl} maxLength={7} className="font-mono uppercase" {...register(name)} />
        </div>
      )}
    </FormField>
  );
}

export function BrandingSection({ editable }: { editable: boolean }) {
  return (
    <div className="space-y-6">
      <BrandIdentity editable={editable} />
      <RegionalDefaults />
    </div>
  );
}

function BrandIdentity({ editable }: { editable: boolean }) {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<Settings>();
  const branding = useWatch({ control, name: 'branding' });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadId = useId();

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setUploadError('Upload a PNG, JPG or WebP image.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setUploadError('The logo must be 1 MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      setUploadError(null);
      setValue('branding.logoDataUrl', reader.result, { shouldDirty: true, shouldValidate: true });
    };
    reader.onerror = () => setUploadError('The image could not be read. Try another file.');
    reader.readAsDataURL(file);
  };

  const logoError = uploadError ?? errors.branding?.logoDataUrl?.message ?? null;

  return (
    <fieldset disabled={!editable} className="min-w-0 space-y-6">
      <legend className="sr-only">Branding</legend>
      {!editable ? (
        <p
          className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning-foreground"
          role="note"
        >
          Branding is part of the separate Branding & Entitlements permission. Your role can view it but not change it.
        </p>
      ) : null}
      <SectionCard icon={Palette} title="Brand Identity" description="How your institution appears across the ERP.">
        <div className={GRID}>
          <FormField label="Display Name" error={errors.branding?.displayName?.message} required>
            <Input {...register('branding.displayName')} />
          </FormField>
          <FormField
            label="Tagline"
            error={errors.branding?.tagline?.message}
            hint="Optional"
            className="xl:col-span-2"
          >
            <Input {...register('branding.tagline')} />
          </FormField>
          <ColorField name="branding.primaryColor" label="Primary Colour" />
          <ColorField name="branding.accentColor" label="Secondary Colour" />
        </div>
      </SectionCard>

      <SectionCard icon={ImageUp} title="Logo" description="Shown in the sidebar, reports and documents.">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex size-28 items-center justify-center rounded-lg border bg-muted/40 p-2">
            <LogoMark
              logoDataUrl={branding.logoDataUrl}
              name={branding.displayName || 'Institution'}
              color={branding.primaryColor}
              className="size-full"
            />
          </div>
          <div className="space-y-2">
            <input
              ref={fileRef}
              id={uploadId}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              aria-describedby={`${uploadId}-hint${logoError ? ` ${uploadId}-error` : ''}`}
              onChange={onFile}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <ImageUp aria-hidden />
                {branding.logoDataUrl ? 'Change Logo' : 'Upload Logo'}
              </Button>
              {branding.logoDataUrl ? (
                <Button
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setValue('branding.logoDataUrl', null, { shouldDirty: true })}
                >
                  <Trash2 aria-hidden />
                  Remove
                </Button>
              ) : null}
            </div>
            <p id={`${uploadId}-hint`} className="text-xs text-muted-foreground">
              Recommended 400 × 400 px. PNG, JPG or WebP, up to 1 MB. Demo: the image stays in this browser and is not
              uploaded anywhere.
            </p>
            {logoError ? (
              <p id={`${uploadId}-error`} role="alert" className="text-xs font-medium text-destructive">
                {logoError}
              </p>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={Palette}
        title="Preview"
        description="An approximation of the sidebar header and a primary button."
      >
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3 rounded-lg bg-sidebar px-4 py-3 text-white">
            <LogoMark
              logoDataUrl={branding.logoDataUrl}
              name={branding.displayName || 'Institution'}
              color={branding.primaryColor}
              className="size-10 rounded-md bg-white"
            />
            <div>
              <p className="text-sm font-semibold">{branding.displayName || 'Institution'}</p>
              {branding.tagline ? <p className="text-xs text-white/70">{branding.tagline}</p> : null}
            </div>
          </div>
          <svg viewBox="0 0 160 40" className="h-10 w-40" role="img" aria-label="Primary button preview">
            <rect width="160" height="40" rx="8" fill={branding.primaryColor} />
            <text x="80" y="25" textAnchor="middle" fontSize="14" fontWeight="600" fill="#ffffff">
              Save Changes
            </text>
          </svg>
          <svg viewBox="0 0 120 40" className="h-10 w-30" role="img" aria-label="Secondary colour preview">
            <rect width="120" height="40" rx="20" fill={branding.accentColor} />
            <text x="60" y="25" textAnchor="middle" fontSize="13" fontWeight="600" fill="#ffffff">
              Secondary
            </text>
          </svg>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          The app shell keeps the platform theme in this demo; saved branding is used on this page and in the summary
          panel.
        </p>
        <p className="mt-3 flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Smartphone className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Branding applies inside Edulynk (web portal, reports and documents). It does not create a separate mobile app
          for your institution.
        </p>
      </SectionCard>
    </fieldset>
  );
}

const SAMPLE_DATE = { day: '25', month: '12', year: '2026' };
const SAMPLE_DATES: Record<(typeof DATE_FORMATS)[number], string> = {
  'DD/MM/YYYY': `${SAMPLE_DATE.day}/${SAMPLE_DATE.month}/${SAMPLE_DATE.year}`,
  'MM/DD/YYYY': `${SAMPLE_DATE.month}/${SAMPLE_DATE.day}/${SAMPLE_DATE.year}`,
  'YYYY-MM-DD': `${SAMPLE_DATE.year}-${SAMPLE_DATE.month}-${SAMPLE_DATE.day}`,
};
const TIME_FORMAT_LABELS: Record<(typeof TIME_FORMATS)[number], string> = {
  '12h': '12-hour (2:30 PM)',
  '24h': '24-hour (14:30)',
};

/** Display defaults. Part of the institution profile (institution edit), not the Branding permission. */
function RegionalDefaults() {
  const {
    register,
    formState: { errors },
  } = useFormContext<Settings>();
  const policyErrors = errors.policies;
  return (
    <SectionCard
      icon={Languages}
      title="Regional & Display Defaults"
      description="Defaults for everyone in the institution; users may see them in reports, notices and documents."
    >
      <div className={GRID}>
        <FormField label="Time Zone" error={policyErrors?.timezone?.message} required>
          <Select {...register('policies.timezone')}>
            {TIMEZONES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Default Language" error={policyErrors?.languageId?.message} required>
          <Select {...register('policies.languageId')}>
            {LANGUAGES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Date Format" error={policyErrors?.dateFormat?.message} required>
          <Select {...register('policies.dateFormat')}>
            {DATE_FORMATS.map((format) => (
              <option key={format} value={format}>
                {format} ({SAMPLE_DATES[format]})
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Time Format" error={policyErrors?.timeFormat?.message} required>
          <Select {...register('policies.timeFormat')}>
            {TIME_FORMATS.map((format) => (
              <option key={format} value={format}>
                {TIME_FORMAT_LABELS[format]}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
    </SectionCard>
  );
}
