import type { Grant } from '@/config/modules';
import type { IsoDateTime } from '@/domain/common';

export interface Role {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Whether individual users holding this role may receive extra (non-sensitive) permissions. */
  readonly allowsCustomPermissions: boolean;
  readonly grants: readonly Grant[];
  /** Present on roles defined by the institution; they can be renamed and deleted. */
  readonly custom?: { readonly createdAt: IsoDateTime; readonly createdBy: string };
  /** Present on built-in roles whose permissions the institution has changed from the defaults. */
  readonly modified?: { readonly updatedAt: IsoDateTime; readonly updatedBy: string };
}

/** The institution's changes to a built-in role. Names and descriptions of built-in roles are fixed. */
export interface RoleOverride {
  readonly roleId: string;
  readonly allowsCustomPermissions: boolean;
  readonly grants: readonly Grant[];
  readonly updatedAt: IsoDateTime;
  readonly updatedBy: string;
}

/** Built-in roles whose permissions cannot be changed. */
export const LOCKED_ROLE_IDS: readonly string[] = ['owner'];
