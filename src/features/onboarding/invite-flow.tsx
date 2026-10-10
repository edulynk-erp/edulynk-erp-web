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

export function InviteFlow({ token }: { token: string }) {
  const services = useServices();
  const [completed, setCompleted] = useState<{ name: string; email: string } | null>(null);
  const query = useServiceQuery(
    async (s) => {
      const [check, institution] = await Promise.all([
        s.onboarding.checkInvitation(token),
        s.onboarding.getPublicInstitution(),
      ]);
      return { check, institution };
    },
    [token],
  );

  if (completed) return <AccountCreated name={completed.name} email={completed.email} />;
  if (query.error) return <ErrorState title="The invitation could not be checked" description={query.error} />;
  if (!query.data || !services) return <LoadingState label="Checking your invitation" />;

  const { check, institution } = query.data;
  if (check.state === 'invalid') return <InvalidTokenState purpose="setup" />;
  if (check.state === 'expired') return <ExpiredTokenState purpose="setup" email={check.email} />;
  if (check.state === 'used') return <UsedTokenState purpose="setup" email={check.email} />;

  const { invitation, recipientName } = check;
  const isOwner = invitation.kind === 'owner-setup';

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm font-medium text-primary">{institution.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isOwner ? 'Set up your owner account' : 'Set up your account'}
        </h1>
        <p className="text-sm text-muted-foreground">
          Welcome, {recipientName}. Choose a password for{' '}
          <span className="font-medium text-foreground">{invitation.email}</span>.
        </p>
      </div>
      <SetPasswordForm
        email={invitation.email}
        submitLabel="Create account"
        onValid={async () => {
          try {
            await services.onboarding.acceptInvitation(token);
          } catch (error) {
            throw new Error(describeError(error));
          }
          setCompleted({ name: recipientName, email: invitation.email });
        }}
      />
      <DemoNotice>
        Simulated onboarding. The password you choose is checked against the policy in your browser and then discarded:
        it is not sent or stored, and no real account is created. Sign in afterwards with the published demo
        credentials.
      </DemoNotice>
    </div>
  );
}

function AccountCreated({ name, email }: { name: string; email: string }) {
  return (
    <div className="space-y-6 text-center" role="status">
      <span
        className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/15 text-success"
        aria-hidden
      >
        <CheckCircle2 className="size-8" />
      </span>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Account setup complete</h1>
        <p className="text-sm text-muted-foreground">
          {name}, the demo account for <span className="font-medium text-foreground">{email}</span> is now marked
          active.
        </p>
      </div>
      <DemoNotice>
        This completed a simulated setup only. No password was saved and no real account exists. Use the demo
        credentials shown on the sign-in page.
      </DemoNotice>
      <Button asChild className="h-10 w-full">
        <Link href="/login?reason=setup_complete" prefetch={false}>
          <LogIn aria-hidden />
          Continue to sign in
        </Link>
      </Button>
    </div>
  );
}
