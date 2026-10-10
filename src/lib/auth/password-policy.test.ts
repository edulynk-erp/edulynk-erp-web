import { describe, expect, it } from 'vitest';
import { evaluatePassword, newPasswordSchema } from '@/lib/auth/password-policy';

describe('password policy', () => {
  it('evaluates each rule', () => {
    expect(evaluatePassword('')).toEqual({ length: false, upper: false, lower: false, number: false, special: false });
    expect(evaluatePassword('Sunrise#2026')).toEqual({
      length: true,
      upper: true,
      lower: true,
      number: true,
      special: true,
    });
  });

  const schema = newPasswordSchema('ramesh.kumar@school.example');

  it('accepts a compliant, confirmed password', () => {
    expect(schema.safeParse({ password: 'Sunrise#2026', confirmPassword: 'Sunrise#2026' }).success).toBe(true);
  });

  it.each([
    ['too weak', { password: 'sunrise', confirmPassword: 'sunrise' }, 'password'],
    ['mismatch', { password: 'Sunrise#2026', confirmPassword: 'Sunrise#2027' }, 'confirmPassword'],
    ['missing confirmation', { password: 'Sunrise#2026', confirmPassword: '' }, 'confirmPassword'],
    ['contains the mailbox name', { password: 'Ramesh.Kumar#1', confirmPassword: 'Ramesh.Kumar#1' }, 'password'],
    ['too long', { password: `Aa1!${'x'.repeat(130)}`, confirmPassword: `Aa1!${'x'.repeat(130)}` }, 'password'],
  ])('rejects %s', (_, values, field) => {
    const result = schema.safeParse(values);
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path[0] === field)).toBe(true);
  });
});
