import { describe, expect, it } from 'vitest';
import { createDemoServices } from '@/demo';
import { findDemoRole } from '@/demo/access/roles';
import { createMemoryPersistence } from '@/demo/store/persistence';
import { EMPTY_UNIT_INPUT, gradingInputOf, settingsOf } from '@/lib/validation/institution';

function setup(roleId: string | null = 'owner') {
  const persistence = createMemoryPersistence();
  const now = new Date('2026-10-09T03:00:00.000Z');
  const services = createDemoServices({ persistence, now: () => now, writeDelayMs: 0 });
  if (roleId) {
    services.demo?.setActor({
      id: `usr_${roleId}`,
      name: `Test ${roleId}`,
      roleId,
      grants: findDemoRole(roleId)!.grants,
      campusScope: 'all',
    });
  }
  return { services, persistence, now };
}

const campus = {
  kind: 'branch' as const,
  name: 'Lake View Campus',
  code: 'GIS-LV',
  address: 'Survey 21, Narsingi Road',
  cityId: 'cit_tg_hyderabad',
  phone: '+91 40 4012 5555',
  email: 'lakeview@greenwood.edu.in',
  pinCode: '500075',
  contactPerson: 'Anita Rao',
  status: 'active' as const,
};

describe('institution profile', () => {
  it('saves settings, attributes the change and keeps it across reloads', async () => {
    const { services, persistence } = setup();
    const current = await services.institution.getInstitution();
    const saved = await services.institution.updateInstitution({
      ...settingsOf(current),
      name: 'Greenwood Global School',
      phone: '+91 98765 43210',
      policies: { ...settingsOf(current).policies, feeDueDay: 5 },
    });
    expect(saved.name).toBe('Greenwood Global School');
    expect(saved.updatedBy).toBe('Test owner');

    const reloaded = createDemoServices({ persistence, writeDelayMs: 0 });
    const after = await reloaded.institution.getInstitution();
    expect(after.name).toBe('Greenwood Global School');
    expect(after.policies.feeDueDay).toBe(5);
    expect((await reloaded.onboarding.getPublicInstitution()).name).toBe('Greenwood Global School');

    const [latest] = await services.audit.list({ page: 1, pageSize: 1 }).then((page) => page.items);
    expect(latest?.action).toBe('institution.updated');
  });

  it('reports field errors for invalid email, phone, PIN code and location', async () => {
    const { services } = setup();
    const current = settingsOf(await services.institution.getInstitution());
    await expect(
      services.institution.updateInstitution({
        ...current,
        name: '',
        contactEmail: 'office@',
        phone: '12345',
        pinCode: '012345',
        cityId: 'cit_mh_mumbai',
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION',
      fieldErrors: {
        name: expect.any(String),
        contactEmail: expect.stringContaining('valid email'),
        phone: expect.stringContaining('valid phone'),
        pinCode: expect.stringContaining('6 digits'),
        cityId: 'Select a city in the chosen state.',
      },
    });
  });

  it('enforces grants: auditors are read-only, admins without branding edit cannot rebrand', async () => {
    const auditor = setup('auditor').services;
    const current = settingsOf(await auditor.institution.getInstitution());
    await expect(auditor.institution.updateInstitution(current)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(auditor.institution.createCampus(campus)).rejects.toMatchObject({ code: 'FORBIDDEN' });

    const signedOut = setup(null).services;
    await expect(signedOut.institution.updateInstitution(current)).rejects.toMatchObject({ code: 'FORBIDDEN' });

    const { services } = setup('owner');
    services.demo?.setActor({
      id: 'usr_x',
      name: 'Limited admin',
      roleId: 'custom',
      grants: ['institution:view', 'institution:edit'],
      campusScope: 'all',
    });
    await expect(
      services.institution.updateInstitution({ ...current, branding: { ...current.branding, tagline: 'New' } }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', message: expect.stringContaining('branding') });
    await expect(services.institution.updateInstitution({ ...current, shortName: 'GWS' })).resolves.toMatchObject({
      shortName: 'GWS',
    });
  });
});

describe('campuses', () => {
  it('creates a campus that the header selectors and user forms see, and rejects duplicate codes', async () => {
    const { services } = setup();
    const created = await services.institution.createCampus(campus);
    expect((await services.institution.listCampuses()).map((item) => item.id)).toContain(created.id);
    await expect(services.institution.createCampus({ ...campus, name: 'Other' })).rejects.toMatchObject({
      code: 'VALIDATION',
      fieldErrors: { code: 'Another campus already uses this code.' },
    });
    await services.institution.deleteCampus(created.id);
    expect(await services.institution.listCampuses()).toHaveLength(2);
  });

  it('blocks deleting a campus that still has classes, users or students', async () => {
    const { services } = setup();
    await expect(services.institution.deleteCampus('cmp_main')).rejects.toMatchObject({
      code: 'CONFLICT',
      message: expect.stringContaining('classes'),
    });
  });

  it('requires the delete grant (admins have it, auditors do not)', async () => {
    const admin = setup('admin').services;
    const created = await admin.institution.createCampus(campus);
    await expect(admin.institution.deleteCampus(created.id)).resolves.toBeUndefined();
  });
});

describe('academic years', () => {
  it('plans a year, rejects overlaps, and only approvers can make it current', async () => {
    const { services } = setup('admin');
    const years = await services.institution.listAcademicYears();
    const planned = years.find((year) => year.status === 'planned')!;
    await expect(
      services.institution.createAcademicYear({ label: 'Overlap', startsOn: planned.startsOn, endsOn: planned.endsOn }),
    ).rejects.toMatchObject({ code: 'VALIDATION', fieldErrors: { startsOn: expect.stringContaining('overlap') } });

    await expect(services.institution.setCurrentAcademicYear(planned.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });

    services.demo?.setActor({
      id: 'usr_owner',
      name: 'Owner',
      roleId: 'owner',
      grants: findDemoRole('owner')!.grants,
      campusScope: 'all',
    });
    await services.institution.setCurrentAcademicYear(planned.id);
    const after = await services.institution.listAcademicYears();
    expect(after.filter((year) => year.status === 'current').map((year) => year.id)).toEqual([planned.id]);
    expect((await services.institution.getOverview()).currentYearLabel).toBe(planned.label);
  });

  it('does not delete the current year', async () => {
    const { services } = setup();
    const current = (await services.institution.listAcademicYears()).find((year) => year.status === 'current')!;
    await expect(services.institution.deleteAcademicYear(current.id)).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});

describe('classes, sections, departments, subjects and calendar', () => {
  it('adds a class and section, blocks deleting the class while it has sections', async () => {
    const { services } = setup();
    const created = await services.institution.createClass({ campusId: 'cmp_city', level: 9, name: 'Class 9' });
    await expect(
      services.institution.createClass({ campusId: 'cmp_city', level: 9, name: 'Class Nine' }),
    ).rejects.toMatchObject({ code: 'VALIDATION', fieldErrors: { level: expect.any(String) } });

    const year = (await services.institution.listAcademicYears()).find((item) => item.status === 'current')!;
    const section = await services.institution.createSection(year.id, { classId: created.id, name: 'a', capacity: 30 });
    expect(section).toMatchObject({ name: 'A', campusId: 'cmp_city' });
    await expect(services.institution.deleteClass(created.id)).rejects.toMatchObject({ code: 'CONFLICT' });
    await services.institution.deleteSection(section.id);
    await services.institution.deleteClass(created.id);
  });

  it('keeps section capacity at or above enrolment', async () => {
    const { services } = setup();
    const year = (await services.institution.listAcademicYears()).find((item) => item.status === 'current')!;
    const [section] = await services.institution.listSections(year.id);
    await expect(
      services.institution.updateSection(section!.id, { classId: section!.classId, name: section!.name, capacity: 1 }),
    ).rejects.toMatchObject({ code: 'VALIDATION', fieldErrors: { capacity: expect.stringContaining('enrolled') } });
  });

  it('protects departments in use and manages subjects', async () => {
    const { services } = setup();
    await expect(services.institution.deleteDepartment('dep_mathematics')).rejects.toMatchObject({
      code: 'CONFLICT',
    });
    const subject = await services.institution.createSubject({
      name: 'Robotics',
      code: 'ROBO',
      kind: 'elective',
      levelFrom: 6,
      levelTo: 10,
      departmentId: 'dep_computer_science',
    });
    expect((await services.institution.listSubjects()).some((item) => item.id === subject.id)).toBe(true);
    await expect(
      services.institution.createSubject({ ...subject, code: 'ROBO2', levelFrom: 10, levelTo: 6, departmentId: '' }),
    ).rejects.toMatchObject({ code: 'VALIDATION', fieldErrors: { levelTo: expect.any(String) } });
  });

  it('adds calendar entries that the dashboard calendar sees', async () => {
    const { services } = setup();
    const year = (await services.institution.listAcademicYears()).find((item) => item.status === 'current')!;
    const event = await services.institution.createCalendarEvent({
      title: 'Founders Day',
      kind: 'event',
      startsOn: '2026-10-12',
      endsOn: '2026-10-12',
      campusId: 'all',
      audience: 'Whole school',
    });
    expect((await services.institution.listCalendarEvents(year.id)).map((item) => item.id)).toContain(event.id);
    const upcoming = await services.calendar.upcoming({ campusId: 'all', academicYearId: year.id }, 50);
    expect(upcoming.map((item) => item.id)).toContain(event.id);
  });
});

async function switchType(services: ReturnType<typeof setup>['services'], type: 'degree-college' | 'coaching') {
  const current = settingsOf(await services.institution.getInstitution());
  const typeDetails = structuredClone(current.typeDetails);
  typeDetails['degree-college'].affiliatingUniversity = 'Osmania University';
  typeDetails.coaching.courseCategoryIds = ['crs_engineering_entrance'];
  return services.institution.updateInstitution({ ...current, type, typeDetails });
}

describe('institution type', () => {
  it('only lets approvers change the type, keeps the previous type details, and validates the new type', async () => {
    const admin = setup('admin').services;
    await expect(switchType(admin, 'degree-college')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: expect.stringContaining('Approve'),
    });

    const { services } = setup();
    const current = settingsOf(await services.institution.getInstitution());
    await expect(services.institution.updateInstitution({ ...current, type: 'degree-college' })).rejects.toMatchObject({
      code: 'VALIDATION',
      fieldErrors: { 'typeDetails.degree-college.affiliatingUniversity': expect.any(String) },
    });

    const saved = await switchType(services, 'degree-college');
    expect(saved.type).toBe('degree-college');
    expect(saved.typeDetails.school.boardId).toBe(current.typeDetails.school.boardId);
    const recent = await services.audit.list({ page: 1, pageSize: 2 }).then((page) => page.items);
    expect(recent.map((event) => event.action)).toContain('institution.type-changed');
  });

  it('does not require school identifiers for other types', async () => {
    const { services } = setup();
    const current = settingsOf(await services.institution.getInstitution());
    const typeDetails = structuredClone(current.typeDetails);
    typeDetails.school.boardId = '';
    typeDetails.coaching.courseCategoryIds = ['crs_engineering_entrance'];
    await expect(
      services.institution.updateInstitution({ ...current, type: 'coaching', typeDetails }),
    ).resolves.toMatchObject({ type: 'coaching' });
  });

  it('keeps campus-scoped users out of institution-wide settings and other campuses', async () => {
    const { services } = setup('admin');
    services.demo?.setActor({
      id: 'usr_scoped',
      name: 'Campus admin',
      roleId: 'admin',
      grants: findDemoRole('admin')!.grants,
      campusScope: ['cmp_city'],
    });
    const current = settingsOf(await services.institution.getInstitution());
    await expect(services.institution.updateInstitution(current)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(services.institution.createCampus(campus)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    const main = (await services.institution.listCampuses()).find((item) => item.id === 'cmp_main')!;
    await expect(services.institution.updateCampus(main.id, { ...main })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      services.institution.updateGradingConfig(gradingInputOf(await services.institution.getGradingConfig())),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('only offers location kinds that suit the type', async () => {
    const { services } = setup();
    await expect(services.institution.createCampus({ ...campus, kind: 'affiliated-college' })).rejects.toMatchObject({
      code: 'VALIDATION',
      fieldErrors: { kind: expect.stringContaining('School') },
    });
  });
});

describe('academic structure', () => {
  it('loads a starter structure once, and hides it (without deleting) when the type changes', async () => {
    const { services } = setup();
    await expect(services.institution.applyStructureTemplate()).rejects.toMatchObject({ code: 'CONFLICT' });
    await switchType(services, 'degree-college');
    const count = await services.institution.applyStructureTemplate();
    expect(count).toBeGreaterThan(5);
    await expect(services.institution.applyStructureTemplate()).rejects.toMatchObject({ code: 'CONFLICT' });

    const units = await services.institution.listAcademicUnits();
    const course = units.find((unit) => unit.institutionType === 'degree-college' && unit.kind === 'course')!;
    await switchType(services, 'coaching');
    expect((await services.institution.listAcademicUnits()).some((unit) => unit.id === course.id)).toBe(true);
    await expect(services.institution.deleteAcademicUnit(course.id)).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('enforces parents, required fields, unique codes and in-use deletes', async () => {
    const { services } = setup();
    await switchType(services, 'degree-college');
    const department = await services.institution.createAcademicUnit({
      ...EMPTY_UNIT_INPUT,
      kind: 'department',
      name: 'Mathematics',
      code: 'math',
    });
    expect(department.code).toBe('MATH');

    const programme = {
      ...EMPTY_UNIT_INPUT,
      kind: 'programme' as const,
      name: 'B.Sc. Mathematics',
      code: 'BSC-M',
      degree: 'B.Sc.',
      programmeLevel: 'undergraduate' as const,
      durationValue: 3,
      durationUnit: 'years' as const,
      periods: 6,
      research: true,
    };
    await expect(services.institution.createAcademicUnit(programme)).rejects.toMatchObject({
      code: 'VALIDATION',
      fieldErrors: { parentId: expect.any(String) },
    });
    await expect(
      services.institution.createAcademicUnit({ ...programme, parentId: department.id, durationValue: null }),
    ).rejects.toMatchObject({ code: 'VALIDATION', fieldErrors: { durationValue: expect.any(String) } });

    const created = await services.institution.createAcademicUnit({ ...programme, parentId: department.id });
    expect(created.research).toBe(false);
    await expect(
      services.institution.createAcademicUnit({
        ...EMPTY_UNIT_INPUT,
        kind: 'department',
        name: 'Maths 2',
        code: 'MATH',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION', fieldErrors: { code: expect.stringContaining('code') } });
    await expect(services.institution.deleteAcademicUnit(department.id)).rejects.toMatchObject({ code: 'CONFLICT' });
    await services.institution.deleteAcademicUnit(created.id);
    await services.institution.deleteAcademicUnit(department.id);
  });

  it('lets the institution rename levels and set its period type; auditors cannot', async () => {
    const { services } = setup();
    const saved = await services.institution.updateStructureSettings('university', {
      labels: { faculty: 'School of Study', grade: 'Ignored' },
      periodType: 'trimester',
      periodsPerYear: 3,
    });
    expect(saved.structure.university).toEqual({
      labels: { faculty: 'School of Study' },
      periodType: 'trimester',
      periodsPerYear: 3,
    });
    const auditor = setup('auditor').services;
    await expect(auditor.institution.updateStructureSettings('school', saved.structure.school)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
});

describe('terms and grading', () => {
  it('keeps terms inside the year, without overlaps, and not in closed years', async () => {
    const { services } = setup();
    const years = await services.institution.listAcademicYears();
    const current = years.find((year) => year.status === 'current')!;
    const closed = years.find((year) => year.status === 'closed')!;
    const terms = await services.institution.listAcademicTerms(current.id);
    expect(terms.map((term) => term.name)).toEqual(['Term 1', 'Term 2']);

    await expect(
      services.institution.createAcademicTerm(current.id, {
        name: 'Summer',
        startsOn: '2026-05-01',
        endsOn: '2026-05-31',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION', fieldErrors: { startsOn: expect.stringContaining('overlap') } });
    await expect(
      services.institution.updateAcademicTerm(terms[0]!.id, {
        name: 'Term 1',
        startsOn: '2026-03-01',
        endsOn: '2026-09-30',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION', fieldErrors: { startsOn: expect.stringContaining('within') } });
    await expect(
      services.institution.createAcademicTerm(closed.id, {
        name: 'Late',
        startsOn: closed.startsOn,
        endsOn: closed.startsOn,
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });

    await services.institution.updateAcademicTerm(terms[1]!.id, {
      name: 'Term 2',
      startsOn: '2026-10-01',
      endsOn: '2027-01-31',
    });
    const term3 = await services.institution.createAcademicTerm(current.id, {
      name: 'Term 3',
      startsOn: '2027-02-01',
      endsOn: '2027-03-31',
    });
    expect((await services.institution.listAcademicTerms(current.id)).at(-1)?.id).toBe(term3.id);
  });

  it('saves grading rules and rejects gaps in grade bands', async () => {
    const { services } = setup();
    const grading = gradingInputOf(await services.institution.getGradingConfig());
    const saved = await services.institution.updateGradingConfig({ ...grading, passPercent: 40 });
    expect(saved).toMatchObject({ passPercent: 40, updatedBy: 'Test owner' });

    const bands = grading.bands.map((band, index) =>
      index === 0 ? { ...band, minPercent: band.minPercent + 2 } : band,
    );
    await expect(services.institution.updateGradingConfig({ ...grading, bands })).rejects.toMatchObject({
      code: 'VALIDATION',
    });
  });

  it('lists entitlements read-only', async () => {
    const { services } = setup();
    const entitlements = await services.institution.listEntitlements();
    expect(entitlements.find((item) => item.moduleId === 'institution')?.status).toBe('included');
    expect('updateEntitlements' in services.institution).toBe(false);
  });
});
