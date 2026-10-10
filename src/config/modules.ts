/**
 * The institution ERP module catalogue: the single source for navigation, breadcrumbs, route guards and permission
 * matrices. Platform administration (tenant provisioning, subscriptions, super admin) belongs to the control plane and
 * is deliberately absent.
 */

export const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete', 'export', 'approve'] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const MODULE_IDS = [
  'dashboard',
  'institution',
  'users',
  'admissions',
  'students',
  'guardians',
  'attendance',
  'timetable',
  'fees',
  'examinations',
  'homework',
  'communication',
  'staff',
  'payroll',
  'library',
  'transport',
  'hostel',
  'inventory',
  'procurement',
  'reports',
  'audit',
  'documents',
  'bulk-import',
  'branding',
  'help',
  'college',
  'ai-insights',
] as const;
export type ModuleId = (typeof MODULE_IDS)[number];

/** `module:action`, e.g. `students:edit`. The shape the identity service is expected to assert for real users. */
export type Grant = `${ModuleId}:${PermissionAction}`;

export const NAV_GROUP_IDS = [
  'overview',
  'institution',
  'academics',
  'finance',
  'operations',
  'administration',
] as const;
export type NavGroupId = (typeof NAV_GROUP_IDS)[number];

export const MODULE_ICONS = [
  'dashboard',
  'building',
  'users',
  'admissions',
  'students',
  'guardians',
  'attendance',
  'calendar',
  'fees',
  'exams',
  'homework',
  'communication',
  'staff',
  'payroll',
  'library',
  'transport',
  'hostel',
  'inventory',
  'procurement',
  'reports',
  'audit',
  'documents',
  'import',
  'branding',
  'help',
  'college',
  'insights',
] as const;
export type ModuleIcon = (typeof MODULE_ICONS)[number];

export interface ModuleDefinition {
  readonly id: ModuleId;
  readonly label: string;
  readonly href: `/${string}`;
  readonly icon: ModuleIcon;
  readonly group: NavGroupId;
  readonly description: string;
  /** Delivery phase of the approved plan; screens before their phase show a module-specific outline. */
  readonly phase: 1 | 2 | 3 | 4 | 5 | 6;
  readonly capabilities: readonly string[];
  /** Modules whose permissions can never be granted as custom (per-user) permissions. */
  readonly sensitive?: boolean;
  /** Shown as a concept, never as a working feature. */
  readonly concept?: boolean;
}

export const NAV_GROUP_LABELS: Record<NavGroupId, string> = {
  overview: 'Overview',
  institution: 'Institution',
  academics: 'Academics',
  finance: 'Finance',
  operations: 'People & Operations',
  administration: 'Administration',
};

