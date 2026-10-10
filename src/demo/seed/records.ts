import {
  ACCOUNT_IDS,
  CITY_CAMPUS_ID,
  DEMO_TENANT_ID,
  findAccount,
  MAIN_CAMPUS_ID,
  OWNER_ACCOUNT,
} from '@/demo/access/accounts';
import { findDemoRole } from '@/demo/access/roles';
import { FEMALE_NAMES, MALE_NAMES, SURNAMES } from '@/demo/seed/names';
import type { SeededRandom } from '@/demo/seed/random';
import type { AdmissionApplication, AdmissionStage } from '@/domain/admissions';
import type { SectionAttendance } from '@/domain/attendance';
import type { AuditEvent } from '@/domain/audit';
import type { IsoDate } from '@/domain/common';
import type { CalendarEvent, Notification } from '@/domain/communication';
import type { Examination, SectionResult } from '@/domain/examinations';
import type { FeeInvoice } from '@/domain/fees';
import type { Institution, SchoolClass, Section } from '@/domain/institution';
import type { Invitation, SimulatedEmail } from '@/domain/onboarding';
import type { LeaveRequest, StaffMember } from '@/domain/staff';
import type { Student } from '@/domain/students';
import type { User } from '@/domain/users';
import { addDays, dayOfWeek, istDateTime } from '@/lib/format/date';

const tenantId = DEMO_TENANT_ID;
const INVITATION_DAYS = 7;

export function invitationEmail(
  invitation: Invitation,
  user: Pick<User, 'fullName' | 'roleId'>,
  emailId: string,
  invitedBy: string | null,
  roleName: string | null = findDemoRole(user.roleId)?.name ?? null,
): SimulatedEmail {
  const kind = invitation.kind;
  const subject =
    kind === 'owner-setup'
      ? 'Welcome to Edulynk ERP — set up your administrator account'
      : kind === 'user-invite'
        ? "You're invited to join Edulynk ERP"
        : 'Reset your Edulynk ERP password';
  return {
    tenantId,
    id: emailId,
    kind,
    to: invitation.email,
    toName: user.fullName,
    subject,
    sentAt: invitation.createdAt,
    token: invitation.token,
    expiresAt: invitation.expiresAt,
    invitedBy,
    roleName,
  };
}

/** The owner's setup invitation (pending) and invitations for every invited user (some pending, some expired). */
export function seedInvitations(
  rng: SeededRandom,
  institution: Institution,
  users: readonly User[],
  today: IsoDate,
): { invitations: Invitation[]; emails: SimulatedEmail[] } {
  const invitations: Invitation[] = [];
  const emails: SimulatedEmail[] = [];
  const owner = users.find((user) => user.id === OWNER_ACCOUNT.userId)!;

  const ownerInvite: Invitation = {
    tenantId,
    token: `inv_${rng.token(24)}`,
    kind: 'owner-setup',
    userId: owner.id,
    email: owner.email,
    createdAt: institution.onboardedAt,
    expiresAt: new Date(Date.parse(institution.onboardedAt) + INVITATION_DAYS * 86_400_000).toISOString(),
    usedAt: null,
    revokedAt: null,
  };
  invitations.push(ownerInvite);
  emails.push(invitationEmail(ownerInvite, owner, 'eml_0001', null));

  for (const user of users.filter((candidate) => candidate.status === 'invited' && candidate.id !== owner.id)) {
    const expired = user.invitationStatus === 'expired';
    // Seeded history ends yesterday, so nothing seeded is newer than records created during the demo.
    const createdOn = addDays(today, expired ? -rng.int(10, 20) : -rng.int(1, 4));
    const invitation: Invitation = {
      tenantId,
      token: `inv_${rng.token(24)}`,
      kind: 'user-invite',
      userId: user.id,
      email: user.email,
      createdAt: istDateTime(createdOn, rng.int(9, 17), rng.int(0, 59)),
      expiresAt: istDateTime(addDays(createdOn, INVITATION_DAYS), 23, 59),
      usedAt: null,
      revokedAt: null,
    };
    invitations.push(invitation);
    emails.push(
      invitationEmail(
        invitation,
        user,
        `eml_${String(emails.length + 1).padStart(4, '0')}`,
        findAccount(ACCOUNT_IDS.admin).fullName,
      ),
    );
  }

  // One already-accepted invitation, so the "already used" state can be demonstrated from the inbox.
  const accepted = users.find(
    (user) => user.roleId === 'teacher' && user.status === 'active' && user.id !== ACCOUNT_IDS.teacher,
  )!;
  const acceptedOn = addDays(today, -3);
  const usedInvite: Invitation = {
    tenantId,
    token: `inv_${rng.token(24)}`,
    kind: 'user-invite',
    userId: accepted.id,
    email: accepted.email,
    createdAt: istDateTime(acceptedOn, 11, 5),
    expiresAt: istDateTime(addDays(acceptedOn, INVITATION_DAYS), 23, 59),
    usedAt: istDateTime(acceptedOn, 18, 42),
    revokedAt: null,
  };
  invitations.push(usedInvite);
  emails.push(
    invitationEmail(
      usedInvite,
      accepted,
      `eml_${String(emails.length + 1).padStart(4, '0')}`,
      findAccount(ACCOUNT_IDS.admin).fullName,
    ),
  );

  return { invitations, emails };
}

