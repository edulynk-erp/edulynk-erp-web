import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type { SimulatedEmail } from '@/domain/onboarding';
import { formatDateTime } from '@/lib/format/date';

interface EmailPreviewProps {
  email: SimulatedEmail;
  institutionName: string;
  supportEmail: string;
}

export function emailActionHref(email: SimulatedEmail): string {
  const token = encodeURIComponent(email.token);
  return email.kind === 'password-reset' ? `/reset-password/${token}` : `/invite/${token}`;
}

/** Renders a simulated email the way a recipient would see it. Nothing here was ever sent. */
export function EmailPreview({ email, institutionName, supportEmail }: EmailPreviewProps) {
  const isReset = email.kind === 'password-reset';
  const isOwner = email.kind === 'owner-setup';
  const firstName = email.toName.split(' ')[0] ?? email.toName;

  return (
    <article aria-labelledby="email-subject" className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <header className="space-y-1 border-b bg-muted/50 px-6 py-4 text-sm">
        <h2 id="email-subject" className="text-base font-semibold">
          {email.subject}
        </h2>
        <dl className="grid grid-cols-[4rem_1fr] gap-x-2 text-muted-foreground">
          <dt>From</dt>
          <dd>Edulynk ERP &lt;no-reply@edulynk.example&gt;</dd>
          <dt>To</dt>
          <dd>
            {email.toName} &lt;{email.to}&gt;
          </dd>
          <dt>Sent</dt>
          <dd>{formatDateTime(email.sentAt)}</dd>
        </dl>
      </header>
      <div className="space-y-5 px-6 py-6 text-sm leading-relaxed">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex size-8 items-center justify-center rounded-lg bg-primary font-bold text-white"
          >
            E
          </span>
          <span className="font-semibold">Edulynk ERP</span>
        </div>
        <p>Hello {firstName},</p>
        {isReset ? (
          <p>
            We received a request to reset the password for your {institutionName} account. Use the button below to
            choose a new password.
          </p>
        ) : isOwner ? (
          <p>
            <span className="font-medium">{institutionName}</span> has been onboarded to Edulynk ERP and you have been
            set up as its owner. Create your password to start managing your institution.
          </p>
        ) : (
          <p>
            {email.invitedBy ?? 'Your administrator'} has invited you to join{' '}
            <span className="font-medium">{institutionName}</span> on Edulynk ERP
            {email.roleName ? (
              <>
                {' '}
                as <span className="font-medium">{email.roleName}</span>
              </>
            ) : null}
            .
          </p>
        )}
        <dl className="grid gap-2 rounded-lg border bg-muted/40 p-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Institution</dt>
            <dd className="font-medium">{institutionName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Account email</dt>
            <dd className="font-medium break-all">{email.to}</dd>
          </div>
          {email.roleName && !isReset ? (
            <div>
              <dt className="text-xs text-muted-foreground">Role</dt>
              <dd className="font-medium">{email.roleName}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs text-muted-foreground">Link expires</dt>
            <dd className="font-medium">{formatDateTime(email.expiresAt)}</dd>
          </div>
        </dl>
        <p>
          <Link
            href={emailActionHref(email)}
            prefetch={false}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {isReset ? 'Reset password' : 'Set up your account'}
          </Link>
        </p>
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          This link works once and expires {isReset ? 'in 30 minutes' : 'in 7 days'}. If you weren&apos;t expecting this
          email, you can ignore it. Questions? Contact {supportEmail}.
        </p>
      </div>
    </article>
  );
}
