import {
  CITY_CAMPUS_ID,
  DEMO_ACCOUNTS,
  DEMO_EMAIL_DOMAIN,
  DEMO_TENANT_ID,
  MAIN_CAMPUS_ID,
} from '@/demo/access/accounts';
import { departmentId } from '@/demo/seed/institution';
import { FEMALE_NAMES, MALE_NAMES, OCCUPATIONS, SURNAMES } from '@/demo/seed/names';
import type { SeededRandom } from '@/demo/seed/random';
import type { IsoDate } from '@/domain/common';
import type { SchoolClass, Section } from '@/domain/institution';
import type { StaffMember } from '@/domain/staff';
import type { Guardian, Student } from '@/domain/students';
import type { User } from '@/domain/users';
import { addDays, istDateTime } from '@/lib/format/date';

const tenantId = DEMO_TENANT_ID;

function personName(rng: SeededRandom, gender: 'female' | 'male'): { first: string; last: string } {
  return { first: rng.pick(gender === 'female' ? FEMALE_NAMES : MALE_NAMES), last: rng.pick(SURNAMES) };
}

function mobile(rng: SeededRandom): string {
  return `+91 ${rng.pick(['9', '8', '7'])}${rng.int(1000, 9999)} ${rng.int(10000, 99999)}`;
}

/** Department key and designation ID for generated subject teachers. */
const SUBJECT_DEPARTMENTS = [
  ['mathematics', 'dsg_tgt_mathematics'],
  ['science', 'dsg_tgt_science'],
  ['science', 'dsg_pgt_physics'],
  ['science', 'dsg_pgt_chemistry'],
  ['science', 'dsg_pgt_biology'],
  ['languages', 'dsg_tgt_english'],
  ['languages', 'dsg_tgt_hindi'],
  ['languages', 'dsg_tgt_telugu'],
  ['social-studies', 'dsg_tgt_social_studies'],
  ['computer-science', 'dsg_pgt_computer_science'],
  ['physical-education', 'dsg_physical_education_teacher'],
] as const;

/** Department key and designation ID for generated support staff. */
const SUPPORT_ROLES = [
  ['administration', 'dsg_office_assistant'],
  ['administration', 'dsg_front_office_executive'],
  ['finance', 'dsg_accounts_assistant'],
  ['finance', 'dsg_fee_counter_executive'],
  ['hr', 'dsg_hr_executive'],
  ['admissions', 'dsg_admissions_counsellor'],
  ['library', 'dsg_library_assistant'],
  ['transport', 'dsg_bus_coordinator'],
  ['hostel', 'dsg_hostel_warden'],
  ['computer-science', 'dsg_it_support_engineer'],
] as const;

/** Staff without a login of their own (the office assistants share the front-office account). */
const NO_LOGIN_DESIGNATIONS: readonly string[] = ['dsg_office_assistant'];

/** Generated staff are numbered from here, after the demo accounts' own staff records. */
const GENERATED_STAFF_START = 100;

const TEACHING_ROLES: readonly string[] = ['teacher', 'academic-coordinator', 'principal', 'vice-principal'];

export interface SeededPeople {
  readonly staff: StaffMember[];
  readonly users: User[];
  readonly sections: Section[];
}

/**
 * Staff (one class teacher per section plus subject and support staff) and user accounts: every demo account plus a
 * login for most teachers and support staff. The owner starts invited, so the onboarding journey can be followed.
 */
