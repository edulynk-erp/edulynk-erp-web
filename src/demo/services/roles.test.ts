import { describe, expect, it } from 'vitest';
import { createDemoServices } from '@/demo';
import { findDemoRole } from '@/demo/access/roles';
import { createMemoryPersistence } from '@/demo/store/persistence';

function signIn(services: ReturnType<typeof createDemoServices>, roleId: string) {
  services.demo?.setActor({
    id: `usr_${roleId}`,
    name: `Test ${roleId}`,
    roleId,
    grants: findDemoRole(roleId)!.grants,
    campusScope: 'all',
  });
}

function setup(roleId = 'owner') {
  const persistence = createMemoryPersistence();
  const now = new Date('2026-10-09T03:00:00.000Z');
  const services = createDemoServices({ persistence, now: () => now, writeDelayMs: 0 });
  signIn(services, roleId);
  return { services, persistence };
}

const input = {
  name: 'Sports Coordinator',
  description: 'Sports events and student participation.',
  allowsCustomPermissions: true,
  grants: ['students:export', 'communication:create', 'dashboard:view'] as const,
};

describe('custom roles', () => {
  it('creates a role, implies view for every action and lists it after the built-in roles', async () => {
    const { services } = setup();
    const role = await services.roles.create({ ...input, grants: [...input.grants] });

    expect(role.custom).toBeDefined();
    expect(role.grants).toEqual([
      'dashboard:view',
      'students:view',
      'students:export',
      'communication:view',
      'communication:create',
    ]);
    const roles = await services.roles.list();
    expect(roles.at(-1)?.id).toBe(role.id);
    expect(roles).toHaveLength(13);
  });

  it('edits built-in role permissions (name fixed), resets them and keeps the owner locked', async () => {
    const { services, persistence } = setup();
    const original = await services.roles.get('teacher');
    const edited = await services.roles.update('teacher', {
      name: 'Renamed',
      description: 'ignored',
      allowsCustomPermissions: false,
      grants: ['dashboard:view', 'fees:export'],
    });
    expect(edited.name).toBe(original.name);
    expect(edited.description).toBe(original.description);
    expect(edited.grants).toEqual(['dashboard:view', 'fees:view', 'fees:export']);
    expect(edited.modified).toBeDefined();

    const reloaded = createDemoServices({ persistence, writeDelayMs: 0 });
    expect((await reloaded.roles.get('teacher')).grants).toEqual(edited.grants);

    const reset = await services.roles.resetToDefault('teacher');
    expect(reset.grants).toEqual(original.grants);
    expect(reset.modified).toBeUndefined();

    await expect(services.roles.update('owner', { ...input, grants: ['dashboard:view'] })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    const admin = setup('admin').services;
    await expect(admin.roles.update('owner', { ...input, grants: ['dashboard:view'] })).rejects.toMatchObject({
      code: 'CONFLICT',
    });
    await expect(services.roles.update('teacher', { ...input, grants: [] })).rejects.toMatchObject({
      code: 'VALIDATION',
    });
  });

  it('rejects duplicate names, empty permissions and deleting built-in roles', async () => {
    const { services } = setup();
    await expect(
      services.roles.create({ ...input, name: 'principal', grants: ['dashboard:view'] }),
    ).rejects.toMatchObject({
      code: 'VALIDATION',
      fieldErrors: { name: 'A role with this name already exists.' },
    });
    await expect(services.roles.create({ ...input, grants: [] })).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(services.roles.delete('teacher')).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('can be assigned to a user, blocks deletion while assigned and persists across reloads', async () => {
    const { services, persistence } = setup();
    const role = await services.roles.create({ ...input, grants: [...input.grants] });
    const { user } = await services.users.create({
      fullName: 'Kavya Iyer',
      email: 'kavya.iyer@greenwood.edu.in',
      mobile: '+91 98765 11111',
      employeeId: null,
      campusId: 'cmp_main',
      departmentId: null,
      designationId: 'dsg_sports_coordinator',
      roleId: role.id,
      customGrants: [],
    });
    expect(user.roleId).toBe(role.id);
    await expect(services.roles.delete(role.id)).rejects.toMatchObject({ code: 'CONFLICT' });

    const reloaded = createDemoServices({ persistence, writeDelayMs: 0 });
    expect((await reloaded.roles.get(role.id)).name).toBe('Sports Coordinator');

    await services.users.update(user.id, { roleId: 'teacher' });
    await services.roles.update(role.id, { ...input, name: 'Sports Lead', grants: ['dashboard:view'] });
    expect((await services.roles.get(role.id)).name).toBe('Sports Lead');
    await services.roles.delete(role.id);
    await expect(services.roles.get(role.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('privilege escalation guard', () => {
  it('rejects role changes when nobody is signed in', async () => {
    const { services } = setup();
    services.demo?.setActor(null);
    await expect(services.roles.create({ ...input, grants: ['dashboard:view'] })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('stops an admin from editing their own role or granting permissions they do not hold', async () => {
    const { services } = setup('admin');
    const admin = await services.roles.get('admin');
    await expect(
      services.roles.update('admin', { ...input, grants: [...admin.grants, 'institution:approve'] }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', message: expect.stringContaining('your own role') });

    await expect(
      services.roles.update('teacher', { ...input, grants: ['dashboard:view', 'institution:approve'] }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', message: expect.stringContaining('Institution Setup: approve') });
    await expect(services.roles.create({ ...input, grants: ['dashboard:view', 'audit:delete'] })).rejects.toMatchObject(
      { code: 'FORBIDDEN' },
    );

    const edited = await services.roles.update('teacher', { ...input, grants: ['dashboard:view', 'fees:view'] });
    expect(edited.grants).toEqual(['dashboard:view', 'fees:view']);
  });

  it('stops users from changing their own role', async () => {
    const { services } = setup('admin');
    services.demo?.setActor({
      id: 'usr_teacher_1',
      name: 'Self',
      roleId: 'teacher',
      grants: findDemoRole('admin')!.grants,
      campusScope: 'all',
    });
    await expect(services.users.update('usr_teacher_1', { roleId: 'admin' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
});
