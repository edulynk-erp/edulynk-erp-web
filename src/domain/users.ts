import type { Grant } from '@/config/modules';
import type { CampusScoped, IsoDateTime } from '@/domain/common';

export const USER_STATUSES = ['active', 'inactive', 'invited'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const INVITATION_STATUSES = ['pending', 'accepted', 'expired', 'revoked'] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export interface User extends CampusScoped {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly mobile: string;
  /** The staff record this account belongs to, if any. */
  readonly staffId: string | null;
  readonly employeeId: string | null;
  readonly departmentId: string | null;
  /** From the designations catalog (`config/designations`). */
  readonly designationId: string;
  readonly roleId: string;
  /** Extra permissions beyond the role, only where the role allows them. */
  readonly customGrants: readonly Grant[];
  readonly status: UserStatus;
  readonly invitationStatus: InvitationStatus;
  readonly createdAt: IsoDateTime;
  readonly lastActiveAt: IsoDateTime | null;
}

export interface UserActivity {
  readonly id: string;
  readonly userId: string;
  readonly at: IsoDateTime;
  readonly summary: string;
  readonly actorName: string;
}