/** Enrolled applications for every student admitted this year, plus enquiries still in the pipeline. */
export function seedAdmissions(
  rng: SeededRandom,
  today: IsoDate,
  yearStart: number,
  yearId: string,
  students: readonly Student[],
  classes: readonly SchoolClass[],
): AdmissionApplication[] {
  const applications: AdmissionApplication[] = [];
  const add = (input: Omit<AdmissionApplication, 'tenantId' | 'academicYearId' | 'id' | 'applicationNo'>) => {
    const seq = applications.length + 1;
    applications.push({
      ...input,
      tenantId,
      academicYearId: yearId,
      id: `adm_${String(seq).padStart(5, '0')}`,
      applicationNo: `APP/${yearStart}/${String(seq).padStart(4, '0')}`,
    });
  };
  const levelOf = (classId: string) => classes.find((schoolClass) => schoolClass.id === classId)?.level ?? 1;
  const sources = ['Walk-in', 'Website', 'Referral', 'Campaign'] as const;

  for (const student of students.filter((candidate) => candidate.admittedOn >= `${yearStart}-04-01`)) {
    const created = addDays(student.admittedOn, -rng.int(20, 70));
    add({
      campusId: student.campusId,
      applicantName: `${student.firstName} ${student.lastName}`,
      guardianName: `${rng.pick(MALE_NAMES)} ${student.lastName}`,
      guardianMobile: `+91 9${rng.int(1000, 9999)} ${rng.int(10000, 99999)}`,
      classLevel: levelOf(student.classId),
      source: rng.pick(sources),
      stage: 'enrolled',
      createdOn: created,
      updatedOn: student.admittedOn,
    });
  }
  for (let index = 0; index < 150; index += 1) {
    const created = addDays(today, -rng.int(0, 160));
    const age = (Date.parse(today) - Date.parse(created)) / 86_400_000;
    const stage: AdmissionStage =
      age < 14
        ? rng.pick(['enquiry', 'enquiry', 'in-review'])
        : age < 45
          ? rng.pick(['enquiry', 'in-review', 'in-review', 'accepted', 'rejected'])
          : rng.pick(['in-review', 'accepted', 'rejected', 'rejected']);
    const female = rng.chance(0.5);
    const last = rng.pick(SURNAMES);
    add({
      campusId: rng.chance(0.7) ? MAIN_CAMPUS_ID : CITY_CAMPUS_ID,
      applicantName: `${rng.pick(female ? FEMALE_NAMES : MALE_NAMES)} ${last}`,
      guardianName: `${rng.pick(MALE_NAMES)} ${last}`,
      guardianMobile: `+91 9${rng.int(1000, 9999)} ${rng.int(10000, 99999)}`,
      classLevel: rng.int(-2, 11),
      source: rng.pick(sources),
      stage,
      createdOn: created,
      updatedOn: stage === 'enquiry' ? created : minDate(addDays(created, rng.int(2, 20)), today),
    });
  }
  return applications;
}

