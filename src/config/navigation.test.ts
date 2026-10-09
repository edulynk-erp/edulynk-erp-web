import { describe, expect, it } from 'vitest';
import { findNavItem, NAVIGATION } from '@/config/navigation';

describe('navigation', () => {
  it('has unique ids and hrefs', () => {
    const items = NAVIGATION.flatMap((group) => group.items);
    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
    expect(new Set(items.map((item) => item.href)).size).toBe(items.length);
  });

  it('never links to platform administration', () => {
    const hrefs = NAVIGATION.flatMap((group) => group.items.map((item) => item.href));
    expect(hrefs.some((href) => href.startsWith('/platform'))).toBe(false);
  });

  it('finds items with or without a trailing slash', () => {
    expect(findNavItem('/dashboard')?.item.id).toBe('dashboard');
    expect(findNavItem('/dashboard/')?.item.id).toBe('dashboard');
    expect(findNavItem('/unknown')).toBeUndefined();
  });
});
