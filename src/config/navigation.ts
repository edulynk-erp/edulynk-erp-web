import {
  findModuleByPath,
  MODULES,
  NAV_GROUP_IDS,
  NAV_GROUP_LABELS,
  type Grant,
  type ModuleIcon,
  type ModuleId,
  type NavGroupId,
} from '@/config/modules';
import { grantedModules } from '@/lib/access/grants';

export type NavIcon = ModuleIcon;

export interface NavItem {
  readonly id: ModuleId;
  readonly label: string;
  readonly href: string;
  readonly icon: NavIcon;
  readonly description: string;
}

export interface NavGroup {
  readonly id: NavGroupId;
  readonly label: string;
  readonly items: readonly NavItem[];
}

function toNavItem(module: (typeof MODULES)[number]): NavItem {
  return { id: module.id, label: module.label, href: module.href, icon: module.icon, description: module.description };
}

/** Every module, grouped. Sidebar and breadcrumbs derive from the module catalogue in config/modules.ts. */
export const NAVIGATION: readonly NavGroup[] = NAV_GROUP_IDS.map((id) => ({
  id,
  label: NAV_GROUP_LABELS[id],
  items: MODULES.filter((module) => module.group === id).map(toNavItem),
}));

/** Navigation restricted to modules the principal may view; empty groups are dropped. Presentation only. */
export function navigationFor(grants: readonly Grant[]): NavGroup[] {
  const visible = grantedModules(grants);
  return NAVIGATION.map((group) => ({ ...group, items: group.items.filter((item) => visible.has(item.id)) })).filter(
    (group) => group.items.length > 0,
  );
}

export interface NavMatch {
  readonly group: NavGroup;
  readonly item: NavItem;
}

export function findNavItem(pathname: string): NavMatch | undefined {
  const definition = findModuleByPath(pathname);
  if (!definition) return undefined;
  const group = NAVIGATION.find((candidate) => candidate.id === definition.group);
  const item = group?.items.find((candidate) => candidate.id === definition.id);
  return group && item ? { group, item } : undefined;
}
