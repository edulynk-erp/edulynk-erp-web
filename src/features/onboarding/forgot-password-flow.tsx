'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Inbox, MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from '@/lib/validation/zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { DemoNotice } from '@/features/onboarding/demo-notice';
import { describeError, useServices } from '@/services/provider';
import { LIVE_VALIDATION } from '@/lib/validation/form-options';

const schema = z.object({
  email: z.string().trim().min(1, 'Enter your email address.').max(254).email('Enter a valid email address.'),
});
type Values = z.infer<typeof schema>;

export function ForgotPasswordFlow() {
  const services = useServices();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<Values>({ resolver: zodResolver(schema), ...LIVE_VALIDATION, defaultValues: { email: '' } });

  const submit = handleSubmit(async ({ email }) => {
    if (!services) return;
    setError(null);
    try {
      await services.onboarding.requestPasswordReset(email);
      setSentTo(email);
    } catch (cause) {
      setError(describeError(cause));
    }
  });

  if (sentTo) {
    return (
      <div className="space-y-6 text-center" role="status">
        <span
          className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"
          aria-hidden
        >
          <MailCheck className="size-7" />
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            If <span className="font-medium text-foreground">{sentTo}</span> belongs to an active account, a reset link
            is on its way. The link expires in 30 minutes.
          </p>
        </div>
        <DemoNotice>No email was sent. In the demo, reset emails appear in the simulated inbox.</DemoNotice>
        <div className="flex flex-col gap-2">
          <Button asChild className="h-10">
            <Link href="/demo/inbox" prefetch={false}>
              <Inbox aria-hidden />
              Open simulated inbox
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-10">
            <Link href="/login" prefetch={false}>
              Back to sign in
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Forgot your password?</h1>
        <p className="text-sm text-muted-foreground">Enter your account email and we&apos;ll send you a reset link.</p>
      </div>
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormField label="Email address" error={errors.email?.message} required>
          <Input type="email" autoComplete="email" className="h-10" {...register('email')} />
        </FormField>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="h-10 w-full" loading={isSubmitting} disabled={!isValid || !services}>
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
      <DemoNotice>
        Simulated recovery. Reset emails are generated in the browser and shown in the simulated inbox.
      </DemoNotice>
      <Link
        href="/login"
        prefetch={false}
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to sign in
      </Link>
    </div>
  );
}
