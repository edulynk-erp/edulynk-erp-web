import { DEMO_ROLES } from '@/demo/access/roles';
import {
  academicYearId,
  academicYearStart,
  CAMPUSES,
  DEPARTMENTS,
  seedAcademicTerms,
  seedAcademicUnits,
  seedAcademicYears,
  seedClassesAndSections,
  seedEntitlements,
  seedGrading,
  seedInstitution,
  SUBJECTS,
} from '@/demo/seed/institution';
import { seedStaffAndUsers, seedStudents } from '@/demo/seed/people';
import { SeededRandom } from '@/demo/seed/random';
import {
  seedAdmissions,
  seedAttendance,
  seedAudit,
  seedEvents,
  seedExaminations,
  seedInvitations,
  seedInvoices,
  seedLeaveRequests,
  seedNotifications,
} from '@/demo/seed/records';
import type { DemoDatabase } from '@/demo/store/db';
import type { IsoDate } from '@/domain/common';

/** Fixed so every browser generates the same institution for the same seed date. */
const SEED = 20_261_009;

/**
 * DEMO FIXTURE. Builds the simulated Greenwood International School, anchored to `seedDate` so dates (dues,
 * invitation expiry, attendance history) stay realistic. Same `seedDate` → identical data.
 */
export function createSeed(seedDate: IsoDate): DemoDatabase {
  const rng = new SeededRandom(SEED);
  const institution = seedInstitution(seedDate);
  const yearStart = academicYearStart(seedDate);
  const yearId = academicYearId(yearStart);
  const { classes, sections: plainSections } = seedClassesAndSections(yearId);
  const { staff, users, sections } = seedStaffAndUsers(rng, seedDate, plainSections);
  const { students, guardians } = seedStudents(rng, seedDate, yearStart, yearId, classes, sections);
  const { invitations, emails } = seedInvitations(rng, institution, users, seedDate);
  const { examinations, results } = seedExaminations(rng, seedDate, yearStart, yearId, sections);
  const academicYears = seedAcademicYears(seedDate);
  return {
    seedDate,
    institution,
    campuses: CAMPUSES,
    academicYears,
    academicTerms: seedAcademicTerms(academicYears),
    academicUnits: seedAcademicUnits(yearStart),
    grading: seedGrading(),
    entitlements: seedEntitlements(),
    departments: DEPARTMENTS,
    classes,
    sections,
    subjects: SUBJECTS,
    roles: DEMO_ROLES,
    customRoles: [],
    roleOverrides: [],
    users,
    invitations,
    emails,
    notifications: seedNotifications(seedDate),
    events: seedEvents(seedDate, examinations),
    audit: seedAudit(seedDate, users),
    staff,
    leaveRequests: seedLeaveRequests(rng, seedDate, staff),
    students,
    guardians,
    admissions: seedAdmissions(rng, seedDate, yearStart, yearId, students, classes),
    attendance: seedAttendance(rng, seedDate, yearStart, sections, students),
    invoices: seedInvoices(rng, seedDate, yearStart, yearId, students, classes),
    examinations,
    results,
  };
}