export function seedStaffAndUsers(rng: SeededRandom, today: IsoDate, sections: readonly Section[]): SeededPeople {
  const staff: StaffMember[] = [];
  const joinedOn = () =>
    `${rng.int(2012, 2025)}-${String(rng.int(4, 7)).padStart(2, '0')}-${String(rng.int(1, 28)).padStart(2, '0')}`;

  for (const account of DEMO_ACCOUNTS) {
    if (!account.staffId || !account.employeeId || !account.departmentId) continue;
    staff.push({
      tenantId,
      campusId: account.campusId,
      id: account.staffId,
      employeeId: account.employeeId,
      fullName: account.fullName,
      departmentId: account.departmentId,
      designationId: account.designationId,
      category: TEACHING_ROLES.includes(account.roleId) ? 'teaching' : 'non-teaching',
      joinedOn: joinedOn(),
      status: 'active',
    });
  }

  let sequence = GENERATED_STAFF_START;
  const addStaff = (
    fullName: string,
    campusId: string,
    deptKey: string,
    designationId: string,
    category: StaffMember['category'],
  ) => {
    sequence += 1;
    const member: StaffMember = {
      tenantId,
      campusId,
      id: `stf_${String(sequence).padStart(4, '0')}`,
      employeeId: `GIS-${category === 'teaching' ? 'T' : 'N'}-${String(1000 + sequence)}`,
      fullName,
      departmentId: departmentId(deptKey),
      designationId,
      category,
      joinedOn: joinedOn(),
      status: rng.chance(0.03) ? 'on-leave' : 'active',
    };
    staff.push(member);
    return member;
  };

  const sectionsWithTeachers = sections.map((section) => {
    const gender = rng.chance(0.7) ? 'female' : 'male';
    const { first, last } = personName(rng, gender);
    const level = Number(section.classId.slice(-2));
    const primary = Number.isNaN(level) || level <= 5;
    const teacher = addStaff(
      `${first} ${last}`,
      section.campusId,
      primary ? 'academics-primary' : 'academics-secondary',
      primary ? 'dsg_prt_class_teacher' : 'dsg_tgt_class_teacher',
      'teaching',
    );
    return { ...section, classTeacherId: teacher.id };
  });

  for (let index = 0; index < 34; index += 1) {
    const [deptKey, designationId] = SUBJECT_DEPARTMENTS[index % SUBJECT_DEPARTMENTS.length]!;
    const { first, last } = personName(rng, rng.chance(0.6) ? 'female' : 'male');
    addStaff(
      `${first} ${last}`,
      rng.chance(0.75) ? MAIN_CAMPUS_ID : CITY_CAMPUS_ID,
      deptKey,
      designationId,
      'teaching',
    );
  }
  for (let index = 0; index < 30; index += 1) {
    const [deptKey, designationId] = SUPPORT_ROLES[index % SUPPORT_ROLES.length]!;
    const { first, last } = personName(rng, rng.chance(0.5) ? 'female' : 'male');
    addStaff(
      `${first} ${last}`,
      rng.chance(0.7) ? MAIN_CAMPUS_ID : CITY_CAMPUS_ID,
      deptKey,
      designationId,
      'non-teaching',
    );
  }

  const users: User[] = DEMO_ACCOUNTS.map((account, index) => {
    const isOwner = account.roleId === 'owner';
    return {
      tenantId,
      campusId: account.campusId,
      id: account.userId,
      fullName: account.fullName,
      email: account.email,
      mobile: account.mobile,
      staffId: account.staffId,
      employeeId: account.employeeId,
      departmentId: account.departmentId,
      designationId: account.designationId,
      roleId: account.roleId,
      customGrants: [],
      status: isOwner ? 'invited' : 'active',
      invitationStatus: isOwner ? 'pending' : 'accepted',
      createdAt: istDateTime(addDays(today, isOwner ? -1 : -60 + index), 10, 30),
      lastActiveAt: isOwner ? null : istDateTime(addDays(today, -rng.int(0, 6)), rng.int(8, 18), rng.int(0, 59)),
    };
  });

  const roleFor = (member: StaffMember): string => {
    if (member.category === 'teaching') return 'teacher';
    if (member.departmentId === departmentId('finance')) return 'accountant';
    if (member.departmentId === departmentId('hr')) return 'hr-admin';
    if (member.departmentId === departmentId('admissions')) return 'admissions-officer';
    if (member.departmentId === departmentId('library')) return 'librarian';
    if (member.departmentId === departmentId('transport') || member.departmentId === departmentId('hostel')) {
      return 'transport-hostel';
    }
    return 'admin';
  };

  const withAccounts = staff.filter(
    (member) =>
      !users.some((user) => user.staffId === member.id) && !NO_LOGIN_DESIGNATIONS.includes(member.designationId),
  );
  const takenEmails = new Set(users.map((user) => user.email));
  const uniqueEmail = (fullName: string) => {
    const [first = '', ...rest] = fullName.toLowerCase().split(' ');
    const local = `${first}.${rest.join('')}`;
    let candidate = `${local}@${DEMO_EMAIL_DOMAIN}`;
    for (let suffix = 2; takenEmails.has(candidate); suffix += 1) candidate = `${local}${suffix}@${DEMO_EMAIL_DOMAIN}`;
    takenEmails.add(candidate);
    return candidate;
  };
  withAccounts.slice(0, 70).forEach((member, index) => {
    const invited = index % 17 === 5;
    const inactive = !invited && index % 23 === 11;
    users.push({
      tenantId,
      campusId: member.campusId,
      id: `usr_${member.id.slice(4)}`,
      fullName: member.fullName,
      email: uniqueEmail(member.fullName),
      mobile: mobile(rng),
      staffId: member.id,
      employeeId: member.employeeId,
      departmentId: member.departmentId,
      designationId: member.designationId,
      roleId: roleFor(member),
      customGrants: [],
      status: invited ? 'invited' : inactive ? 'inactive' : 'active',
      invitationStatus: invited ? (index % 2 === 0 ? 'expired' : 'pending') : 'accepted',
      createdAt: istDateTime(addDays(today, -rng.int(20, 200)), rng.int(9, 17), rng.int(0, 59)),
      lastActiveAt:
        invited || inactive ? null : istDateTime(addDays(today, -rng.int(0, 20)), rng.int(8, 19), rng.int(0, 59)),
    });
  });

  return { staff, users, sections: sectionsWithTeachers };
}

