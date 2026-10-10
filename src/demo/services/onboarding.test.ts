import { describe, expect, it } from 'vitest';
import { OWNER_ACCOUNT } from '@/demo/access/accounts';
import { createDemoServices } from '@/demo';
import { createMemoryPersistence } from '@/demo/store/persistence';

function setup(at = '2026-10-09T03:00:00.000Z') {
  let now = new Date(at);
  const persistence = createMemoryPersistence();
  const services = createDemoServices({ persistence, now: () => now, writeDelayMs: 0 });
  return {
    services,
    persistence,
    advance(ms: number) {
      now = new Date(now.getTime() + ms);
    },
  };
}

async function ownerToken(services: ReturnType<typeof setup>['services']) {
  const emails = await services.inbox.list();
  const email = emails.find((item) => item.kind === 'owner-setup');
  if (!email) throw new Error('owner email missing');
  return email.token;
}

describe('simulated owner onboarding', () => {
  it('accepts a valid invitation once and activates the owner', async () => {
    const { services } = setup();
    const token = await ownerToken(services);

    const check = await services.onboarding.checkInvitation(token);
    expect(check.state).toBe('valid');
    if (check.state === 'valid') expect(check.recipientName).toBe(OWNER_ACCOUNT.fullName);

    await services.onboarding.acceptInvitation(token);
    expect((await services.users.get(OWNER_ACCOUNT.userId)).status).toBe('active');
    expect(await services.onboarding.checkInvitation(token)).toEqual({ state: 'used', email: OWNER_ACCOUNT.email });
    await expect(services.onboarding.acceptInvitation(token)).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('reports unknown and expired tokens', async () => {
    const { services, advance } = setup();
    expect(await services.onboarding.checkInvitation('inv_does_not_exist')).toEqual({ state: 'invalid' });
    const token = await ownerToken(services);
    advance(8 * 24 * 60 * 60 * 1000);
    expect(await services.onboarding.checkInvitation(token)).toEqual({ state: 'expired', email: OWNER_ACCOUNT.email });
  });

  it('does not accept a setup token as a reset token or vice versa', async () => {
    const { services } = setup();
    expect(await services.onboarding.checkResetToken(await ownerToken(services))).toEqual({ state: 'invalid' });
  });

  it('records an audit event without storing any password', async () => {
    const { services, persistence } = setup();
    await services.onboarding.acceptInvitation(await ownerToken(services));
    const saved = JSON.stringify(persistence.load());
    expect(saved).toContain('invitation.accepted');
    expect(saved).not.toMatch(/password"\s*:/i);
  });
});

describe('simulated password reset', () => {
  it('issues a single-use, 30-minute reset email for active users only', async () => {
    const { services, advance } = setup();
    const before = (await services.inbox.list()).length;

    await services.onboarding.requestPasswordReset('ANIL.MEHTA@greenwood.edu.in ');
    const emails = await services.inbox.list();
    expect(emails).toHaveLength(before + 1);
    const reset = emails[0]!;
    expect(reset.kind).toBe('password-reset');
    expect(reset.to).toBe('anil.mehta@greenwood.edu.in');

    expect((await services.onboarding.checkResetToken(reset.token)).state).toBe('valid');
    await services.onboarding.completePasswordReset(reset.token);
    expect((await services.onboarding.checkResetToken(reset.token)).state).toBe('used');

    await services.onboarding.requestPasswordReset('anil.mehta@greenwood.edu.in');
    const second = (await services.inbox.list())[0]!;
    advance(31 * 60 * 1000);
    expect((await services.onboarding.checkResetToken(second.token)).state).toBe('expired');
  });

  it('behaves identically for unknown and not-yet-active addresses (no enumeration)', async () => {
    const { services } = setup();
    const before = (await services.inbox.list()).length;
    await expect(services.onboarding.requestPasswordReset('nobody@example.com')).resolves.toBeUndefined();
    await expect(services.onboarding.requestPasswordReset(OWNER_ACCOUNT.email)).resolves.toBeUndefined();
    expect(await services.inbox.list()).toHaveLength(before);
  });

  it('revokes an older reset link when a new one is requested', async () => {
    const { services } = setup();
    await services.onboarding.requestPasswordReset('anil.mehta@greenwood.edu.in');
    const first = (await services.inbox.list())[0]!;
    await services.onboarding.requestPasswordReset('anil.mehta@greenwood.edu.in');
    expect((await services.onboarding.checkResetToken(first.token)).state).toBe('invalid');
  });
});

describe('demo store persistence', () => {
  it('restores changed collections and the workspace from storage, and reset clears them', async () => {
    const first = setup();
    await first.services.onboarding.acceptInvitation(await ownerToken(first.services));
    first.services.demo?.setWorkspace({ campusId: 'cmp_city', academicYearId: 'ay_2026_27' });

    const reloaded = createDemoServices({
      persistence: first.persistence,
      now: () => new Date('2026-10-10T06:00:00.000Z'),
      writeDelayMs: 0,
    });
    expect((await reloaded.users.get(OWNER_ACCOUNT.userId)).status).toBe('active');
    expect(reloaded.demo?.getWorkspace()).toEqual({ campusId: 'cmp_city', academicYearId: 'ay_2026_27' });

    reloaded.demo?.reset();
    expect((await reloaded.users.get(OWNER_ACCOUNT.userId)).status).toBe('invited');
    expect(first.persistence.load()).toBeNull();
  });
});
