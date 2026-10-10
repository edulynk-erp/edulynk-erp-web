import { describe, expect, it } from 'vitest';
import { MODULE_IDS, MODULES, isGrant } from '@/config/modules';
import { findNavItem, NAVIGATION, navigationFor } from '@/config/navigation';

describe('module catalogue', () => {
  it('defines every module exactly once', () => {
    expect(MODULES).toHaveLength(MODULE_IDS.length);
    expect(new Set(MODULES.map((module) => module.id))).toEqual(new Set(MODULE_IDS));
  });

  it('validates grant strings', () => {
    expect(isGrant('students:edit')).toBe(true);
    expect(isGrant('students:fly')).toBe(false);
    expect(isGrant('platform:view')).toBe(false);
    expect(isGrant('students:view:extra')).toBe(false);
  });
});

describe('navigation', () => {
  it('has unique ids and hrefs and lists all 27 modules', () => {
    const items = NAVIGATION.flatMap((group) => group.items);
    expect(items).toHaveLength(27);
    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
    expect(new Set(items.map((item) => item.href)).size).toBe(items.length);
  });

  it('never links to platform administration', () => {
    const hrefs = NAVIGATION.flatMap((group) => group.items.map((item) => item.href));
    expect(hrefs.some((href) => href.startsWith('/platform'))).toBe(false);
  });

  it('finds items with or without a trailing slash, and for nested routes', () => {
    expect(findNavItem('/dashboard')?.item.id).toBe('dashboard');
    expect(findNavItem('/dashboard/')?.item.id).toBe('dashboard');
    expect(findNavItem('/users/usr_1/edit')?.item.id).toBe('users');
    expect(findNavItem('/unknown')).toBeUndefined();
    expect(findNavItem('/usersx')).toBeUndefined();
  });

  it('filters by view grants and drops empty groups', () => {
    const groups = navigationFor(['dashboard:view', 'fees:view', 'fees:create', 'students:edit']);
    expect(groups.map((group) => group.id)).toEqual(['overview', 'finance']);
    expect(groups.flatMap((group) => group.items.map((item) => item.id))).toEqual(['dashboard', 'fees']);
    expect(navigationFor([])).toEqual([]);
  });
});
