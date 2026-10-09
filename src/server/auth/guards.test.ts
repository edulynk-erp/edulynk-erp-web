import { describe, expect, it, vi } from 'vitest';
import { isTenantPrincipal } from '@/server/auth/guards';
import type { Principal } from '@/server/auth/types';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

const tenantUser: Principal = { subject: 'usr_1', displayName: 'Test User', realm: 'tenant', tenantId: 'tnt_1' };

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
