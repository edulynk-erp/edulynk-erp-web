import type { IsoDateTime, TenantScoped } from '@/domain/common';

/**
 * A simulated account-setup invitation. The token only identifies the invitation in demo data; in the real system the
 * identity service issues, hashes and verifies it, and the password is set there, never in this app.
 */
export interface Invitation extends TenantScoped {
  readonly token: string;
  readonly kind: 'owner-setup' | 'user-invite' | 'password-reset';
  readonly userId: string;
  readonly email: string;
  readonly createdAt: IsoDateTime;
  readonly expiresAt: IsoDateTime;
  readonly usedAt: IsoDateTime | null;
  readonly revokedAt: IsoDateTime | null;
}

export type TokenCheck =
  | { readonly state: 'valid'; readonly invitation: Invitation; readonly recipientName: string }
  | { readonly state: 'invalid' }
  | { readonly state: 'expired'; readonly email: string }
  | { readonly state: 'used'; readonly email: string };

/** A simulated email. Nothing is ever sent: the inbox page renders these for demonstration only. */
export interface SimulatedEmail extends TenantScoped {
  readonly id: string;
  readonly kind: 'owner-setup' | 'user-invite' | 'password-reset';
  readonly to: string;
  readonly toName: string;
  readonly subject: string;
  readonly sentAt: IsoDateTime;
  readonly token: string;
  readonly expiresAt: IsoDateTime;
  /** The person who triggered the email, when it was not the system. */
  readonly invitedBy: string | null;
  readonly roleName: string | null;
}
