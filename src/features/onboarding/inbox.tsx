'use client';

import { ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/states';
import { Badge } from '@/components/ui/badge';
import { DemoNotice } from '@/features/onboarding/demo-notice';
import { EmailPreview } from '@/features/onboarding/email-preview';
import type { SimulatedEmail } from '@/domain/onboarding';
import { formatRelative } from '@/lib/format/date';
import { useServiceQuery } from '@/services/provider';

const KIND_LABELS: Record<SimulatedEmail['kind'], string> = {
  'owner-setup': 'Owner setup',
  'user-invite': 'Invitation',
  'password-reset': 'Password reset',
};

function InboxFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Simulated email inbox</h1>
          <p className="text-sm text-muted-foreground">
            Emails the ERP would send. They are generated in this browser and never delivered.
          </p>
        </div>
        <Link
          href="/login"
          prefetch={false}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Sign in
        </Link>
      </div>
      <DemoNotice>
        Demo only. No email has been sent to anyone; the addresses belong to a fictional institution.
      </DemoNotice>
      {children}
    </div>
  );
}

export function InboxList() {
  const query = useServiceQuery((s) => s.inbox.list(), []);
  return (
    <InboxFrame>
      {query.error ? (
        <ErrorState title="The inbox could not be loaded" description={query.error} />
      ) : !query.data ? (
        <LoadingState label="Loading simulated emails" rows={5} />
      ) : query.data.length === 0 ? (
        <EmptyState title="No simulated emails" description="Invitations and reset emails appear here." />
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {query.data.map((email) => (
            <li key={email.id}>
              <Link
                href={`/demo/inbox/${encodeURIComponent(email.id)}`}
                prefetch={false}
                className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">{email.subject}</span>
                    <Badge
                      variant={
                        email.kind === 'password-reset' ? 'warning' : email.kind === 'owner-setup' ? 'default' : 'info'
                      }
                    >
                      {KIND_LABELS[email.kind]}
                    </Badge>
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    To {email.toName} &lt;{email.to}&gt;
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(email.sentAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </InboxFrame>
  );
}

export function InboxMessage({ id }: { id: string }) {
  const query = useServiceQuery(
    async (s) => {
      const [email, institution] = await Promise.all([s.inbox.get(id), s.onboarding.getPublicInstitution()]);
      return { email, institution };
    },
    [id],
  );
  return (
    <InboxFrame>
      <Link
        href="/demo/inbox"
        prefetch={false}
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All simulated emails
      </Link>
      {query.error ? (
        <ErrorState title="This email could not be opened" description={query.error} />
      ) : !query.data ? (
        <LoadingState label="Loading email" rows={6} />
      ) : (
        <EmailPreview
          email={query.data.email}
          institutionName={query.data.institution.name}
          supportEmail={query.data.institution.supportEmail}
        />
      )}
    </InboxFrame>
  );
}
