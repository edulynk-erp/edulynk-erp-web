import { describe, expect, it } from 'vitest';
import { createDemoServices } from '@/demo';
import { findDemoRole } from '@/demo/access/roles';
import { createMemoryPersistence } from '@/demo/store/persistence';

function setup(campusScope: 'all' | readonly string[] = 'all') {
  const now = new Date('2026-10-09T03:00:00.000Z');
  const services = createDemoServices({ persistence: createMemoryPersistence(), now: () => now, writeDelayMs: 0 });
  services.demo?.setActor({
    id: 'usr_test',
    name: 'Test',
    roleId: 'owner',
    grants: findDemoRole('owner')!.grants,
    campusScope,
  });
  return services;
}

describe('owner dashboard overview', () => {
  it('summarises the selected campus and academic year against the previous month', async () => {
    const services = setup();
    const years = await services.institution.listAcademicYears();
    const current = years.find((year) => year.status === 'current')!;
    const all = await services.dashboard.ownerOverview({ campusId: 'all', academicYearId: current.id });

    expect(all.period).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(all.students.current).toBeGreaterThan(0);
    expect(all.students.previous).toBeLessThanOrEqual(all.students.current);
    expect(all.staff.current).toBeGreaterThan(0);
    expect(all.sections.current).toBeGreaterThan(0);
    expect(all.feesCollected.current).toBeGreaterThanOrEqual(all.feesCollected.previous);
    expect(all.admissions.map((item) => item.stage)).toEqual(['enquiry', 'in-review', 'accepted', 'rejected']);
    expect(all.recentActivity).toHaveLength(4);
    expect(all.studentGrowth.thisYear.map((point) => point.label)).toEqual([
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sept',
      'Oct',
    ]);
    expect(all.studentGrowth.lastYear).toHaveLength(12);
    expect(all.studentGrowth.allYears.length).toBeGreaterThanOrEqual(2);

    const main = await services.dashboard.ownerOverview({ campusId: 'cmp_main', academicYearId: current.id });
    expect(main.students.current).toBeLessThan(all.students.current);
  });

  it("refuses campuses outside the signed-in user's campus scope", async () => {
    const services = setup(['cmp_main']);
    const current = (await services.institution.listAcademicYears()).find((year) => year.status === 'current')!;
    await expect(
      services.dashboard.ownerOverview({ campusId: 'cmp_main', academicYearId: current.id }),
    ).resolves.toBeDefined();
    for (const campusId of ['all', 'cmp_city']) {
      await expect(services.dashboard.ownerOverview({ campusId, academicYearId: current.id })).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
      await expect(services.calendar.upcoming({ campusId, academicYearId: current.id }, 5)).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
    }
  });
});
