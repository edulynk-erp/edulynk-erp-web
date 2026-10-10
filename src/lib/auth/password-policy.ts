import { z } from '@/lib/validation/zod';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export interface PasswordRule {
  readonly id: 'length' | 'upper' | 'lower' | 'number' | 'special';
  readonly label: string;
  readonly test: (password: string) => boolean;
}

/** Shown as a live checklist; the identity service remains the authority on password acceptance. */
export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: 'length',
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (password) => password.length >= PASSWORD_MIN_LENGTH,
  },
  { id: 'upper', label: 'One uppercase letter', test: (password) => /\p{Lu}/u.test(password) },
  { id: 'lower', label: 'One lowercase letter', test: (password) => /\p{Ll}/u.test(password) },
  { id: 'number', label: 'One number', test: (password) => /\p{Nd}/u.test(password) },
  {
    id: 'special',
    label: 'One special character',
    test: (password) => /[^\p{L}\p{Nd}\s]/u.test(password),
  },
];

export function evaluatePassword(password: string): Record<PasswordRule['id'], boolean> {
  return Object.fromEntries(PASSWORD_RULES.map((rule) => [rule.id, rule.test(password)])) as Record<
    PasswordRule['id'],
    boolean
  >;
}

/** Password and confirmation. `email` is used to reject passwords that contain the mailbox name. */
export function newPasswordSchema(email: string) {
  const mailbox = email.split('@')[0]?.toLowerCase() ?? '';
  return z
    .object({
      password: z.string().max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters.`),
      confirmPassword: z.string(),
    })
    .superRefine(({ password, confirmPassword }, context) => {
      const failed = PASSWORD_RULES.filter((rule) => !rule.test(password));
      if (failed.length > 0) {
        context.addIssue({
          code: 'custom',
          path: ['password'],
          message: `Password needs: ${failed.map((rule) => rule.label.toLowerCase()).join(', ')}.`,
        });
      } else if (mailbox.length >= 3 && password.toLowerCase().includes(mailbox)) {
        context.addIssue({ code: 'custom', path: ['password'], message: 'Password must not contain your email name.' });
      }
      if (confirmPassword.length === 0) {
        context.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Confirm your password.' });
      } else if (password !== confirmPassword) {
        context.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords do not match.' });
      }
    });
}

export type NewPasswordValues = z.infer<ReturnType<typeof newPasswordSchema>>;
