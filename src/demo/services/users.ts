import { getModule, isGrant, MODULES, PERMISSION_ACTIONS, type Grant, type ModuleId } from '@/config/modules';
import { designationName, isDesignationId } from '@/config/designations';
import { DEMO_TENANT_ID } from '@/demo/access/accounts';
import { invitationEmail } from '@/demo/seed/records';
import {
  authorize,
  authorizeCampus,
  copy,
  randomId,
  recordAudit,
  simulateWrite,
  type MockContext,
} from '@/demo/services/context';
import { LOCKED_ROLE_IDS, type Role, type RoleOverride } from '@/domain/access';
import type { Invitation, SimulatedEmail } from '@/domain/onboarding';
import type { User } from '@/domain/users';
import { runListQuery } from '@/lib/query/list';
import { ServiceError } from '@/services/errors';
import type { CreateUserInput, RoleInput, RoleService, UpdateUserInput, UserService } from '@/services/users';

export const INVITATION_TTL_MS = 7 * 86_400_000;
export const RESET_TTL_MS = 30 * 60_000;

const ROLE_NAME_MAX = 60;
const ROLE_DESCRIPTION_MAX = 200;

function allRoles(context: MockContext): readonly Role[] {
  const { roles, roleOverrides, customRoles } = context.store.data;
  const builtIn = roles.map((role) => {
    const override = roleOverrides.find((candidate) => candidate.roleId === role.id);
    if (!override || LOCKED_ROLE_IDS.includes(role.id)) return role;
    return {
      ...role,
      grants: override.grants,
      allowsCustomPermissions: override.allowsCustomPermissions,
      modified: { updatedAt: override.updatedAt, updatedBy: override.updatedBy },
    } satisfies Role;
  });
  return [...builtIn, ...customRoles];
}

function clearExtrasIfDisallowed(context: MockContext, before: Role, after: Role): void {
  if (after.allowsCustomPermissions || !before.allowsCustomPermissions) return;
  context.store.update('users', (users) =>
    users.map((user) =>
      user.roleId === after.id && user.customGrants.length > 0 ? { ...user, customGrants: [] } : user,
    ),
  );
}

function validateGrants(grants: readonly Grant[]): Record<string, string> {
  if (grants.some((grant) => !isGrant(grant))) return { grants: 'Unknown permission.' };
  if (grants.length === 0) return { grants: 'Select at least one permission.' };
  return {};
}

/** Every granted action implies `view` on the same module; the result is in catalogue order without duplicates. */
export function normaliseGrants(grants: readonly Grant[]): Grant[] {
  const set = new Set<Grant>();
  for (const grant of grants) {
    if (!isGrant(grant)) continue;
    set.add(grant);
    set.add(`${grant.split(':')[0] as ModuleId}:view`);
  }
  return MODULES.flatMap((module) =>
    PERMISSION_ACTIONS.map((action) => `${module.id}:${action}` as const).filter((grant) => set.has(grant)),
  );
}

function validateRole(context: MockContext, input: RoleInput, existingId: string | null): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = input.name.trim();
  if (name.length < 2) errors.name = 'Enter a role name.';
  else if (name.length > ROLE_NAME_MAX) errors.name = `Use at most ${ROLE_NAME_MAX} characters.`;
  else if (allRoles(context).some((role) => role.id !== existingId && role.name.toLowerCase() === name.toLowerCase())) {
    errors.name = 'A role with this name already exists.';
  }
  if (input.description.trim().length > ROLE_DESCRIPTION_MAX) {
    errors.description = `Use at most ${ROLE_DESCRIPTION_MAX} characters.`;
  }
  return { ...errors, ...validateGrants(input.grants) };
}

function requireCustomRole(context: MockContext, id: string): Role {
  const role = requireRole(context, id);
  if (!role.custom) throw new ServiceError('CONFLICT', 'Built-in roles cannot be deleted.');
  return role;
}

function requireEditableBuiltIn(context: MockContext, id: string): Role {
  const role = requireRole(context, id);
  if (role.custom) throw new ServiceError('CONFLICT', 'This is a custom role.');
  if (LOCKED_ROLE_IDS.includes(id)) {
    throw new ServiceError('CONFLICT', `${role.name} always has full access and cannot be changed.`);
  }
  return role;
}

