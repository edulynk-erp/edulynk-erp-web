import type { Grant } from '@/config/modules';
import type { Role } from '@/domain/access';
import type { SimulatedEmail } from '@/domain/onboarding';
import type { InvitationStatus, User, UserActivity, UserStatus } from '@/domain/users';
import type { ListQuery, Page } from '@/lib/query/list';

export interface UserFilters extends Record<string, string | undefined> {
  status?: UserStatus;
  roleId?: string;
  campusId?: string;
  departmentId?: string;
  invitationStatus?: InvitationStatus;
}

export interface CreateUserInput {
  readonly fullName: string;
  readonly email: string;
  readonly mobile: string;
  readonly employeeId: string | null;
  readonly campusId: string;
  readonly departmentId: string | null;
  readonly designationId: string;
  readonly roleId: string;
  readonly customGrants: readonly Grant[];
}

export type UpdateUserInput = Partial<Omit<CreateUserInput, 'email'>>;

export interface UserCounts {
  readonly all: number;
  readonly active: number;
  readonly inactive: number;
  readonly invited: number;
}

export interface UserService {
  list(query: ListQuery<UserFilters>): Promise<Page<User>>;
  counts(): Promise<UserCounts>;
  get(id: string): Promise<User>;
  /** Creates the user and a simulated invitation email. Rejects duplicate emails and employee IDs. */
  create(input: CreateUserInput): Promise<{ readonly user: User; readonly email: SimulatedEmail }>;
  update(id: string, input: UpdateUserInput): Promise<User>;
  setStatus(id: string, status: 'active' | 'inactive'): Promise<User>;
  resendInvitation(id: string): Promise<SimulatedEmail>;
  sendPasswordReset(id: string): Promise<SimulatedEmail>;
  activity(id: string): Promise<readonly UserActivity[]>;
}

export interface RoleInput {
  readonly name: string;
  readonly description: string;
  readonly allowsCustomPermissions: boolean;
  readonly grants: readonly Grant[];
}

export interface RoleService {
  /** Built-in roles first, then custom roles in creation order. */
  list(): Promise<readonly Role[]>;
  get(id: string): Promise<Role>;
  /** Creates a custom role. Names are unique (case-insensitive); every action implies `view` on its module. */
  create(input: RoleInput): Promise<Role>;
  /**
   * Custom roles: every field. Built-in roles: permissions and `allowsCustomPermissions` only (name and description are
   * fixed). Locked roles (the owner) cannot be changed.
   */
  update(id: string, input: RoleInput): Promise<Role>;
  /** Restores a built-in role's default permissions. */
  resetToDefault(id: string): Promise<Role>;
  /** Custom roles only, and only while no user holds the role. */
  delete(id: string): Promise<void>;
}
