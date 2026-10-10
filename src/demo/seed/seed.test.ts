import { describe, expect, it } from 'vitest';
import { DEMO_ACCOUNTS, OWNER_ACCOUNT } from '@/demo/access/accounts';
import { DEMO_ROLES } from '@/demo/access/roles';
import { createSeed } from '@/demo/seed';
import { isDesignationId, designationName } from '@/config/designations';
import { ALL_CITIES, cityName, EDUCATION_BOARDS, locationNames, MEDIUMS } from '@/config/institution';
import { MODULE_IDS, isGrant } from '@/config/modules';

const SEED_DATE = '2026-10-09';

describe('demo seed', () => {
  const db = createSeed(SEED_DATE);

  it('is deterministic for a seed date', () => {
    expect(JSON.stringify(createSeed(SEED_DATE))).toBe(JSON.stringify(db));
  });

  it('describes one Indian school with two campuses and a current academic year', () => {
    expect(cityName(db.institution.cityId)).toBe('Hyderabad');
    expect(db.campuses.map((campus) => campus.id)).toEqual(['cmp_main', 'cmp_city']);
    const current = db.academicYears.filter((year) => year.status === 'current');
    expect(current).toHaveLength(1);
    const [year] = current;
    expect(year && year.startsOn <= SEED_DATE && SEED_DATE <= year.endsOn).toBe(true);
  });

  it('defines 12 staff roles with valid grants, and only the owner holds everything', () => {
    expect(DEMO_ROLES).toHaveLength(12);
    expect(DEMO_ROLES.map((role) => role.id)).not.toContain('guardian');
    expect(DEMO_ROLES.map((role) => role.id)).not.toContain('student');
    for (const role of DEMO_ROLES) {
      expect(role.grants.every(isGrant)).toBe(true);
      expect(role.grants).toContain('dashboard:view');
    }
    const owner = DEMO_ROLES.find((role) => role.id === 'owner');
    expect(owner?.grants).toHaveLength(MODULE_IDS.length * 6);
    expect(DEMO_ROLES.find((role) => role.id === 'teacher')?.grants).not.toContain('users:view');
  });

  it('has a user record for every demo account, with the owner still awaiting setup', () => {
    for (const account of DEMO_ACCOUNTS) {
      const user = db.users.find((candidate) => candidate.id === account.userId);
      expect(user, account.email).toBeDefined();
      expect(user?.email).toBe(account.email);
      expect(user?.roleId).toBe(account.roleId);
    }
    const owner = db.users.find((user) => user.id === OWNER_ACCOUNT.userId);
    expect(owner?.status).toBe('invited');
    const invitation = db.invitations.find(
      (item) => item.userId === OWNER_ACCOUNT.userId && item.kind === 'owner-setup',
    );
    expect(invitation?.usedAt).toBeNull();
    expect(db.emails.some((email) => email.token === invitation?.token)).toBe(true);
  });

  it('keeps references consistent', () => {
    const userIds = new Set(db.users.map((user) => user.id));
    const sectionIds = new Set(db.sections.map((section) => section.id));
    const classIds = new Set(db.classes.map((item) => item.id));
    const guardianIds = new Set(db.guardians.map((guardian) => guardian.id));
    expect(new Set(db.users.map((user) => user.email)).size).toBe(db.users.length);
    expect(db.invitations.every((invitation) => userIds.has(invitation.userId))).toBe(true);
    expect(db.sections.every((section) => classIds.has(section.classId))).toBe(true);
    for (const student of db.students) {
      expect(sectionIds.has(student.sectionId)).toBe(true);
      expect(guardianIds.has(student.guardianId)).toBe(true);
    }
    expect(db.students.length).toBeGreaterThan(1000);
  });

  it('gives every record a unique ID', () => {
    const collections = {
      campuses: db.campuses,
      departments: db.departments,
      subjects: db.subjects,
      academicYears: db.academicYears,
      classes: db.classes,
      sections: db.sections,
      staff: db.staff,
      users: db.users,
      students: db.students,
      guardians: db.guardians,
      events: db.events,
      audit: db.audit,
    };
    for (const [name, records] of Object.entries(collections)) {
      expect(new Set(records.map((record) => record.id)).size, name).toBe(records.length);
    }
    expect(new Set(DEMO_ACCOUNTS.map((account) => account.userId)).size).toBe(DEMO_ACCOUNTS.length);
    expect(new Set(db.staff.map((member) => member.employeeId)).size).toBe(db.staff.length);
  });

  it('links demo accounts to their user, staff, campus, department and designation by ID', () => {
    const anil = DEMO_ACCOUNTS.find((account) => account.roleId === 'admin')!;
    const user = db.users.find((candidate) => candidate.id === anil.userId)!;
    const staff = db.staff.find((member) => member.id === user.staffId)!;
    expect(user.designationId).toBe('dsg_administrative_officer');
    expect(designationName(user.designationId)).toBe('Administrative Officer');
    expect(staff.fullName).toBe('Anil Mehta');
    expect(staff.employeeId).toBe(user.employeeId);
    expect(designationName(OWNER_ACCOUNT.designationId)).toBe('Chairman & Owner');
  });

  it('stores reference data as IDs that resolve to known entries', () => {
    const campusIds = new Set(db.campuses.map((campus) => campus.id));
    const departmentIds = new Set(db.departments.map((department) => department.id));
    const staffIds = new Set(db.staff.map((member) => member.id));
    const cityIds = new Set(ALL_CITIES.map((city) => city.id));
    for (const user of db.users) {
      expect(isDesignationId(user.designationId), user.id).toBe(true);
      expect(campusIds.has(user.campusId), user.id).toBe(true);
      if (user.departmentId) expect(departmentIds.has(user.departmentId), user.id).toBe(true);
      if (user.staffId) expect(staffIds.has(user.staffId), user.id).toBe(true);
    }
    for (const member of db.staff) {
      expect(isDesignationId(member.designationId), member.id).toBe(true);
      expect(departmentIds.has(member.departmentId), member.id).toBe(true);
    }
    expect(db.campuses.every((campus) => cityIds.has(campus.cityId))).toBe(true);
    expect(db.guardians.every((guardian) => cityIds.has(guardian.cityId))).toBe(true);
    expect(EDUCATION_BOARDS.some((board) => board.id === db.institution.typeDetails.school?.boardId)).toBe(true);
    expect(MEDIUMS.some((medium) => medium.id === db.institution.mediumId)).toBe(true);
    expect(locationNames(db.institution)).toEqual({
      country: 'India',
      state: 'Telangana',
      district: 'Rangareddy',
      city: 'Hyderabad',
    });
    expect(db.audit.every((event) => !event.actorId || db.users.some((user) => user.id === event.actorId))).toBe(true);
  });

  it('never contains password material', () => {
    expect(JSON.stringify(db)).not.toMatch(/"password"|passwordHash|Edulynk@Demo/i);
  });
});
