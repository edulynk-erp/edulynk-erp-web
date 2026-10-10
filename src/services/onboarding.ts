import type { Institution } from '@/domain/institution';
import type { SimulatedEmail, TokenCheck } from '@/domain/onboarding';

/**
 * Account setup and recovery. Passwords never pass through this interface: the browser validates the policy, and the
 * real identity service will receive the password directly. In demo mode no password is stored anywhere.
 */
export interface OnboardingService {
  checkInvitation(token: string): Promise<TokenCheck>;
  /** Marks the invitation used and the account active. */
  acceptInvitation(token: string): Promise<void>;
  /** Always resolves, whether or not the address belongs to a user, so accounts cannot be enumerated. */
  requestPasswordReset(email: string): Promise<void>;
  checkResetToken(token: string): Promise<TokenCheck>;
  completePasswordReset(token: string): Promise<void>;
  /** Institution details shown on public onboarding pages. */
  getPublicInstitution(): Promise<Pick<Institution, 'name' | 'plan' | 'contactEmail' | 'supportEmail' | 'cityId'>>;
}

export interface InboxService {
  list(): Promise<readonly SimulatedEmail[]>;
  get(id: string): Promise<SimulatedEmail>;
}
