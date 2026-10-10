'use client';

import { CheckCircle2, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ErrorState, LoadingState } from '@/components/feedback/states';
import { Button } from '@/components/ui/button';
import { DemoNotice } from '@/features/onboarding/demo-notice';
import { SetPasswordForm } from '@/features/onboarding/set-password-form';
import { ExpiredTokenState, InvalidTokenState, UsedTokenState } from '@/features/onboarding/token-states';
import { describeError, useServiceQuery, useServices } from '@/services/provider';

export function ResetFlow({ token }: { token: string }) {
  const services = useServices();
  const [done, setDone] = useState(false);
  const query = useServiceQuery((s) => s.onboarding.checkResetToken(token), [token]);

  if (done) {
    return (
      <div className="space-y-6 text-center" role="status">
        <span
          className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/15 text-success"
          aria-hidden
        >
          <CheckCircle2 className="size-8" />
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Password reset complete</h1>
          <p className="text-sm text-muted-foreground">The reset link has been used and can&apos;t be used again.</p>
        </div>
        <DemoNotice>Simulated reset. No password was saved. Sign in with the published demo credentials.</DemoNotice>
        <Button asChild className="h-10 w-full">
          <Link href="/login?reason=reset_complete" prefetch={false}>
            <LogIn aria-hidden />
            Continue to sign in
          </Link>
        </Button>
      </div>
    );
  }
  if (query.error) return <ErrorState title="The reset link could not be checked" description={query.error} />;
  if (!query.data || !services) return <LoadingState label="Checking your reset link" />;

  const check = query.data;
  if (check.state === 'invalid') return <InvalidTokenState purpose="reset" />;
  if (check.state === 'expired') return <ExpiredTokenState purpose="reset" email={check.email} />;
  if (check.state === 'used') return <UsedTokenState purpose="reset" email={check.email} />;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">
          For <span className="font-medium text-foreground">{check.invitation.email}</span>.
        </p>
      </div>
      <SetPasswordForm
        email={check.invitation.email}
        submitLabel="Reset password"
        onValid={async () => {
          try {
            await services.onboarding.completePasswordReset(token);
          } catch (error) {
            throw new Error(describeError(error));
          }
          setDone(true);
        }}
      />
      <DemoNotice>
        Simulated reset. The new password is checked against the policy in your browser and then discarded; it is not
        sent or stored.
      </DemoNotice>
    </div>
  );
}