export const MODULES: readonly ModuleDefinition[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'dashboard',
    group: 'overview',
    phase: 3,
    description: 'Institution-wide metrics, alerts and quick actions.',
    capabilities: ['Student, staff and class metrics', 'Attendance and fee trends', 'Pending actions and events'],
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    href: '/reports',
    icon: 'reports',
    group: 'overview',
    phase: 6,
    description: 'Cross-module reports with filters and exports.',
    capabilities: ['Enrolment and attendance reports', 'Fee collection reports', 'Result analysis', 'CSV export'],
  },
  {
    id: 'ai-insights',
    label: 'AI-Assisted Insights',
    href: '/ai-insights',
    icon: 'insights',
    group: 'overview',
    phase: 6,
    concept: true,
    description: 'Future concept: assisted insights over institution data. No model is connected.',
    capabilities: ['At-risk attendance patterns', 'Fee default early warnings', 'Natural-language report queries'],
  },
  {
    id: 'institution',
    label: 'Institution Setup',
    href: '/institution-setup',
    icon: 'building',
    group: 'institution',
    phase: 4,
    description: 'Institution profile, campuses, academic years, classes and sections.',
    capabilities: ['Institution profile', 'Campuses', 'Academic years and terms', 'Classes, sections and subjects'],
  },
  {
    id: 'users',
    label: 'Users & Access',
    href: '/users',
    icon: 'users',
    group: 'institution',
    phase: 3,
    sensitive: true,
    description: 'User accounts, invitations, roles and permissions.',
    capabilities: ['User directory', 'Create-user wizard', 'Role and permission matrix', 'Invitations'],
  },
  {
    id: 'branding',
    label: 'Branding & Entitlements',
    href: '/branding',
    icon: 'branding',
    group: 'institution',
    phase: 6,
    sensitive: true,
    description: 'Institution white-label branding and the feature entitlements of the current plan.',
    capabilities: ['Logo, name and colours', 'Entitled modules (read-only)'],
  },
  {
    id: 'college',
    label: 'College ERP',
    href: '/college',
    icon: 'college',
    group: 'institution',
    phase: 6,
    description: 'Programmes, semesters, credits and electives for higher-education campuses.',
    capabilities: ['Programmes and semesters', 'Credit structure', 'Elective allocation'],
  },
  {
    id: 'admissions',
    label: 'Admissions',
    href: '/admissions',
    icon: 'admissions',
    group: 'academics',
    phase: 4,
    description: 'Enquiries, applications, review and enrolment.',
    capabilities: ['Enquiry pipeline', 'Applications and review', 'Enrolment into sections'],
  },
  {
    id: 'students',
    label: 'Students',
    href: '/students',
    icon: 'students',
    group: 'academics',
    phase: 4,
    description: 'Student records, enrolment and academic history.',
    capabilities: ['Student directory', 'Profiles and documents', 'Section allocation', 'Promotion and transfer'],
  },
  {
    id: 'guardians',
    label: 'Parents & Guardians',
    href: '/guardians',
    icon: 'guardians',
    group: 'academics',
    phase: 4,
    description: 'Guardian contacts and their linked students.',
    capabilities: ['Guardian directory', 'Student links', 'Contact preferences'],
  },
  {
    id: 'attendance',
    label: 'Attendance',
    href: '/attendance',
    icon: 'attendance',
    group: 'academics',
    phase: 4,
    description: 'Daily attendance by section and attendance reports.',
    capabilities: ['Mark attendance by section', 'Daily and monthly summaries', 'Absentee follow-up'],
  },
  {
    id: 'timetable',
    label: 'Timetable & Calendar',
    href: '/timetable',
    icon: 'calendar',
    group: 'academics',
    phase: 4,
    description: 'Class timetables, the academic calendar and events.',
    capabilities: ['Section timetables', 'Teacher timetables', 'Academic calendar and holidays'],
  },
  {
    id: 'examinations',
    label: 'Examinations & Results',
    href: '/examinations',
    icon: 'exams',
    group: 'academics',
    phase: 4,
    description: 'Exam schedules, marks entry and results.',
    capabilities: ['Exam schedules', 'Marks entry', 'Result publication', 'Report cards'],
  },
  {
    id: 'homework',
    label: 'Homework & Resources',
    href: '/homework',
    icon: 'homework',
    group: 'academics',
    phase: 5,
    description: 'Homework assignments and learning resources.',
    capabilities: ['Assign homework', 'Submissions', 'Learning resource library'],
  },
  {
    id: 'fees',
    label: 'Fees & Finance',
    href: '/fees',
    icon: 'fees',
    group: 'finance',
    phase: 4,
    description: 'Fee structures, invoices, payments and refunds.',
    capabilities: ['Fee structures', 'Invoices and dues', 'Payments and receipts', 'Refund approvals'],
  },
  {
    id: 'payroll',
    label: 'Payroll',
    href: '/payroll',
    icon: 'payroll',
    group: 'finance',
    phase: 5,
    description: 'Salary structures, payroll runs and payslips.',
    capabilities: ['Salary structures', 'Monthly payroll runs', 'Payslips'],
  },
  {
    id: 'procurement',
    label: 'Procurement & Vendors',
    href: '/procurement',
    icon: 'procurement',
    group: 'finance',
    phase: 5,
    description: 'Vendors, purchase requests and purchase orders.',
    capabilities: ['Vendor directory', 'Purchase requests and approvals', 'Purchase orders'],
  },
  {
    id: 'inventory',
    label: 'Inventory & Assets',
    href: '/inventory',
    icon: 'inventory',
    group: 'finance',
    phase: 5,
    description: 'Stock, fixed assets and their allocation.',
    capabilities: ['Stock items', 'Asset register', 'Issue and return'],
  },
  {
    id: 'staff',
    label: 'Staff & HR',
    href: '/staff',
    icon: 'staff',
    group: 'operations',
    phase: 5,
    description: 'Staff records, leave and staff attendance.',
    capabilities: ['Staff directory', 'Leave requests and approval', 'Staff attendance'],
  },
  {
    id: 'communication',
    label: 'Communication',
    href: '/communication',
    icon: 'communication',
    group: 'operations',
    phase: 5,
    description: 'Announcements and notifications to staff, students and guardians.',
    capabilities: ['Announcements', 'Audience targeting', 'Notification history'],
  },
  {
    id: 'library',
    label: 'Library',
    href: '/library',
    icon: 'library',
    group: 'operations',
    phase: 5,
    description: 'Catalogue, issues, returns and fines.',
    capabilities: ['Catalogue', 'Issue and return', 'Overdue tracking'],
  },
  {
    id: 'transport',
    label: 'Transport',
    href: '/transport',
    icon: 'transport',
    group: 'operations',
    phase: 5,
    description: 'Routes, stops, vehicles and student allocation.',
    capabilities: ['Routes and stops', 'Vehicles and drivers', 'Student allocation'],
  },
  {
    id: 'hostel',
    label: 'Hostel',
    href: '/hostel',
    icon: 'hostel',
    group: 'operations',
    phase: 5,
    description: 'Hostel blocks, rooms and allocation.',
    capabilities: ['Blocks and rooms', 'Room allocation', 'Occupancy'],
  },
  {
    id: 'audit',
    label: 'Audit Trail',
    href: '/audit',
    icon: 'audit',
    group: 'administration',
    phase: 6,
    sensitive: true,
    description: 'Who changed what, and when.',
    capabilities: ['Event log', 'Filters by actor, module and date', 'Export'],
  },
  {
    id: 'documents',
    label: 'Documents',
    href: '/documents',
    icon: 'documents',
    group: 'administration',
    phase: 6,
    description: 'Institution documents, certificates and templates.',
    capabilities: ['Document library', 'Certificates', 'Templates'],
  },
  {
    id: 'bulk-import',
    label: 'Bulk Import',
    href: '/bulk-import',
    icon: 'import',
    group: 'administration',
    phase: 6,
    description: 'Import students, staff and guardians from CSV with validation.',
    capabilities: ['CSV templates', 'Validation preview', 'Import history'],
  },
  {
    id: 'help',
    label: 'Help & Onboarding',
    href: '/help',
    icon: 'help',
    group: 'administration',
    phase: 6,
    description: 'Guides, onboarding checklist and support contacts.',
    capabilities: ['Onboarding checklist', 'Guides', 'Support'],
  },
];

const MODULES_BY_ID = new Map(MODULES.map((module) => [module.id, module]));

export function getModule(id: ModuleId): ModuleDefinition {
  const definition = MODULES_BY_ID.get(id);
  if (!definition) throw new Error(`Unknown module: ${id}`);
  return definition;
}

export function isModuleId(value: string): value is ModuleId {
  return (MODULE_IDS as readonly string[]).includes(value);
}

export function isGrant(value: string): value is Grant {
  const [module, action, extra] = value.split(':');
  return (
    extra === undefined &&
    module !== undefined &&
    action !== undefined &&
    isModuleId(module) &&
    (PERMISSION_ACTIONS as readonly string[]).includes(action)
  );
}

/** The module whose route contains `pathname` (`/users/new` belongs to `users`). */
export function findModuleByPath(pathname: string): ModuleDefinition | undefined {
  const normalised = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return MODULES.find((module) => normalised === module.href || normalised.startsWith(`${module.href}/`));
}
