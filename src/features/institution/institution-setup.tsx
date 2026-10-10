'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Building2, ChevronRight, Download, Eye, Save } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { FormProvider, get, useForm, useWatch, type FieldErrors, type Path } from 'react-hook-form';
import { ErrorState, LoadingState } from '@/components/feedback/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IncompleteFormHint } from '@/components/ui/form-status';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { INSTITUTION_TYPE_LABELS } from '@/config/institution';
import type { Institution } from '@/domain/institution';
import { AcademicStructureTab } from '@/features/institution/academic-structure';
import { CalendarTab } from '@/features/institution/calendar-tab';
import { CampusesTab } from '@/features/institution/campuses-tab';
import { EntitlementsTab } from '@/features/institution/entitlements-tab';
import { GradingTab } from '@/features/institution/grading-tab';
import { BrandingSection, GeneralSection, PoliciesSection } from '@/features/institution/settings-sections';
import {
  CALENDAR_SECTIONS,
  canEditInstitution,
  SETUP_TABS,
  settingsOf,
  STRUCTURE_SECTIONS,
  TAB_FIELDS,
  type CalendarSection,
  type SetupPermissions,
  type SetupSection,
  type SetupTab,
  type StructureSection,
} from '@/features/institution/setup-config';
import { applyFieldErrors } from '@/features/institution/setup-ui';
import {
  LogoCard,
  ModulePermissionsCard,
  PermissionSummaryCard,
  QuickInfoCard,
} from '@/features/institution/side-panels';
import { useUnsavedChangesWarning } from '@/features/institution/use-unsaved-changes';
import { institutionSettingsSchema, type InstitutionSettingsInput } from '@/lib/validation/institution';
import { describeError, useCan, useServiceQuery, useServices } from '@/services/provider';
import type { Services } from '@/services/types';
import { LIVE_VALIDATION } from '@/lib/validation/form-options';

interface InstitutionSetupProps {
  initialTab: SetupTab;
  initialSection: SetupSection | null;
  permissions: SetupPermissions;
  roleId: string;
  roleName: string;
}

const SETTINGS_TABS = new Set<SetupTab>(['general', 'policies', 'branding']);

function tabLabel(tab: SetupTab): string {
  return SETUP_TABS.find((option) => option.value === tab)?.label ?? '';
}

type SettingsErrors = FieldErrors<InstitutionSettingsInput>;

/** Field errors are nested objects; a leaf has a `message`. */
function countErrors(node: unknown): number {
  if (!node || typeof node !== 'object') return 0;
  if ('message' in node && typeof node.message === 'string') return 1;
  return Object.entries(node).reduce((total, [key, value]) => (key === 'ref' ? total : total + countErrors(value)), 0);
}

function firstErrorPath(node: unknown, path: string): string | null {
  if (!node || typeof node !== 'object') return null;
  if ('message' in node && typeof node.message === 'string') return path;
  for (const [key, value] of Object.entries(node)) {
    if (key === 'ref') continue;
    const found = firstErrorPath(value, `${path}.${key}`);
    if (found) return found;
  }
  return null;
}

/** Tabs whose settings fields currently have validation errors, in tab order. */
function tabsWithErrors(errors: SettingsErrors): SetupTab[] {
  return SETUP_TABS.map((tab) => tab.value).filter((tab) =>
    (TAB_FIELDS[tab] ?? []).some((path) => countErrors(get(errors, path)) > 0),
  );
}

function errorCount(errors: SettingsErrors, tab: SetupTab): number {
  return (TAB_FIELDS[tab] ?? []).reduce((total, path) => total + countErrors(get(errors, path)), 0);
}

function firstErrorIn(errors: SettingsErrors, tab: SetupTab): string | null {
  for (const path of TAB_FIELDS[tab] ?? []) {
    const found = firstErrorPath(get(errors, path), path);
    if (found) return found;
  }
  return null;
}