function updateBuiltIn(context: MockContext, id: string, input: RoleInput): Role {
  const current = requireEditableBuiltIn(context, id);
  const errors = validateGrants(input.grants);
  if (Object.keys(errors).length > 0) throw new ServiceError('VALIDATION', 'Check the highlighted fields.', errors);
  const override: RoleOverride = {
    roleId: id,
    grants: normaliseGrants(input.grants),
    allowsCustomPermissions: input.allowsCustomPermissions,
    updatedAt: context.now().toISOString(),
    updatedBy: context.actor()?.name ?? 'System',
  };
  context.store.update('roleOverrides', (overrides) => [
    ...overrides.filter((candidate) => candidate.roleId !== id),
    override,
  ]);
  const next = requireRole(context, id);
  clearExtrasIfDisallowed(context, current, next);
  recordAudit(context, {
    module: 'users',
    action: 'role.permissions-changed',
    summary: `Permissions of built-in role ${next.name} changed (${current.grants.length} → ${next.grants.length})`,
    subjectId: id,
  });
  return next;
}

/**
 * Blocks privilege escalation: nobody may change the role they hold, or grant permissions they do not hold
 * themselves. Without this, anyone who can edit roles could give their own role (or a role they then assign) every
 * permission.
 */
function guardRoleChange(context: MockContext, roleId: string | null, grants: readonly Grant[]): void {
  const actor = authorize(context, 'users', roleId === null ? 'create' : 'edit');
  if (roleId !== null && roleId === actor.roleId) {
    throw new ServiceError(
      'FORBIDDEN',
      "You can't change the permissions of your own role. Ask another administrator.",
    );
  }
  const held = new Set(actor.grants);
  const beyond = normaliseGrants(grants).filter((grant) => !held.has(grant));
  if (beyond.length > 0) {
    const examples = beyond.slice(0, 3).map((grant) => {
      const [module, action] = grant.split(':') as [ModuleId, string];
      return `${getModule(module).label}: ${action}`;
    });
    throw new ServiceError(
      'FORBIDDEN',
      `You can only grant permissions you hold yourself. Not held: ${examples.join(', ')}${beyond.length > 3 ? ` and ${beyond.length - 3} more` : ''}.`,
    );
  }
}

/** Assigning a role hands out its permissions, so it follows the same rule as editing one. */
function guardRoleAssignment(context: MockContext, roleId: string): void {
  const role = allRoles(context).find((candidate) => candidate.id === roleId);
  if (!role) return;
  const held = new Set(context.actor()?.grants ?? []);
  if (role.grants.some((grant) => !held.has(grant))) {
    throw new ServiceError(
      'FORBIDDEN',
      `You can't assign the ${role.name} role because it has permissions you don't hold yourself.`,
    );
  }
}

/** Per-user extra permissions follow the same rule: only permissions the acting user holds can be handed out. */
function guardExtraGrants(context: MockContext, grants: readonly Grant[]): void {
  if (grants.length === 0) return;
  const held = new Set(context.actor()?.grants ?? []);
  if (grants.some((grant) => !held.has(grant))) {
    throw new ServiceError('FORBIDDEN', 'You can only grant permissions you hold yourself.');
  }
}

export function createRoleService(context: MockContext): RoleService {
  return {
    async list() {
      return copy(allRoles(context));
    },
    async get(id) {
      return copy(requireRole(context, id));
    },
    async create(input) {
      guardRoleChange(context, null, input.grants);
      await simulateWrite(context);
      const errors = validateRole(context, input, null);
      if (Object.keys(errors).length > 0) throw new ServiceError('VALIDATION', 'Check the highlighted fields.', errors);
      const role: Role = {
        id: randomId('rol', 10),
        name: input.name.trim(),
        description: input.description.trim(),
        allowsCustomPermissions: input.allowsCustomPermissions,
        grants: normaliseGrants(input.grants),
        custom: { createdAt: context.now().toISOString(), createdBy: context.actor()?.name ?? 'System' },
      };
      context.store.update('customRoles', (roles) => [...roles, role]);
      recordAudit(context, {
        module: 'users',
        action: 'role.created',
        summary: `Custom role ${role.name} created with ${role.grants.length} permissions`,
        subjectId: role.id,
      });
      return copy(role);
    },
    async update(id, input) {
      guardRoleChange(context, id, input.grants);
      await simulateWrite(context);
      if (!requireRole(context, id).custom) return copy(updateBuiltIn(context, id, input));
      const current = requireCustomRole(context, id);
      const errors = validateRole(context, input, id);
      if (Object.keys(errors).length > 0) throw new ServiceError('VALIDATION', 'Check the highlighted fields.', errors);
      const next: Role = {
        ...current,
        name: input.name.trim(),
        description: input.description.trim(),
        allowsCustomPermissions: input.allowsCustomPermissions,
        grants: normaliseGrants(input.grants),
      };
      context.store.update('customRoles', (roles) => roles.map((role) => (role.id === id ? next : role)));
      clearExtrasIfDisallowed(context, current, next);
      recordAudit(context, {
        module: 'users',
        action: 'role.updated',
        summary: `Custom role ${next.name} updated (${next.grants.length} permissions)`,
        subjectId: id,
      });
      return copy(next);
    },
    async delete(id) {
      authorize(context, 'users', 'delete');
      await simulateWrite(context);
      const role = requireCustomRole(context, id);
      const holders = context.store.data.users.filter((user) => user.roleId === id).length;
      if (holders > 0) {
        throw new ServiceError(
          'CONFLICT',
          `${role.name} is assigned to ${holders} ${holders === 1 ? 'user' : 'users'}. Reassign them before deleting the role.`,
        );
      }
      context.store.update('customRoles', (roles) => roles.filter((candidate) => candidate.id !== id));
      recordAudit(context, {
        module: 'users',
        action: 'role.deleted',
        summary: `Custom role ${role.name} deleted`,
        subjectId: id,
      });
    },
    async resetToDefault(id) {
      const defaults = context.store.data.roles.find((role) => role.id === id);
      guardRoleChange(context, id, defaults?.grants ?? []);
      await simulateWrite(context);
      const current = requireEditableBuiltIn(context, id);
      if (!current.modified) return copy(current);
      context.store.update('roleOverrides', (overrides) => overrides.filter((candidate) => candidate.roleId !== id));
      const next = requireRole(context, id);
      clearExtrasIfDisallowed(context, current, next);
      recordAudit(context, {
        module: 'users',
        action: 'role.permissions-reset',
        summary: `Built-in role ${next.name} reset to default permissions`,
        subjectId: id,
      });
      return copy(next);
    },
  };
}