/** Aarav Singh, the demo parent's child, is seeded into this section. */
const DEMO_CHILD_SECTION_ID = 'sec_main_08_a';
const GUARDIAN_CITY_ID = 'cit_tg_hyderabad';

export interface SeededStudents {
  readonly students: Student[];
  readonly guardians: Guardian[];
}

/** Students for every current section, one guardian each. Includes Aarav Singh (8 A), whose father is Vikram Singh. */
export function seedStudents(
  rng: SeededRandom,
  today: IsoDate,
  yearStart: number,
  yearId: string,
  classes: readonly SchoolClass[],
  sections: readonly Section[],
): SeededStudents {
  const students: Student[] = [];
  const guardians: Guardian[] = [];
  const admissionSeq = new Map<number, number>();
  const nextAdmissionNo = (year: number) => {
    const next = (admissionSeq.get(year) ?? 0) + 1;
    admissionSeq.set(year, next);
    return `GIS/${year}/${String(next).padStart(4, '0')}`;
  };

  for (const section of sections) {
    const schoolClass = classes.find((candidate) => candidate.id === section.classId)!;
    const strength = section.campusId === MAIN_CAMPUS_ID ? rng.int(27, 34) : rng.int(24, 30);
    const roster: { first: string; last: string; gender: 'female' | 'male'; demoChild?: true }[] = [];
    for (let index = 0; index < strength; index += 1) {
      const gender = rng.chance(0.48) ? 'female' : 'male';
      roster.push({ ...personName(rng, gender), gender });
    }
    const hasDemoChild = section.id === DEMO_CHILD_SECTION_ID;
    if (hasDemoChild) roster[0] = { first: 'Aarav', last: 'Singh', gender: 'male', demoChild: true };
    roster.sort((a, b) => `${a.first} ${a.last}`.localeCompare(`${b.first} ${b.last}`));

    roster.forEach((person, index) => {
      const isDemoChild = person.demoChild === true;
      const newThisYear = !isDemoChild && rng.chance(schoolClass.level === -2 ? 0.9 : 0.1);
      const yearsAgo = newThisYear ? 0 : rng.int(1, Math.max(1, Math.min(10, schoolClass.level + 3)));
      const admittedYear = yearStart - yearsAgo;
      const admittedOn = newThisYear
        ? minDate(addDays(`${yearStart}-04-01`, rng.chance(0.85) ? rng.int(0, 75) : rng.int(76, 180)), today)
        : addDays(`${admittedYear}-04-01`, rng.int(0, 70));
      const age = schoolClass.level + 5;
      const guardianId = `gdn_${String(guardians.length + 1).padStart(5, '0')}`;
      const fatherFirst = isDemoChild ? 'Vikram' : rng.pick(MALE_NAMES);
      const relation = isDemoChild ? 'Father' : rng.pick(['Father', 'Father', 'Mother', 'Guardian'] as const);
      const guardianFirst = relation === 'Mother' ? rng.pick(FEMALE_NAMES) : fatherFirst;
      guardians.push({
        tenantId,
        id: guardianId,
        fullName: `${guardianFirst} ${person.last}`,
        relation,
        email: isDemoChild
          ? `vikram.singh@${DEMO_EMAIL_DOMAIN}`
          : `${guardianFirst.toLowerCase()}.${person.last.toLowerCase()}${guardians.length}@mail.example.in`,
        mobile: mobile(rng),
        occupation: relation === 'Mother' ? rng.pick(OCCUPATIONS) : rng.pick(OCCUPATIONS.slice(0, -1)),
        cityId: GUARDIAN_CITY_ID,
      });
      students.push({
        tenantId,
        campusId: section.campusId,
        academicYearId: yearId,
        id: `stu_${String(students.length + 1).padStart(5, '0')}`,
        admissionNo: nextAdmissionNo(admittedYear),
        firstName: person.first,
        lastName: person.last,
        gender: person.gender,
        dateOfBirth: addDays(`${yearStart - age}-01-01`, rng.int(0, 364)),
        classId: section.classId,
        sectionId: section.id,
        rollNo: index + 1,
        guardianId,
        admittedOn,
        status: isDemoChild ? 'active' : rng.chance(0.015) ? 'inactive' : rng.chance(0.01) ? 'transferred' : 'active',
      });
    });
  }
  return { students, guardians };
}

function minDate(a: IsoDate, b: IsoDate): IsoDate {
  return a < b ? a : b;
}
