export const NAV_ICONS = ['dashboard'] as const;
export type NavIcon = (typeof NAV_ICONS)[number];

export interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly description: string;
}

export interface NavGroup {
  readonly id: string;
  readonly label: string;
  readonly icon: NavIcon;
  readonly items: readonly NavItem[];
}

/**
 * The single navigation definition: sidebar and breadcrumbs derive from it. Institution modules (academics,
 * attendance, fees and so on) are added here as their contracts are approved; none are invented ahead of them.
 */
export const NAVIGATION: readonly NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'dashboard',
    items: [{ id: 'dashboard', label: 'Dashboard', href: '/dashboard', description: 'Institution overview.' }],
  },
];

export interface NavMatch {
  readonly group: NavGroup;
  readonly item: NavItem;
}

export function findNavItem(pathname: string): NavMatch | undefined {
  const normalised = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  for (const group of NAVIGATION) {
    const item = group.items.find((candidate) => candidate.href === normalised);
    if (item) return { group, item };
  }
  return undefined;
}
