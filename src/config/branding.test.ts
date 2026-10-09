import { describe, expect, it } from 'vitest';
import { brandingCss, DEFAULT_BRANDING, parseBranding } from '@/config/branding';

describe('parseBranding', () => {
  it('accepts valid branding', () => {
    const branding = { displayName: 'Test Institution', primaryColor: '#123abc', primaryForeground: '#ffffff' };
    expect(parseBranding(branding)).toEqual(branding);
  });

  it.each([
    { primaryColor: 'red' },
    { primaryColor: '#123abc;}body{display:none' },
    { primaryForeground: 'url(https://example.invalid)' },
    { displayName: '' },
    { displayName: '<script>' },
    { displayName: 'x'.repeat(81) },
  ])('falls back to the default for malformed input %o', (override) => {
    expect(parseBranding({ ...DEFAULT_BRANDING, ...override })).toEqual(DEFAULT_BRANDING);
  });

  it('falls back to the default for non-objects', () => {
    expect(parseBranding(null)).toEqual(DEFAULT_BRANDING);
    expect(parseBranding('#ffffff')).toEqual(DEFAULT_BRANDING);
  });
});

describe('brandingCss', () => {
  it('emits only the theme custom properties', () => {
    expect(brandingCss({ displayName: 'X', primaryColor: '#010203', primaryForeground: '#fefefe' })).toBe(
      ':root{--primary:#010203;--ring:#010203;--primary-foreground:#fefefe}',
    );
  });

  it('never emits unvalidated values', () => {
    const css = brandingCss({ displayName: 'X', primaryColor: '#000000}*{x:y', primaryForeground: '#ffffff' });
    expect(css).toBe(brandingCss(DEFAULT_BRANDING));
  });
});