function requireRole(context: MockContext, id: string): Role {
  const role = allRoles(context).find((candidate) => candidate.id === id);
  if (!role) throw new ServiceError('NOT_FOUND', 'Role not found.');
  return role;
}

function requireUser(context: MockContext, id: string): User {
  const user = context.store.data.users.find((candidate) => candidate.id === id);
  if (!user) throw new ServiceError('NOT_FOUND', 'User not found.');
  return user;
}

/** Custom permissions: only for roles that allow them, never for sensitive modules, never duplicating the role. */
export function validateCustomGrants(role: Role, grants: readonly Grant[]): Record<string, string> {
  if (grants.length === 0) return {};
  if (!role.allowsCustomPermissions) {
    return { customGrants: `${role.name} does not allow custom permissions.` };
  }
  for (const grant of grants) {
    if (!isGrant(grant)) return { customGrants: 'Unknown permission.' };
    const definition = getModule(grant.split(':')[0] as ModuleId);
    if (definition.sensitive) {
      return { customGrants: `${definition.label} permissions cannot be granted individually.` };
    }
  }
  return {};
}

/** The staff record with this employee number, linked by its ID. */
function staffIdFor(context: MockContext, employeeId: string | null | undefined): string | null {
  const code = employeeId?.trim().toUpperCase();
  if (!code) return null;
  return context.store.data.staff.find((member) => member.employeeId === code)?.id ?? null;
}

function validateUserFields(
  context: MockContext,
  input: Partial<CreateUserInput>,
  existingId: string | null,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const users = context.store.data.users.filter((user) => user.id !== existingId);
  if (input.email !== undefined) {
    const email = input.email.trim().toLowerCase();
    if (users.some((user) => user.email.toLowerCase() === email))
      errors.email = 'A user with this email already exists.';
  }
  if (input.employeeId) {
    const employeeId = input.employeeId.trim().toUpperCase();
    if (users.some((user) => user.employeeId?.toUpperCase() === employeeId)) {
      errors.employeeId = 'This employee ID is already assigned.';
    }
  }
  if (input.campusId !== undefined && !context.store.data.campuses.some((campus) => campus.id === input.campusId)) {
    errors.campusId = 'Select a campus.';
  }
  if (
    input.departmentId &&
    !context.store.data.departments.some((department) => department.id === input.departmentId)
  ) {
    errors.departmentId = 'Select a department.';
  }
  if (input.designationId !== undefined && !isDesignationId(input.designationId)) {
    errors.designationId = 'Select a designation.';
  }
  if (input.roleId !== undefined) {
    const role = allRoles(context).find((candidate) => candidate.id === input.roleId);
    if (!role) errors.roleId = 'Select a role.';
    else if (role.id === 'owner') errors.roleId = 'The Institution Owner role cannot be assigned here.';
    else Object.assign(errors, validateCustomGrants(role, input.customGrants ?? []));
  }
  return errors;
}

