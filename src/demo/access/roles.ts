import { MODULES, PERMISSION_ACTIONS, type Grant, type ModuleId, type PermissionAction } from '@/config/modules';
import type { Role } from '@/domain/access';

/**
 * DEMO FIXTURE. Role definitions and their permission matrices for the simulated institution. Real roles and grants
 * will come from the identity service; these exist so navigation and access-denied states can be exercised.
 */

type Matrix = Partial<Record<ModuleId, readonly PermissionAction[] | 'all'>>;

const ALL_MODULES = MODULES.map((module) => module.id);
const VIEW: readonly PermissionAction[] = ['view'];
const VIEW_EXPORT: readonly PermissionAction[] = ['view', 'export'];
const CONTRIBUTE: readonly PermissionAction[] = ['view', 'create', 'edit'];
const MANAGE: readonly PermissionAction[] = ['view', 'create', 'edit', 'delete', 'export'];

function grantsFrom(matrix: Matrix): Grant[] {
  const grants: Grant[] = [];
  for (const moduleId of ALL_MODULES) {
    const actions = matrix[moduleId];
    if (!actions) continue;
    for (const action of actions === 'all' ? PERMISSION_ACTIONS : actions) grants.push(`${moduleId}:${action}`);
  }
  return grants;
}

const everyone: Matrix = { dashboard: VIEW, help: VIEW };

interface RoleSpec {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly allowsCustomPermissions: boolean;
  readonly matrix: Matrix;
}

const SPECS: readonly RoleSpec[] = [
  {
    id: 'owner',
    name: 'Institution Owner',
    description: 'Institution-wide metrics, user and role management, and every institution module.',
    allowsCustomPermissions: false,
    matrix: Object.fromEntries(ALL_MODULES.map((module) => [module, 'all'])),
  },
  {
    id: 'admin',
    name: 'Institution Admin',
    description: 'Day-to-day configuration and user administration.',
    allowsCustomPermissions: false,
    matrix: {
      ...Object.fromEntries(ALL_MODULES.map((module) => [module, MANAGE])),
      admissions: [...MANAGE, 'approve'],
      staff: [...MANAGE, 'approve'],
      branding: CONTRIBUTE,
      audit: VIEW_EXPORT,
      'ai-insights': VIEW,
    },
  },
  {
    id: 'principal',
    name: 'Principal',
    description: 'Academic leadership: students, attendance, timetable, examinations, results and reports.',
    allowsCustomPermissions: false,
    matrix: {
      ...everyone,
      admissions: ['view', 'approve'],
      students: [...CONTRIBUTE, 'export'],
      guardians: VIEW,
      attendance: [...CONTRIBUTE, 'export'],
      timetable: [...CONTRIBUTE, 'approve'],
      examinations: [...CONTRIBUTE, 'export', 'approve'],
      homework: VIEW,
      communication: CONTRIBUTE,
      staff: ['view', 'approve'],
      reports: VIEW_EXPORT,
      documents: VIEW,
      'ai-insights': VIEW,
    },
  },
  {
    id: 'vice-principal',
    name: 'Vice Principal',
    description: 'Supports the principal across academics, attendance and discipline.',
    allowsCustomPermissions: true,
    matrix: {
      ...everyone,
      admissions: VIEW,
      students: CONTRIBUTE,
      guardians: VIEW,
      attendance: CONTRIBUTE,
      timetable: CONTRIBUTE,
      examinations: CONTRIBUTE,
      homework: VIEW,
      communication: CONTRIBUTE,
      staff: VIEW,
      reports: VIEW,
    },
  },
  {
    id: 'academic-coordinator',
    name: 'Academic Coordinator',
    description: 'Plans timetables, examinations and homework across sections.',
    allowsCustomPermissions: true,
    matrix: {
      ...everyone,
      students: VIEW,
      attendance: VIEW,
      timetable: MANAGE,
      examinations: MANAGE,
      homework: MANAGE,
      communication: CONTRIBUTE,
      reports: VIEW,
    },
  },
  {
    id: 'teacher',
    name: 'Teacher',
    description: 'Assigned classes: attendance, timetable, homework and marks entry.',
    allowsCustomPermissions: true,
    matrix: {
      ...everyone,
      students: VIEW,
      attendance: CONTRIBUTE,
      timetable: VIEW,
      examinations: ['view', 'edit'],
      homework: MANAGE,
      communication: ['view', 'create'],
      library: VIEW,
      documents: VIEW,
    },
  },
  {
    id: 'admissions-officer',
    name: 'Admissions Officer',
    description: 'Enquiries, applications and enrolment.',
    allowsCustomPermissions: true,
    matrix: {
      ...everyone,
      admissions: MANAGE,
      students: ['view', 'create'],
      guardians: CONTRIBUTE,
      communication: ['view', 'create'],
      documents: CONTRIBUTE,
      reports: VIEW,
    },
  },
  {
    id: 'accountant',
    name: 'Accountant / Fee Manager',
    description: 'Fees, invoices, payments, refunds and finance reports.',
    allowsCustomPermissions: true,
    matrix: {
      ...everyone,
      fees: 'all',
      students: VIEW,
      guardians: VIEW,
      payroll: VIEW,
      procurement: VIEW,
      inventory: VIEW,
      reports: VIEW_EXPORT,
    },
  },
  {
    id: 'hr-admin',
    name: 'HR / Payroll Admin',
    description: 'Staff records, leave, staff attendance and payroll.',
    allowsCustomPermissions: true,
    matrix: {
      ...everyone,
      staff: 'all',
      payroll: 'all',
      attendance: VIEW,
      documents: CONTRIBUTE,
      reports: VIEW_EXPORT,
    },
  },
  {
    id: 'librarian',
    name: 'Librarian',
    description: 'Library catalogue, issues and returns.',
    allowsCustomPermissions: true,
    matrix: { ...everyone, library: MANAGE, students: VIEW, staff: VIEW },
  },
  {
    id: 'transport-hostel',
    name: 'Transport / Hostel Staff',
    description: 'Transport routes and hostel allocation.',
    allowsCustomPermissions: true,
    matrix: { ...everyone, transport: MANAGE, hostel: MANAGE, students: VIEW, guardians: VIEW },
  },
  {
    id: 'auditor',
    name: 'Auditor / Read-only',
    description: 'Read-only access with exports for audit and compliance.',
    allowsCustomPermissions: false,
    matrix: {
      ...Object.fromEntries(
        ALL_MODULES.filter((module) => module !== 'ai-insights' && module !== 'bulk-import').map((module) => [
          module,
          VIEW_EXPORT,
        ]),
      ),
    },
  },
];

export const DEMO_ROLES: readonly Role[] = SPECS.map(({ matrix, ...role }) => ({
  ...role,
  grants: grantsFrom(matrix),
}));

export function findDemoRole(id: string): Role | undefined {
  return DEMO_ROLES.find((role) => role.id === id);
}