/** School days: Monday–Saturday, except second Saturdays, summer vacation and listed holidays. */
export function isSchoolDay(date: IsoDate, yearStart: number): boolean {
  const weekday = dayOfWeek(date);
  if (weekday === 0) return false;
  const day = Number(date.slice(8, 10));
  if (weekday === 6 && day >= 8 && day <= 14) return false;
  if (date >= `${yearStart}-05-01` && date <= `${yearStart}-06-10`) return false;
  const holidays = [`${yearStart}-08-15`, `${yearStart}-10-02`, `${yearStart}-01-26`, `${yearStart + 1}-01-26`];
  return !holidays.includes(date);
}

export function seedAttendance(
  rng: SeededRandom,
  today: IsoDate,
  yearStart: number,
  sections: readonly Section[],
  students: readonly Student[],
): SectionAttendance[] {
  const strength = new Map<string, number>();
  for (const student of students) {
    if (student.status === 'active') strength.set(student.sectionId, (strength.get(student.sectionId) ?? 0) + 1);
  }
  const records: SectionAttendance[] = [];
  const sectionBias = new Map(sections.map((section) => [section.id, rng.next() * 0.04 - 0.02]));
  for (let date = `${yearStart}-04-01`; date <= today; date = addDays(date, 1)) {
    if (!isSchoolDay(date, yearStart)) continue;
    const month = Number(date.slice(5, 7));
    const seasonal = month === 7 || month === 8 ? -0.025 : month === 12 ? -0.015 : 0;
    const dayFactor = rng.next() * 0.03 - 0.015;
    for (const section of sections) {
      const total = strength.get(section.id) ?? 0;
      if (total === 0) continue;
      const rate = Math.min(0.995, Math.max(0.8, 0.935 + seasonal + dayFactor + (sectionBias.get(section.id) ?? 0)));
      const present = Math.round(total * (rate + (rng.next() * 0.02 - 0.01)));
      const bounded = Math.min(total, Math.max(0, present));
      records.push({
        tenantId,
        campusId: section.campusId,
        academicYearId: section.academicYearId,
        id: `att_${section.id.slice(4)}_${date.replace(/-/g, '')}`,
        sectionId: section.id,
        date,
        present: bounded,
        absent: total - bounded,
        late: Math.round(bounded * rng.next() * 0.04),
      });
    }
  }
  return records;
}

export function annualFee(level: number, campusId: string): number {
  const base = level <= 0 ? 54_000 : level <= 5 ? 72_000 : level <= 8 ? 84_000 : level <= 10 ? 96_000 : 1_08_000;
  return campusId === CITY_CAMPUS_ID ? Math.round((base * 0.85) / 100) * 100 : base;
}

const TERMS = [
  { term: 1, share: 0.4, issued: '04-01', due: '04-15' },
  { term: 2, share: 0.3, issued: '08-01', due: '08-15' },
  { term: 3, share: 0.3, issued: '12-01', due: '12-15' },
] as const;