export function InstitutionSetup(props: InstitutionSetupProps) {
  const institution = useServiceQuery((s) => s.institution.getInstitution(), []);
  if (institution.error && !institution.data) {
    return (
      <div className="space-y-6">
        <SetupHeading tab={props.initialTab} />
        <ErrorState
          title="Institution settings could not be loaded"
          description={institution.error}
          action={
            <Button variant="outline" onClick={institution.reload}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }
  if (!institution.data) {
    return (
      <div className="space-y-6">
        <SetupHeading tab={props.initialTab} />
        <Skeleton className="h-10 w-full" />
        <LoadingState label="Loading institution settings" rows={6} />
      </div>
    );
  }
  return <SetupWorkspace {...props} institution={institution.data} />;
}

function SetupHeading({ tab, actions }: { tab: SetupTab; actions?: ReactNode }) {
  return (
    <div className="space-y-3">
      <nav aria-label="Page breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <li>
            <Link href="/dashboard" prefetch={false} className="hover:text-foreground hover:underline">
              Dashboard
            </Link>
          </li>
          <li className="flex items-center gap-1">
            <ChevronRight className="size-3" aria-hidden />
            <Link href="/institution-setup" prefetch={false} className="hover:text-foreground hover:underline">
              Institution Setup
            </Link>
          </li>
          <li className="flex items-center gap-1">
            <ChevronRight className="size-3" aria-hidden />
            <span aria-current="page" className="font-medium text-foreground">
              {tabLabel(tab)}
            </span>
          </li>
        </ol>
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden>
            <Building2 className="size-5" />
          </span>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Institution Setup</h1>
            <p className="text-sm text-muted-foreground">
              Manage institution profile, campuses, academic configuration and settings.
            </p>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

async function exportSetup(services: Services): Promise<void> {
  const institution = services.institution;
  const [profile, campuses, academicYears, classes, departments, subjects, academicStructure, grading] =
    await Promise.all([
      institution.getInstitution(),
      institution.listCampuses(),
      institution.listAcademicYears(),
      institution.listClasses(),
      institution.listDepartments(),
      institution.listSubjects(),
      institution.listAcademicUnits(),
      institution.getGradingConfig(),
    ]);
  const academicTerms = (await Promise.all(academicYears.map((year) => institution.listAcademicTerms(year.id)))).flat();
  const { branding, ...rest } = profile;
  const payload = {
    exportedAt: new Date().toISOString(),
    institution: { ...rest, branding: { ...branding, logoDataUrl: branding.logoDataUrl ? '(image omitted)' : null } },
    campuses,
    academicYears,
    academicTerms,
    classes,
    departments,
    subjects,
    academicStructure,
    grading,
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `institution-setup-${profile.shortName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function SetupWorkspace({
  institution,
  initialTab,
  initialSection,
  permissions,
  roleId,
  roleName,
}: InstitutionSetupProps & { institution: Institution }) {
  const router = useRouter();
  const pathname = usePathname();
  const services = useServices();
  const toast = useToast();
  const can = useCan();
  const [tab, setTab] = useState(initialTab);
  const [structureSection, setStructureSection] = useState<StructureSection | null>(
    STRUCTURE_SECTIONS.find((option) => option.value === initialSection)?.value ?? null,
  );
  const [calendarSection, setCalendarSection] = useState<CalendarSection>(
    CALENDAR_SECTIONS.find((option) => option.value === initialSection)?.value ?? 'years',
  );
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [exporting, setExporting] = useState(false);
  const overview = useServiceQuery((s) => s.institution.getOverview(), []);
  const readOnly = !canEditInstitution(permissions);

  const form = useForm<InstitutionSettingsInput>({
    resolver: zodResolver(institutionSettingsSchema),
    ...LIVE_VALIDATION,
    defaultValues: settingsOf(institution),
  });
  const {
    control,
    handleSubmit,
    reset,
    setError,
    setFocus,
    setValue,
    formState: { errors, isDirty, isSubmitting, isValid },
  } = form;
  const [branding, formType] = useWatch({ control, name: ['branding', 'type'] });
  useUnsavedChangesWarning(isDirty && !readOnly);

  const urlFor = (nextTab: SetupTab, nextSection: SetupSection | null) => {
    if (nextTab === 'general') return pathname;
    return `${pathname}?tab=${nextTab}${nextSection ? `&section=${nextSection}` : ''}`;
  };
  const changeTab = (next: SetupTab) => {
    setTab(next);
    const nextSection = next === 'structure' ? structureSection : next === 'calendar' ? calendarSection : null;
    router.replace(urlFor(next, nextSection), { scroll: false });
  };
  const changeStructureSection = (next: StructureSection) => {
    setStructureSection(next);
    router.replace(urlFor('structure', next), { scroll: false });
  };
  const changeCalendarSection = (next: CalendarSection) => {
    setCalendarSection(next);
    router.replace(urlFor('calendar', next), { scroll: false });
  };

  const showFirstError = (invalid: SettingsErrors) => {
    const erroredTabs = tabsWithErrors(invalid);
    const target = erroredTabs.includes(tab) ? tab : erroredTabs[0];
    if (!target) return;
    if (target !== tab) changeTab(target);
    const path = firstErrorIn(invalid, target);
    if (path) requestAnimationFrame(() => setFocus(path as Path<InstitutionSettingsInput>));
  };

  const save = handleSubmit(
    async (values) => {
      if (!services) return;
      try {
        const saved = await services.institution.updateInstitution(values);
        reset(settingsOf(saved));
        toast.notify({
          tone: 'success',
          title: 'Institution settings saved',
          description:
            saved.type !== institution.type
              ? `The institution is now set up as a ${INSTITUTION_TYPE_LABELS[saved.type]}. Earlier details are kept.`
              : 'Demo: changes are kept in this browser and used across the ERP screens.',
        });
      } catch (error) {
        const marked = applyFieldErrors(error, setError, Object.keys(values));
        if (marked) showFirstError(form.formState.errors);
        toast.notify({ tone: 'error', title: 'Settings not saved', description: describeError(error) });
      }
    },
    (invalid) => {
      showFirstError(invalid);
      const labels = tabsWithErrors(invalid).map(tabLabel);
      toast.notify({
        tone: 'error',
        title: 'Some details need attention',
        description: `Check the highlighted fields on: ${labels.join(', ')}.`,
      });
    },
  );

  const runExport = async () => {
    if (!services) return;
    setExporting(true);
    try {
      await exportSetup(services);
    } catch (error) {
      toast.notify({ tone: 'error', title: 'Export failed', description: describeError(error) });
    } finally {
      setExporting(false);
    }
  };

  const settingsTab = SETTINGS_TABS.has(tab);
  const erroredTabs = tabsWithErrors(errors);
  const options = SETUP_TABS.map((option) => {
    const count = errorCount(errors, option.value);
    return count > 0 ? { ...option, count } : option;
  });

  const actions = (
    <>
      {permissions.export ? (
        <Button variant="outline" onClick={() => void runExport()} loading={exporting} disabled={!services}>
          <Download aria-hidden />
          {exporting ? 'Exporting…' : 'Export'}
        </Button>
      ) : null}
      {readOnly ? (
        <Badge variant="neutral" className="h-9 gap-1.5 rounded-md px-3">
          <Eye className="size-3.5" aria-hidden />
          Read-only
        </Badge>
      ) : !settingsTab && !isDirty ? null : (
        <>
          {isDirty ? (
            <span role="status" className="flex items-center gap-1.5 text-xs font-medium text-warning-foreground">
              <span className="size-2 rounded-full bg-warning" aria-hidden />
              Unsaved changes
            </span>
          ) : null}
          <Button variant="outline" onClick={() => setConfirmDiscard(true)} disabled={!isDirty || isSubmitting}>
            Cancel
          </Button>
          {!isValid && !isSubmitting ? <IncompleteFormHint onReveal={() => void save()} /> : null}
          <Button onClick={() => void save()} loading={isSubmitting} disabled={!isValid || !isDirty || !services}>
            <Save aria-hidden />
            {isSubmitting ? 'Saving…' : 'Save Changes'}
          </Button>
        </>
      )}
    </>
  );

  return (
    <FormProvider {...form}>
      <div className="space-y-6">
        <SetupHeading tab={tab} actions={actions} />

        {readOnly ? (
          <p role="note" className="flex items-start gap-2 rounded-md border bg-muted/50 px-4 py-3 text-sm">
            <Eye className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            {permissions.edit
              ? `Your access is limited to specific campuses, so institution-wide settings are read-only. You can still manage your own campuses where your role allows.`
              : `Your role (${roleName}) can view Institution Setup but cannot change it. Ask an institution administrator if something needs updating.`}
          </p>
        ) : null}

        {erroredTabs.length > 0 ? (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm"
          >
            <AlertTriangle className="size-4 text-destructive" aria-hidden />
            <span className="font-medium">Fix the highlighted fields before saving:</span>
            {erroredTabs.map((name) => (
              <Button key={name} variant="link" size="sm" className="h-auto p-0" onClick={() => changeTab(name)}>
                {tabLabel(name)}
              </Button>
            ))}
          </div>
        ) : null}

        <Tabs label="Institution Setup sections" value={tab} options={options} onChange={changeTab}>
          {settingsTab ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="min-w-0 space-y-6">
                <form onSubmit={(event) => void save(event)} noValidate aria-label={`${tabLabel(tab)} form`}>
                  <fieldset disabled={readOnly || isSubmitting} className="min-w-0">
                    <legend className="sr-only">{tabLabel(tab)}</legend>
                    {tab === 'general' ? (
                      <GeneralSection savedType={institution.type} canChangeType={permissions.approve} />
                    ) : null}
                    {tab === 'policies' ? <PoliciesSection type={formType} /> : null}
                    {tab === 'branding' ? <BrandingSection editable={!readOnly && permissions.brandingEdit} /> : null}
                  </fieldset>
                </form>
                {tab === 'general' ? (
                  <ModulePermissionsCard
                    permissions={permissions}
                    roleName={roleName}
                    canManageRoles={can('users', 'view')}
                  />
                ) : null}
              </div>
              <aside className="space-y-6" aria-label="Institution summary">
                <LogoCard
                  branding={branding}
                  canChange={!readOnly && permissions.brandingEdit}
                  onChange={() => changeTab('branding')}
                  onRemove={() => setValue('branding.logoDataUrl', null, { shouldDirty: true })}
                />
                <QuickInfoCard institution={institution} overview={overview.data} onNavigate={changeTab} />
                <PermissionSummaryCard permissions={permissions} roleId={roleId} roleName={roleName} />
              </aside>
            </div>
          ) : tab === 'campuses' ? (
            <CampusesTab permissions={permissions} institutionType={institution.type} />
          ) : tab === 'structure' ? (
            <AcademicStructureTab
              institution={institution}
              pendingType={formType !== institution.type ? formType : null}
              section={structureSection}
              onSectionChange={changeStructureSection}
              permissions={permissions}
            />
          ) : tab === 'calendar' ? (
            <CalendarTab
              institutionType={institution.type}
              structure={institution.structure[institution.type]}
              section={calendarSection}
              onSectionChange={changeCalendarSection}
              permissions={permissions}
            />
          ) : tab === 'grading' ? (
            <GradingTab institutionType={institution.type} permissions={permissions} />
          ) : (
            <EntitlementsTab
              institutionType={institution.type}
              plan={institution.plan}
              canManageRoles={can('users', 'view')}
            />
          )}
        </Tabs>
      </div>

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard unsaved changes?"
        description="Your edits to the institution settings will be lost and the saved values restored."
        confirmLabel="Discard changes"
        destructive
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          reset();
          setConfirmDiscard(false);
          toast.notify({ tone: 'info', title: 'Changes discarded' });
        }}
      />
    </FormProvider>
  );
}
