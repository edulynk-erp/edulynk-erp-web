import type { PermissionAction } from '@/config/modules';

export const SETUP_TABS = [
  { value: 'general', label: 'General Information' },
  { value: 'campuses', label: 'Campuses & Locations' },
  { value: 'structure', label: 'Academic Structure' },
  { value: 'calendar', label: 'Academic Calendar' },
  { value: 'grading', label: 'Grading & Assessment' },
  { value: 'branding', label: 'Branding & Appearance' },
  { value: 'policies', label: 'Policies & Preferences' },
  { value: 'entitlements', label: 'Feature Entitlements' },
] as const;
export type SetupTab = (typeof SETUP_TABS)[number]['value'];

/** Sub-sections of the Academic Structure and Academic Calendar tabs, kept in the URL as `section`. */
export const STRUCTURE_SECTIONS = [
  { value: 'structure', label: 'Structure' },
  { value: 'classes', label: 'Classes & Sections' },
  { value: 'subjects', label: 'Subjects' },
  { value: 'departments', label: 'Departments' },
] as const;
export type StructureSection = (typeof STRUCTURE_SECTIONS)[number]['value'];

export const CALENDAR_SECTIONS = [
  { value: 'years', label: 'Academic Years' },
  { value: 'terms', label: 'Terms & Semesters' },
  { value: 'events', label: 'Holidays, Exams & Events' },
] as const;
export type CalendarSection = (typeof CALENDAR_SECTIONS)[number]['value'];

export type SetupSection = StructureSection | CalendarSection;

/** Old `?tab=academic&section=…` links open the tab that now holds that section. */
const LEGACY_ACADEMIC: Record<string, { tab: SetupTab; section: SetupSection }> = {
  years: { tab: 'calendar', section: 'years' },
  calendar: { tab: 'calendar', section: 'events' },
  classes: { tab: 'structure', section: 'classes' },
  departments: { tab: 'structure', section: 'departments' },
  subjects: { tab: 'structure', section: 'subjects' },
};

export function parseSetupLocation(tab: unknown, section: unknown): { tab: SetupTab; section: SetupSection | null } {
  if (tab === 'academic') {
    return LEGACY_ACADEMIC[typeof section === 'string' ? section : ''] ?? { tab: 'structure', section: null };
  }
  const parsed = SETUP_TABS.find((option) => option.value === tab)?.value ?? 'general';
  const sections: readonly { value: SetupSection }[] =
    parsed === 'structure' ? STRUCTURE_SECTIONS : parsed === 'calendar' ? CALENDAR_SECTIONS : [];
  return { tab: parsed, section: sections.find((option) => option.value === section)?.value ?? null };
}

/**
 * What the signed-in principal may do in Institution Setup. Computed on the server from the session's grants and
 * passed down; the service layer re-checks every write.
 */
export type SetupPermissions = Readonly<Record<PermissionAction, boolean>> & {
  /** Branding is the separate, sensitive `branding` module. */
  readonly brandingEdit: boolean;
  /** Whether the user covers every campus. Campus-scoped users cannot change institution-wide settings. */
  readonly institutionWide: boolean;
  /** Campuses a campus-scoped user may manage; empty when `institutionWide`. */
  readonly campusIds: readonly string[];
};

/** Whether the user may change institution-wide settings (the profile, structure naming, calendar and grading). */
export function canEditInstitution(permissions: SetupPermissions): boolean {
  return permissions.edit && permissions.institutionWide;
}

/** Permissions for records that are institution-wide (years, terms, subjects, departments, grading). */
export function institutionWidePermissions(permissions: SetupPermissions): SetupPermissions {
  if (permissions.institutionWide) return permissions;
  return { ...permissions, create: false, edit: false, delete: false, approve: false };
}

export function canManageCampus(permissions: SetupPermissions, campusId: string | null): boolean {
  if (permissions.institutionWide) return true;
  return campusId !== null && permissions.campusIds.includes(campusId);
}

const POLICY_FIELDS = [
  'workingDays',
  'schoolStartsAt',
  'schoolEndsAt',
  'minimumAttendancePercent',
  'lateArrivalGraceMinutes',
  'feeDueDay',
  'lateFeePerDay',
  'notifyGuardiansOnAbsence',
  'sendFeeReminders',
  'publishResultsOnline',
] as const;

/** Settings-form field paths, by the tab that shows them. A path covers every field nested under it. */
export const TAB_FIELDS: Readonly<Partial<Record<SetupTab, readonly string[]>>> = {
  general: [
    'name',
    'shortName',
    'type',
    'category',
    'typeDetails',
    'establishedYear',
    'website',
    'contactEmail',
    'studentCapacity',
    'mediumId',
    'contactPerson',
    'contactDesignation',
    'phone',
    'alternatePhone',
    'contactPersonEmail',
    'supportEmail',
    'addressLine1',
    'addressLine2',
    'countryId',
    'stateId',
    'districtId',
    'cityId',
    'pinCode',
  ],
  policies: POLICY_FIELDS.map((field) => `policies.${field}`),
  branding: ['branding', 'policies.timezone', 'policies.languageId', 'policies.dateFormat', 'policies.timeFormat'],
};

export { settingsOf } from '@/lib/validation/institution';
