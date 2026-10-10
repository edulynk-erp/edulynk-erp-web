import type { Role, RoleOverride } from '@/domain/access';
import type { AdmissionApplication } from '@/domain/admissions';
import type { SectionAttendance } from '@/domain/attendance';
import type { AuditEvent } from '@/domain/audit';
import type { IsoDate } from '@/domain/common';
import type { CalendarEvent, Notification } from '@/domain/communication';
import type { Examination, SectionResult } from '@/domain/examinations';
import type { FeeInvoice } from '@/domain/fees';
import type {
  AcademicTerm,
  AcademicUnit,
  AcademicYear,
  Campus,
  Department,
  FeatureEntitlement,
  GradingConfig,
  Institution,
  SchoolClass,
  Section,
  Subject,
} from '@/domain/institution';
import type { Invitation, SimulatedEmail } from '@/domain/onboarding';
import type { LeaveRequest, StaffMember } from '@/domain/staff';
import type { Guardian, Student } from '@/domain/students';
import type { User } from '@/domain/users';

/** The whole simulated institution, held in browser memory. */
export interface DemoDatabase {
  readonly seedDate: IsoDate;
  readonly institution: Institution;
  readonly campuses: readonly Campus[];
  readonly academicYears: readonly AcademicYear[];
  readonly academicTerms: readonly AcademicTerm[];
  readonly academicUnits: readonly AcademicUnit[];
  readonly grading: GradingConfig;
  /** Platform-managed and read-only, so never persisted from the browser. */
  readonly entitlements: readonly FeatureEntitlement[];
  readonly departments: readonly Department[];
  readonly classes: readonly SchoolClass[];
  readonly sections: readonly Section[];
  readonly subjects: readonly Subject[];
  readonly roles: readonly Role[];
  /** Roles created by the institution in this browser. */
  readonly customRoles: readonly Role[];
  /** Permission changes to built-in roles made in this browser. */
  readonly roleOverrides: readonly RoleOverride[];
  readonly users: readonly User[];
  readonly invitations: readonly Invitation[];
  readonly emails: readonly SimulatedEmail[];
  readonly notifications: readonly Notification[];
  readonly events: readonly CalendarEvent[];
  readonly audit: readonly AuditEvent[];
  readonly staff: readonly StaffMember[];
  readonly leaveRequests: readonly LeaveRequest[];
  readonly students: readonly Student[];
  readonly guardians: readonly Guardian[];
  readonly admissions: readonly AdmissionApplication[];
  readonly attendance: readonly SectionAttendance[];
  readonly invoices: readonly FeeInvoice[];
  readonly examinations: readonly Examination[];
  readonly results: readonly SectionResult[];
}

/**
 * Collections changed by users in the demo. Only these are written to browser storage; everything else is regenerated
 * from the deterministic seed. None of them contains a password or secret. `institution` and `grading` are single
 * records; every other entry is a list.
 */
export const PERSISTED_COLLECTIONS = [
  'institution',
  'grading',
  'campuses',
  'academicYears',
  'academicTerms',
  'academicUnits',
  'departments',
  'classes',
  'sections',
  'subjects',
  'events',
  'users',
  'customRoles',
  'roleOverrides',
  'invitations',
  'emails',
  'notifications',
  'audit',
] as const;
export type PersistedCollection = (typeof PERSISTED_COLLECTIONS)[number];

/** Persisted collections that hold one record rather than a list. */
export const SINGLE_RECORD_COLLECTIONS: ReadonlySet<PersistedCollection> = new Set(['institution', 'grading']);
