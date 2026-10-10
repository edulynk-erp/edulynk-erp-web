import { Clock, Link2Off, MailCheck } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type Purpose = 'setup' | 'reset';

function StateCard({
  icon,
  title,
  children,
  actions,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="space-y-5 text-center" role="status">
      <span
        className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
        aria-hidden
      >
        {icon}
      </span>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">{title}</h1>
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
      <div className="flex flex-col gap-2">{actions}</div>
    </div>
  );
}

export function InvalidTokenState({ purpose }: { purpose: Purpose }) {
  return (
    <StateCard
      icon={<Link2Off className="size-6" />}
      title="This link is not valid"
      actions={
        <>
          {purpose === 'reset' ? (
            <Button asChild>
              <Link href="/forgot-password" prefetch={false}>
                Request a new reset link
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/login" prefetch={false}>
              Go to sign in
            </Link>
          </Button>
        </>
      }
    >
      {purpose === 'setup'
        ? 'The invitation link is incomplete, was replaced by a newer invitation, or was revoked. Ask your institution administrator to send a new invitation.'
        : 'The reset link is incomplete or was replaced by a newer one.'}
    </StateCard>
  );
}

export function ExpiredTokenState({ purpose, email }: { purpose: Purpose; email: string }) {
  return (
    <StateCard
      icon={<Clock className="size-6" />}
      title={purpose === 'setup' ? 'This invitation has expired' : 'This reset link has expired'}
      actions={
        purpose === 'reset' ? (
          <Button asChild>
            <Link href="/forgot-password" prefetch={false}>
              Request a new reset link
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href="/login" prefetch={false}>
              Go to sign in
            </Link>
          </Button>
        )
      }
    >
      {purpose === 'setup' ? (
        <>
          Invitations expire after 7 days. Ask your institution administrator to resend the invitation to{' '}
          <span className="font-medium text-foreground">{email}</span>.
        </>
      ) : (
        <>Reset links expire after 30 minutes for your security.</>
      )}
    </StateCard>
  );
}

export function UsedTokenState({ purpose, email }: { purpose: Purpose; email: string }) {
  return (
    <StateCard
      icon={<MailCheck className="size-6" />}
      title={purpose === 'setup' ? 'This invitation was already used' : 'This reset link was already used'}
      actions={
        <Button asChild>
          <Link href="/login" prefetch={false}>
            Go to sign in
          </Link>
        </Button>
      }
    >
      The account for <span className="font-medium text-foreground">{email}</span> has already been set up with this
      link. Each link works once. If you did not do this, contact your institution administrator.
    </StateCard>
  );
}
