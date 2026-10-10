import { describe, expect, it } from 'vitest';
import { createDemoServices } from '@/demo';
import { CITY_CAMPUS_ID, MAIN_CAMPUS_ID } from '@/demo/access/accounts';
import { findDemoRole } from '@/demo/access/roles';
import { createMemoryPersistence } from '@/demo/store/persistence';
import type { Grant } from '@/config/modules';
import type { CampusScope } from '@/domain/common';

function setup(grants: readonly Grant[], campusScope: CampusScope = 'all') {
  const now = new Date('2026-10-09T03:00:00.000Z');
  const services = createDemoServices({ persistence: createMemoryPersistence(), now: () => now, writeDelayMs: 0 });
  services.demo?.setActor({ id: 'usr_tester', name: 'Tester', roleId: 'admin', grants, campusScope });
  return services;
}

async function activeTeacherOn(services: ReturnType<typeof setup>, campusId: string) {
  const page = await services.users.list({
    filters: { roleId: 'teacher', status: 'active', campusId },
    page: 1,
    pageSize: 1,
  });
  return page.items[0]!;
}

const ADMIN = findDemoRole('admin')!.grants;

describe('user edits and status changes', () => {
  it('edits a profile and toggles status for an administrator', async () => {
    const services = setup(ADMIN);
    const teacher = await activeTeacherOn(services, MAIN_CAMPUS_ID);

    const edited = await services.users.update(teacher.id, { fullName: 'Renamed Teacher', campusId: CITY_CAMPUS_ID });
    expect(edited).toMatchObject({ fullName: 'Renamed Teacher', campusId: CITY_CAMPUS_ID, roleId: 'teacher' });

    expect((await services.users.setStatus(teacher.id, 'inactive')).status).toBe('inactive');
    expect((await services.users.setStatus(teacher.id, 'active')).status).toBe('active');
  });

  it('rejects edits and status changes without the users edit permission', async () => {
    const services = setup(findDemoRole('principal')!.grants);
    const teacher = await activeTeacherOn(services, MAIN_CAMPUS_ID);
    await expect(services.users.update(teacher.id, { fullName: 'Nope' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(services.users.setStatus(teacher.id, 'inactive')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('rejects assigning a role with permissions the actor does not hold', async () => {
    const services = setup(['dashboard:view', 'users:view', 'users:edit']);
    const teacher = await activeTeacherOn(services, MAIN_CAMPUS_ID);
    await expect(services.users.update(teacher.id, { roleId: 'admin' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: expect.stringContaining('Institution Admin'),
    });
  });

  it('rejects changes to users outside the actor campus scope', async () => {
    const services = setup(ADMIN, [MAIN_CAMPUS_ID]);
    const cityTeacher = await activeTeacherOn(services, CITY_CAMPUS_ID);
    const mainTeacher = await activeTeacherOn(services, MAIN_CAMPUS_ID);
    await expect(services.users.setStatus(cityTeacher.id, 'inactive')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(services.users.update(mainTeacher.id, { campusId: CITY_CAMPUS_ID })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect((await services.users.setStatus(mainTeacher.id, 'inactive')).status).toBe('inactive');
  });

  it('keeps the owner account out of reach of other users', async () => {
    const services = setup(ADMIN);
    const owner = (await services.users.list({ filters: { roleId: 'owner' }, page: 1, pageSize: 1 })).items[0]!;
    await expect(services.users.update(owner.id, { fullName: 'Changed' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(services.users.setStatus(owner.id, 'inactive')).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});
