import { describe, expect, it } from 'vitest';
import { createDemoIdentityAdapter, DEMO_PASSWORD } from '@/server/auth/adapters/demo';
import { createDemoIdentityAdapter as createExcluded } from '@/server/auth/adapters/demo.excluded';
import { IdentityError } from '@/server/auth/types';

const NOW = Date.parse('2026-10-09T06:00:00.000Z');

describe('demo identity adapter', () => {
  it('offers the published credential and one account per role', async () => {
    const step = await createDemoIdentityAdapter({ now: () => NOW }).beginSignIn();
    expect(step.kind).toBe('demo-credentials');
    if (step.kind !== 'demo-credentials') return;
    expect(step.password).toBe(DEMO_PASSWORD);
    expect(new Set(step.accounts.map((account) => account.roleId)).size).toBe(12);
  });

  it('signs in with the demo password (case-insensitive email) and resolves the principal with grants', async () => {
    const adapter = createDemoIdentityAdapter({ now: () => NOW });
    const tokens = await adapter.completeSignIn({
      kind: 'demo-credentials',
      email: ' Meena.Reddy@greenwood.edu.in',
      password: DEMO_PASSWORD,
    });
    const principal = await adapter.getPrincipal(tokens.accessToken);
    expect(principal).toMatchObject({ roleId: 'principal', realm: 'tenant', tenantId: 'tnt_greenwood_hyd' });
    expect(principal?.grants).toContain('students:view');
    expect(principal?.grants).not.toContain('users:delete');
    expect(principal?.campusScope).toEqual(['cmp_main']);
  });

  it('gives institution-wide roles every campus and campus staff only their own', async () => {
    const adapter = createDemoIdentityAdapter({ now: () => NOW });
    const scopeOf = async (roleId: string) =>
      (await adapter.getPrincipal((await adapter.completeSignIn({ kind: 'demo-role', roleId })).accessToken))
        ?.campusScope;
    expect(await scopeOf('owner')).toBe('all');
    expect(await scopeOf('admin')).toBe('all');
    expect(await scopeOf('teacher')).toEqual(['cmp_main']);
    expect(await scopeOf('transport-hostel')).toEqual(['cmp_city']);
  });

  it('rejects wrong passwords and unknown emails with the same error', async () => {
    const adapter = createDemoIdentityAdapter({ now: () => NOW });
    for (const input of [
      { email: 'meena.reddy@greenwood.edu.in', password: 'wrong' },
      { email: 'nobody@greenwood.edu.in', password: DEMO_PASSWORD },
    ]) {
      await expect(adapter.completeSignIn({ kind: 'demo-credentials', ...input })).rejects.toMatchObject({
        code: 'SIGN_IN_REJECTED',
        message: 'Email or password is incorrect.',
      });
    }
  });

  it('switches role only to a known demo role', async () => {
    const adapter = createDemoIdentityAdapter({ now: () => NOW });
    const tokens = await adapter.completeSignIn({ kind: 'demo-role', roleId: 'accountant' });
    expect((await adapter.getPrincipal(tokens.accessToken))?.roleId).toBe('accountant');
    await expect(adapter.completeSignIn({ kind: 'demo-role', roleId: 'super-admin' })).rejects.toBeInstanceOf(
      IdentityError,
    );
  });

  it('expires access tokens, refreshes from the refresh token, and ignores forged tokens', async () => {
    let now = NOW;
    const adapter = createDemoIdentityAdapter({ now: () => now });
    const tokens = await adapter.completeSignIn({ kind: 'demo-role', roleId: 'teacher' });
    now += 31 * 60 * 1000;
    expect(await adapter.getPrincipal(tokens.accessToken)).toBeNull();
    const refreshed = await adapter.refresh(tokens.refreshToken!);
    expect((await adapter.getPrincipal(refreshed.accessToken))?.roleId).toBe('teacher');
    expect(await adapter.getPrincipal(tokens.refreshToken!)).toBeNull();
    expect(await adapter.getPrincipal('demo-access.usr_nobody.9999999999.x')).toBeNull();
    await expect(adapter.refresh('demo-refresh.usr_nobody.0.x')).rejects.toMatchObject({ code: 'REFRESH_FAILED' });
  });

  it('is inert in builds that exclude it', () => {
    expect(() => createExcluded()).toThrow(expect.objectContaining({ code: 'ADAPTER_EXCLUDED' }));
  });
});
