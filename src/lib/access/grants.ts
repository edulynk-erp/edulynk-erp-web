import type { Grant, ModuleId, PermissionAction } from '@/config/modules';
import type { CampusScope } from '@/domain/common';

/** Whether a campus selection (a campus ID, or `'all'` for every campus) is within the user's campus scope. */
export function inCampusScope(scope: CampusScope, campusId: string | 'all'): boolean {
  if (scope === 'all') return true;
  return campusId !== 'all' && scope.includes(campusId);
}

/**
 * Frontend grant checks. They decide what to show; they are never the authorization boundary. The institution API
 * must re-check every request against the identity it verifies.
 */
export function hasGrant(grants: readonly Grant[], module: ModuleId, action: PermissionAction = 'view'): boolean {
  return grants.includes(`${module}:${action}`);
}

export function grantedModules(grants: readonly Grant[]): Set<ModuleId> {
  const modules = new Set<ModuleId>();
  for (const grant of grants) {
    const [module, action] = grant.split(':') as [ModuleId, PermissionAction];
    if (action === 'view') modules.add(module);
  }
  return modules;
}
