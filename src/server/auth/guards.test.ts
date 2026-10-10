import { describe, expect, it, vi } from 'vitest';
import { isTenantPrincipal, toClientPrincipal } from '@/server/auth/guards';
import type { Principal } from '@/server/auth/types';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

const tenantUser: Principal = {
  subject: 'usr_1',
  displayName: 'Test User',
  email: 'test.user@school.example',
  realm: 'tenant',
  tenantId: 'tnt_1',
  roleId: 'teacher',
  roleName: 'Teacher',
  grants: ['dashboard:view', 'attendance:view'],
  campusScope: ['cmp_main'],
};

describe('toClientPrincipal', () => {
  it('passes display fields and grants but never the tenant or realm', () => {
    const client = toClientPrincipal(tenantUser);
    expect(client).toEqual({
      subject: 'usr_1',
      displayName: 'Test User',
      email: 'test.user@school.example',
      roleId: 'teacher',
      roleName: 'Teacher',
      grants: ['dashboard:view', 'attendance:view'],
      campusScope: ['cmp_main'],
    });
    expect(client).not.toHaveProperty('tenantId');
  });
});

describe('isTenantPrincipal', () => {
  it('accepts a tenant-realm principal with a tenant', () => {
    expect(isTenantPrincipal(tenantUser)).toBe(true);
  });

  it('rejects missing principals, other realms and principals without a tenant', () => {
    expect(isTenantPrincipal(null)).toBe(false);
    expect(isTenantPrincipal({ ...tenantUser, realm: 'platform' } as unknown as Principal)).toBe(false);
    expect(isTenantPrincipal({ ...tenantUser, tenantId: '  ' })).toBe(false);
  });
});
