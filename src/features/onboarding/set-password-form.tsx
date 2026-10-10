'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Circle, Eye, EyeOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
  evaluatePassword,
  newPasswordSchema,
  PASSWORD_RULES,
  type NewPasswordValues,
} from '@/lib/auth/password-policy';
import { cn } from '@/lib/utils/cn';
import { LIVE_VALIDATION } from '@/lib/validation/form-options';

interface SetPasswordFormProps {
  email: string;
  submitLabel: string;
  /**
   * Called once the password satisfies the policy. The password is deliberately not passed on: in demo mode nothing
   * stores it; with the real identity service the browser will send it straight to that service.
   */
  onValid: () => Promise<void>;
}

export function SetPasswordForm({ email, submitLabel, onValid }: SetPasswordFormProps) {
  const schema = useMemo(() => newPasswordSchema(email), [email]);
  const [visible, setVisible] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<NewPasswordValues>({
    resolver: zodResolver(schema),
    ...LIVE_VALIDATION,
    defaultValues: { password: '', confirmPassword: '' },
  });
  const password = useWatch({ control, name: 'password' }) ?? '';
  const results = evaluatePassword(password);

  const submit = handleSubmit(async () => {
    setSubmitError(null);
    try {
      await onValid();
      reset({ password: '', confirmPassword: '' });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Something went wrong. Try again.');
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <FormField label="New password" error={errors.password?.message} required>
        {(field) => (
          <div className="relative">
            <Input
              {...field}
              type={visible ? 'text' : 'password'}
              autoComplete="new-password"
              className="h-10 pr-10"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setVisible((value) => !value)}
              className="absolute top-0 right-0 flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={visible ? 'Hide passwords' : 'Show passwords'}
            >
              {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            </button>
          </div>
        )}
      </FormField>

      <ul aria-label="Password requirements" className="grid gap-1.5 text-sm sm:grid-cols-2">
        {PASSWORD_RULES.map((rule) => {
          const met = results[rule.id];
          return (
            <li
              key={rule.id}
              className={cn('flex items-center gap-2', met ? 'text-success-foreground' : 'text-muted-foreground')}
            >
              {met ? <Check className="size-4" aria-hidden /> : <Circle className="size-3.5" aria-hidden />}
              {rule.label}
              <span className="sr-only">{met ? '(met)' : '(not met)'}</span>
            </li>
          );
        })}
      </ul>

      <FormField label="Confirm password" error={errors.confirmPassword?.message} required>
        <Input
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          className="h-10"
          {...register('confirmPassword')}
        />
      </FormField>

      {submitError ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {submitError}
        </p>
      ) : null}

      <Button type="submit" className="h-10 w-full" loading={isSubmitting} disabled={!isValid}>
        {isSubmitting ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
}
