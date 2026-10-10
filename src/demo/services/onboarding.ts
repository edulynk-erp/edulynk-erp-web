import { copy, recordAudit, simulateWrite, type MockContext } from '@/demo/services/context';
import { RESET_TTL_MS } from '@/demo/services/users';
import { invitationEmail } from '@/demo/seed/records';
import { DEMO_TENANT_ID } from '@/demo/access/accounts';
import type { Invitation, TokenCheck } from '@/domain/onboarding';
import { ServiceError } from '@/services/errors';
import type { InboxService, OnboardingService } from '@/services/onboarding';

type Purpose = 'setup' | 'reset';

function checkToken(context: MockContext, token: string, purpose: Purpose): TokenCheck {
  const invitation = context.store.data.invitations.find((candidate) => candidate.token === token);
  const kindMatches =
    invitation !== undefined &&
    (purpose === 'reset' ? invitation.kind === 'password-reset' : invitation.kind !== 'password-reset');
  if (!invitation || !kindMatches || invitation.revokedAt) return { state: 'invalid' };
  if (invitation.usedAt) return { state: 'used', email: invitation.email };
  if (Date.parse(invitation.expiresAt) <= context.now().getTime()) return { state: 'expired', email: invitation.email };
  const user = context.store.data.users.find((candidate) => candidate.id === invitation.userId);
  if (!user) return { state: 'invalid' };
  if (purpose === 'reset' && user.status !== 'active') return { state: 'invalid' };
  return { state: 'valid', invitation: copy(invitation), recipientName: user.fullName };
}

function consume(context: MockContext, token: string, purpose: Purpose): Invitation {
  const check = checkToken(context, token, purpose);
  if (check.state !== 'valid') {
    throw new ServiceError('CONFLICT', `This link is ${check.state === 'used' ? 'already used' : check.state}.`);
  }
  const usedAt = context.now().toISOString();
  context.store.update('invitations', (items) =>
    items.map((item) => (item.token === token ? { ...item, usedAt } : item)),
  );
  return check.invitation;
}

export function createOnboardingService(context: MockContext): OnboardingService {
  const actorFor = (userId: string) => {
    const user = context.store.data.users.find((candidate) => candidate.id === userId);
    return user ? { id: user.id, name: user.fullName } : undefined;
  };

  return {
    async checkInvitation(token) {
      return checkToken(context, token, 'setup');
    },

    async acceptInvitation(token) {
      await simulateWrite(context);
      const invitation = consume(context, token, 'setup');
      context.store.update('users', (users) =>
        users.map((user) =>
          user.id === invitation.userId
            ? {
                ...user,
                status: user.status === 'inactive' ? 'inactive' : 'active',
                invitationStatus: 'accepted',
                lastActiveAt: context.now().toISOString(),
              }
            : user,
        ),
      );
      recordAudit(
        context,
        {
          module: 'users',
          action: 'invitation.accepted',
          summary: 'Simulated invitation accepted; account setup completed (demo — no password stored)',
          subjectId: invitation.userId,
        },
        actorFor(invitation.userId),
      );
    },

    async requestPasswordReset(email) {
      await simulateWrite(context);
      const normalised = email.trim().toLowerCase();
      const user = context.store.data.users.find(
        (candidate) => candidate.email.toLowerCase() === normalised && candidate.status === 'active',
      );
      if (!user) return;
      const now = context.now();
      const invitation: Invitation = {
        tenantId: DEMO_TENANT_ID,
        token: `rst_${Array.from(crypto.getRandomValues(new Uint8Array(24)), (byte) => (byte % 36).toString(36)).join('')}`,
        kind: 'password-reset',
        userId: user.id,
        email: user.email,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + RESET_TTL_MS).toISOString(),
        usedAt: null,
        revokedAt: null,
      };
      context.store.update('invitations', (items) => [
        ...items.map((item) =>
          item.userId === user.id && item.kind === 'password-reset' && !item.usedAt && !item.revokedAt
            ? { ...item, revokedAt: now.toISOString() }
            : item,
        ),
        invitation,
      ]);
      context.store.update('emails', (items) => [
        invitationEmail(invitation, user, `eml_${invitation.token.slice(4, 16)}`, null),
        ...items,
      ]);
      recordAudit(
        context,
        {
          module: 'users',
          action: 'password.reset-requested',
          summary: 'Password reset requested (simulated email generated)',
          subjectId: user.id,
        },
        actorFor(user.id),
      );
    },

    async checkResetToken(token) {
      return checkToken(context, token, 'reset');
    },

    async completePasswordReset(token) {
      await simulateWrite(context);
      const invitation = consume(context, token, 'reset');
      recordAudit(
        context,
        {
          module: 'users',
          action: 'password.reset-completed',
          summary: 'Password reset completed (demo — no password stored)',
          subjectId: invitation.userId,
        },
        actorFor(invitation.userId),
      );
    },

    async getPublicInstitution() {
      const { name, plan, contactEmail, supportEmail, cityId } = context.store.data.institution;
      return { name, plan, contactEmail, supportEmail, cityId };
    },
  };
}

export function createInboxService(context: MockContext): InboxService {
  return {
    async list() {
      return copy([...context.store.data.emails].sort((a, b) => b.sentAt.localeCompare(a.sentAt)));
    },
    async get(id) {
      const email = context.store.data.emails.find((candidate) => candidate.id === id);
      if (!email) throw new ServiceError('NOT_FOUND', 'Email not found.');
      return copy(email);
    },
  };
}