/** Term invoices issued so far this year, with realistic payment behaviour (most paid, some partial or overdue). */
export function seedInvoices(
  rng: SeededRandom,
  today: IsoDate,
  yearStart: number,
  yearId: string,
  students: readonly Student[],
  classes: readonly SchoolClass[],
): FeeInvoice[] {
  const invoices: FeeInvoice[] = [];
  const levels = new Map(classes.map((schoolClass) => [schoolClass.id, schoolClass.level]));
  for (const student of students) {
    if (student.status === 'transferred') continue;
    const annual = annualFee(levels.get(student.classId) ?? 1, student.campusId);
    for (const term of TERMS) {
      const issuedOn = maxDate(`${yearStart}-${term.issued}`, student.admittedOn);
      if (issuedOn > today) continue;
      const dueOn = maxDate(`${yearStart}-${term.due}`, addDays(issuedOn, 14));
      const amount = Math.round((annual * term.share) / 100) * 100;
      const dueDatePassed = dueOn < today;
      const roll = rng.next();
      const fullyPaid = dueDatePassed ? roll < (term.term === 1 ? 0.92 : 0.8) : roll < 0.55;
      const partial = !fullyPaid && rng.chance(0.4);
      const paid = fullyPaid ? amount : partial ? Math.round((amount * rng.int(30, 70)) / 100 / 100) * 100 : 0;
      const latestPayment = minDate(today, addDays(dueOn, 30));
      const paymentWindow = Math.max(0, (Date.parse(latestPayment) - Date.parse(issuedOn)) / 86_400_000);
      invoices.push({
        tenantId,
        campusId: student.campusId,
        academicYearId: yearId,
        id: `fin_${student.id.slice(4)}_t${term.term}`,
        invoiceNo: `GIS/FEE/${yearStart}/${student.id.slice(4)}-${term.term}`,
        studentId: student.id,
        term: term.term,
        amount,
        paid,
        issuedOn,
        dueOn,
        lastPaymentOn: paid > 0 ? addDays(issuedOn, Math.round(paymentWindow * Math.pow(rng.next(), 2))) : null,
      });
    }
  }
  return invoices;
}

export function seedExaminations(
  rng: SeededRandom,
  today: IsoDate,
  yearStart: number,
  yearId: string,
  sections: readonly Section[],
): { examinations: Examination[]; results: SectionResult[] } {
  const plan = [
    ['exm_ut1', 'Unit Test 1', `${yearStart}-07-13`, `${yearStart}-07-18`],
    ['exm_hy', 'Half-Yearly Examination', `${yearStart}-09-21`, `${yearStart}-10-01`],
    ['exm_ut2', 'Unit Test 2', `${yearStart}-12-07`, `${yearStart}-12-12`],
    ['exm_annual', 'Annual Examination', `${yearStart + 1}-02-22`, `${yearStart + 1}-03-07`],
  ] as const;
  const examinations: Examination[] = plan.map(([id, name, startsOn, endsOn]) => ({
    tenantId,
    campusId: MAIN_CAMPUS_ID,
    academicYearId: yearId,
    id,
    name,
    startsOn,
    endsOn,
    status: startsOn > today ? 'scheduled' : addDays(endsOn, 7) < today ? 'results-published' : 'in-progress',
  }));
  const results: SectionResult[] = [];
  for (const exam of examinations.filter((candidate) => candidate.status === 'results-published')) {
    for (const section of sections) {
      const average = Math.round((64 + rng.next() * 20) * 10) / 10;
      results.push({
        tenantId,
        campusId: section.campusId,
        academicYearId: yearId,
        id: `res_${exam.id.slice(4)}_${section.id.slice(4)}`,
        examinationId: exam.id,
        sectionId: section.id,
        averagePercent: average,
        passPercent: Math.min(100, Math.round((86 + (average - 64) * 0.55 + rng.next() * 3) * 10) / 10),
      });
    }
  }
  return { examinations, results };
}