function issueInvitation(
  context: MockContext,
  user: User,
  kind: Invitation['kind'],
  ttlMs: number,
): { invitation: Invitation; email: SimulatedEmail } {
  const now = context.now();
  const invitation: Invitation = {
    tenantId: DEMO_TENANT_ID,
    token: randomId(kind === 'password-reset' ? 'rst' : 'inv', 24),
    kind,
    userId: user.id,
    email: user.email,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
    usedAt: null,
    revokedAt: null,
  };
  const roleName = allRoles(context).find((role) => role.id === user.roleId)?.name ?? null;
  const email = invitationEmail(invitation, user, randomId('eml'), context.actor()?.name ?? null, roleName);
  context.store.update('invitations', (items) => [
    ...items.map((item) =>
      item.userId === user.id && item.kind === kind && !item.usedAt && !item.revokedAt
        ? { ...item, revokedAt: now.toISOString() }
        : item,
    ),
    invitation,
  ]);
  context.store.update('emails', (items) => [email, ...items]);
  return { invitation, email };
}

function replaceUser(context: MockContext, next: User): User {
  context.store.update('users', (users) => users.map((user) => (user.id === next.id ? next : user)));
  return next;
}

export function createUserService(context: MockContext): UserService {
  const roleName = (id: string) => allRoles(context).find((role) => role.id === id)?.name ?? id;
  const campusName = (id: string) => context.store.data.campuses.find((campus) => campus.id === id)?.name ?? id;

  return {
    async list(query) {
      return copy(
        runListQuery(context.store.data.users, query, {
          searchText: (user) =>
            `${user.fullName} ${user.email} ${user.employeeId ?? ''} ${user.mobile} ${designationName(user.designationId)}`,
          filters: {
            status: (user, value) => user.status === value,
            roleId: (user, value) => user.roleId === value,
            campusId: (user, value) => user.campusId === value,
            departmentId: (user, value) => user.departmentId === value,
            designationId: (user, value) => user.designationId === value,
            invitationStatus: (user, value) => user.invitationStatus === value,
          },
          sortKeys: {
            fullName: (user) => user.fullName,
            email: (user) => user.email,
            role: (user) => roleName(user.roleId),
            campus: (user) => campusName(user.campusId),
            status: (user) => user.status,
            lastActiveAt: (user) => user.lastActiveAt,
            createdAt: (user) => user.createdAt,
          },
        }),
      );
    },

    async counts() {
      const users = context.store.data.users;
      return {
        all: users.length,
        active: users.filter((user) => user.status === 'active').length,
        inactive: users.filter((user) => user.status === 'inactive').length,
        invited: users.filter((user) => user.status === 'invited').length,
      };
    },

    async get(id) {
      return copy(requireUser(context, id));
    },

    async create(input: CreateUserInput) {
      authorize(context, 'users', 'create');
      authorizeCampus(context, input.campusId);
      guardRoleAssignment(context, input.roleId);
      guardExtraGrants(context, input.customGrants);
      await simulateWrite(context);
      const errors = validateUserFields(context, input, null);
      if (Object.keys(errors).length > 0) throw new ServiceError('VALIDATION', 'Check the highlighted fields.', errors);
      const now = context.now().toISOString();
      const user: User = {
        tenantId: DEMO_TENANT_ID,
        id: randomId('usr', 12),
        fullName: input.fullName.trim(),
        email: input.email.trim().toLowerCase(),
        mobile: input.mobile.trim(),
        staffId: staffIdFor(context, input.employeeId),
        employeeId: input.employeeId?.trim().toUpperCase() || null,
        campusId: input.campusId,
        departmentId: input.departmentId,
        designationId: input.designationId,
        roleId: input.roleId,
        customGrants: [...input.customGrants],
        status: 'invited',
        invitationStatus: 'pending',
        createdAt: now,
        lastActiveAt: null,
      };
      context.store.update('users', (users) => [user, ...users]);
      const { email } = issueInvitation(context, user, 'user-invite', INVITATION_TTL_MS);
      recordAudit(context, {
        module: 'users',
        action: 'user.created',
        summary: `User ${user.fullName} created as ${roleName(user.roleId)}; simulated invitation generated`,
        subjectId: user.id,
      });
      return copy({ user, email });
    },

    async update(id, input: UpdateUserInput) {
      const actor = authorize(context, 'users', 'edit');
      if (id === actor.id && (input.roleId !== undefined || input.customGrants !== undefined)) {
        throw new ServiceError('FORBIDDEN', "You can't change your own role or permissions.");
      }
      guardExtraGrants(context, input.customGrants ?? []);
      await simulateWrite(context);
      const current = requireUser(context, id);
      if (current.roleId === 'owner' && actor.id !== id) {
        throw new ServiceError('FORBIDDEN', 'Only the institution owner can edit the owner account.');
      }
      authorizeCampus(context, current.campusId);
      if (input.campusId !== undefined) authorizeCampus(context, input.campusId);
      if (input.roleId !== undefined && input.roleId !== current.roleId) guardRoleAssignment(context, input.roleId);
      const roleId = input.roleId ?? current.roleId;
      const errors = validateUserFields(
        context,
        { ...input, roleId, customGrants: input.customGrants ?? (input.roleId ? [] : current.customGrants) },
        id,
      );
      if (current.roleId === 'owner' && input.roleId && input.roleId !== 'owner') {
        errors.roleId = 'The owner role cannot be changed here.';
      } else if (current.roleId === 'owner') {
        delete errors.roleId;
      }
      if (Object.keys(errors).length > 0) throw new ServiceError('VALIDATION', 'Check the highlighted fields.', errors);
      const next: User = {
        ...current,
        ...(input.fullName !== undefined ? { fullName: input.fullName.trim() } : {}),
        ...(input.mobile !== undefined ? { mobile: input.mobile.trim() } : {}),
        ...(input.employeeId !== undefined
          ? {
              employeeId: input.employeeId?.trim().toUpperCase() || null,
              staffId: staffIdFor(context, input.employeeId),
            }
          : {}),
        ...(input.campusId !== undefined ? { campusId: input.campusId } : {}),
        ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
        ...(input.designationId !== undefined ? { designationId: input.designationId } : {}),
        roleId,
        customGrants: [...(input.customGrants ?? (input.roleId ? [] : current.customGrants))],
      };
      replaceUser(context, next);
      const roleChanged = next.roleId !== current.roleId;
      recordAudit(context, {
        module: 'users',
        action: roleChanged ? 'role.changed' : 'user.updated',
        summary: roleChanged
          ? `Role of ${next.fullName} changed from ${roleName(current.roleId)} to ${roleName(next.roleId)}`
          : `Profile of ${next.fullName} updated`,
        subjectId: id,
      });
      return copy(next);
    },

    async setStatus(id, status) {
      authorize(context, 'users', 'edit');
      await simulateWrite(context);
      const current = requireUser(context, id);
      authorizeCampus(context, current.campusId);
      if (current.roleId === 'owner')
        throw new ServiceError('CONFLICT', 'The institution owner cannot be deactivated.');
      if (current.id === context.actor()?.id) throw new ServiceError('CONFLICT', 'You cannot change your own status.');
      if (current.status === 'invited') {
        throw new ServiceError('CONFLICT', 'Invited users become active when they accept their invitation.');
      }
      if (current.status === status) return copy(current);
      const next = replaceUser(context, { ...current, status });
      recordAudit(context, {
        module: 'users',
        action: status === 'active' ? 'user.activated' : 'user.deactivated',
        summary: `${current.fullName} ${status === 'active' ? 'activated' : 'deactivated'}`,
        subjectId: id,
      });
      return copy(next);
    },

    async resendInvitation(id) {
      await simulateWrite(context);
      const current = requireUser(context, id);
      if (current.status !== 'invited') throw new ServiceError('CONFLICT', 'Only invited users can be re-invited.');
      const kind = current.roleId === 'owner' ? 'owner-setup' : 'user-invite';
      const { email } = issueInvitation(context, current, kind, INVITATION_TTL_MS);
      replaceUser(context, { ...current, invitationStatus: 'pending' });
      recordAudit(context, {
        module: 'users',
        action: 'invitation.resent',
        summary: `Simulated invitation re-sent to ${current.fullName}`,
        subjectId: id,
      });
      return copy(email);
    },

    async sendPasswordReset(id) {
      await simulateWrite(context);
      const current = requireUser(context, id);
      if (current.status !== 'active') {
        throw new ServiceError('CONFLICT', 'Password resets can only be sent to active users.');
      }
      const { email } = issueInvitation(context, current, 'password-reset', RESET_TTL_MS);
      recordAudit(context, {
        module: 'users',
        action: 'password.reset-requested',
        summary: `Simulated password reset link generated for ${current.fullName}`,
        subjectId: id,
      });
      return copy(email);
    },

    async activity(id) {
      requireUser(context, id);
      return copy(
        context.store.data.audit
          .filter((event) => event.subjectId === id || event.actorId === id)
          .slice(0, 50)
          .map((event) => ({
            id: event.id,
            userId: id,
            at: event.at,
            summary: event.summary,
            actorName: event.actorName,
          })),
      );
    },
  };
}