export function seedEvents(today: IsoDate, examinations: readonly Examination[]): CalendarEvent[] {
  const event = (
    id: string,
    title: string,
    kind: CalendarEvent['kind'],
    offset: number,
    length: number,
    audience: string,
    campusId: string | 'all' = 'all',
  ): CalendarEvent => ({
    tenantId,
    id,
    title,
    kind,
    startsOn: addDays(today, offset),
    endsOn: addDays(today, offset + length - 1),
    campusId,
    audience,
  });
  return [
    event('evt_ptm', 'Parent–Teacher Meeting (Classes 1–5)', 'meeting', 3, 1, 'Parents, teachers', MAIN_CAMPUS_ID),
    event('evt_workshop', 'Staff Development Workshop', 'meeting', 6, 1, 'All staff'),
    event('evt_board', 'Class 10 & 12 Board Registration Deadline', 'event', 9, 1, 'Classes 10 and 12', MAIN_CAMPUS_ID),
    event('evt_science', 'Inter-House Science Exhibition', 'event', 12, 2, 'Classes 6–12'),
    event('evt_city_ptm', 'Parent–Teacher Meeting', 'meeting', 15, 1, 'Parents, teachers', CITY_CAMPUS_ID),
    event('evt_sports', 'Annual Sports Day', 'event', 20, 1, 'Whole school'),
    event('evt_diwali', 'Diwali Holidays', 'holiday', 28, 4, 'Whole school'),
    ...examinations
      .filter((exam) => exam.startsOn > today)
      .map((exam) => ({
        tenantId,
        id: `evt_${exam.id}`,
        title: exam.name,
        kind: 'examination' as const,
        startsOn: exam.startsOn,
        endsOn: exam.endsOn,
        campusId: 'all' as const,
        audience: 'All classes',
      })),
  ];
}

export function seedLeaveRequests(rng: SeededRandom, today: IsoDate, staff: readonly StaffMember[]): LeaveRequest[] {
  return Array.from({ length: 14 }, (_, index) => {
    const member = staff[rng.int(0, staff.length - 1)]!;
    const from = addDays(today, rng.int(-20, 12));
    return {
      tenantId,
      campusId: member.campusId,
      id: `lve_${String(index + 1).padStart(4, '0')}`,
      staffId: member.id,
      type: rng.pick(['Casual', 'Sick', 'Earned'] as const),
      from,
      to: addDays(from, rng.int(0, 3)),
      status: from >= today ? 'pending' : rng.pick(['approved', 'approved', 'approved', 'rejected'] as const),
    };
  });
}

export function seedNotifications(today: IsoDate): Notification[] {
  const note = (
    id: string,
    title: string,
    body: string,
    hoursAgo: number,
    tone: Notification['tone'],
    module: Notification['module'],
    href: string | null,
    read = false,
  ): Notification => ({
    tenantId,
    id,
    title,
    body,
    at: new Date(Date.parse(istDateTime(today, 9, 0)) - hoursAgo * 3_600_000).toISOString(),
    read,
    tone,
    module,
    href,
  });
  return [
    note(
      'ntf_01',
      'Term 2 fee dues',
      'Term 2 invoices are overdue for several students. Review outstanding dues.',
      2,
      'warning',
      'fees',
      '/fees',
    ),
    note(
      'ntf_02',
      'Applications awaiting review',
      'New admission applications are waiting for review.',
      5,
      'info',
      'admissions',
      '/admissions',
    ),
    note('ntf_03', 'Leave requests pending', 'Staff leave requests need approval.', 20, 'info', 'staff', '/staff'),
    note(
      'ntf_04',
      'Half-yearly results',
      'Half-yearly marks entry is in progress for secondary classes.',
      26,
      'neutral',
      'examinations',
      '/examinations',
    ),
    note(
      'ntf_05',
      'Pending invitations',
      'Some staff have not accepted their Edulynk invitations yet.',
      30,
      'warning',
      'users',
      '/users?status=invited',
    ),
    note(
      'ntf_06',
      'Low attendance alert',
      'Class 9 B attendance fell below 85% this week.',
      50,
      'danger',
      'attendance',
      '/attendance',
    ),
    note(
      'ntf_07',
      'Library overdue books',
      '23 books are overdue for return.',
      72,
      'neutral',
      'library',
      '/library',
      true,
    ),
    note(
      'ntf_08',
      'Transport route update',
      'Route 7 (Kondapur) timings change from Monday.',
      96,
      'neutral',
      'transport',
      '/transport',
      true,
    ),
  ];
}

export function seedAudit(today: IsoDate, users: readonly User[]): AuditEvent[] {
  const admin = findAccount(ACCOUNT_IDS.admin);
  const teachers = users.filter((user) => user.roleId === 'teacher' && user.status === 'active');
  const entries: [number, string, AuditEvent['module'], string, string, string | null][] = [
    [
      0.4,
      ACCOUNT_IDS.admissionsOfficer,
      'admissions',
      'application.created',
      'New admission application received for Class 3',
      null,
    ],
    [1.2, ACCOUNT_IDS.accountant, 'fees', 'payment.recorded', 'Fee payment of ₹25,200 recorded for Class 7 A', null],
    [2.5, ACCOUNT_IDS.admin, 'users', 'user.created', 'New user account created for an HR executive', null],
    [5, ACCOUNT_IDS.academicCoordinator, 'timetable', 'timetable.updated', 'Timetable updated for Class 8 A', null],
    [8, ACCOUNT_IDS.principal, 'examinations', 'schedule.approved', 'Half-yearly examination schedule approved', null],
    [22, ACCOUNT_IDS.teacher, 'attendance', 'attendance.marked', 'Attendance marked for Class 8 A', null],
    [26, ACCOUNT_IDS.hrAdmin, 'staff', 'leave.approved', 'Casual leave approved for a TGT teacher', null],
    [30, ACCOUNT_IDS.accountant, 'fees', 'refund.approved', 'Transport fee refund of ₹4,800 approved', null],
    [47, ACCOUNT_IDS.admin, 'institution', 'section.updated', 'Class teacher changed for Class 5 B', null],
    [
      52,
      ACCOUNT_IDS.admissionsOfficer,
      'admissions',
      'application.accepted',
      'Admission accepted for Class 1 (City Campus)',
      null,
    ],
    [70, ACCOUNT_IDS.librarian, 'library', 'books.added', '42 new titles added to the catalogue', null],
    [75, ACCOUNT_IDS.transportHostel, 'transport', 'route.updated', 'Route 7 (Kondapur) stop timings updated', null],
    [
      96,
      ACCOUNT_IDS.principal,
      'communication',
      'announcement.published',
      'Announcement published: Annual Sports Day',
      null,
    ],
    [120, ACCOUNT_IDS.hrAdmin, 'payroll', 'payroll.processed', 'September payroll processed for 139 staff', null],
    [
      150,
      ACCOUNT_IDS.admin,
      'users',
      'role.changed',
      'Role changed to Academic Coordinator',
      ACCOUNT_IDS.academicCoordinator,
    ],
  ];
  const events = entries.map(([hoursAgo, actorId, module, action, summary, subjectId], index) => {
    const account = findAccount(actorId);
    return {
      tenantId,
      id: `aud_${String(index + 1).padStart(5, '0')}`,
      at: new Date(Date.parse(istDateTime(today, 10, 0)) - hoursAgo * 3_600_000).toISOString(),
      actorId: account.userId,
      actorName: account.fullName,
      module,
      action,
      summary,
      subjectId,
    } satisfies AuditEvent;
  });
  for (const user of teachers.slice(0, 6)) {
    events.push({
      tenantId,
      id: `aud_${String(events.length + 1).padStart(5, '0')}`,
      at: new Date(Date.parse(user.createdAt)).toISOString(),
      actorId: admin.userId,
      actorName: admin.fullName,
      module: 'users',
      action: 'user.created',
      summary: `User account created for ${user.fullName}`,
      subjectId: user.id,
    });
  }
  return events.sort((a, b) => b.at.localeCompare(a.at));
}

function minDate(a: IsoDate, b: IsoDate): IsoDate {
  return a < b ? a : b;
}

function maxDate(a: IsoDate, b: IsoDate): IsoDate {
  return a > b ? a : b;
}
