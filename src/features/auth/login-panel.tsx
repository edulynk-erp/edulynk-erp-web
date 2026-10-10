import { Button } from '@/components/ui/button';
import { DemoSignInForm } from '@/features/auth/demo-sign-in-form';
import type { LoginNotice } from '@/features/auth/login-messages';
import type { SignInStep } from '@/server/auth/types';
import { cn } from '@/lib/utils/cn';
import { safeHref } from '@/lib/utils/safe-url';

interface LoginPanelProps {
  brandName: string;
  step: SignInStep;
  notice?: LoginNotice | undefined;
  next?: string;
}

export function LoginPanel({ brandName, step, notice, next = '/dashboard' }: LoginPanelProps) {
  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your {brandName} account</p>
      </div>
      {notice ? (
        <p
          role={notice.tone === 'error' ? 'alert' : 'status'}
          className={cn(
            'rounded-md border px-3 py-2 text-sm',
            notice.tone === 'error' ? 'border-destructive/40 bg-destructive/5 text-destructive' : 'bg-muted',
          )}
        >
          {notice.message}
        </p>
      ) : null}
      <SignInBody step={step} next={next} />
    </div>
  );
}

function SignInBody({ step, next }: { step: SignInStep; next: string }) {
  switch (step.kind) {
    case 'unavailable':
      return (
        <p className="text-sm text-muted-foreground">
          Sign-in is not configured for this environment. The identity integration has not been connected yet.
        </p>
      );
    case 'redirect': {
      const href = safeHref(step.url);
      if (!href) return <p className="text-sm text-destructive">Sign-in is misconfigured.</p>;
      return (
        <Button asChild className="w-full">
          <a href={href}>Continue to sign in</a>
        </Button>
      );
    }
    case 'demo-credentials':
      return <DemoSignInForm password={step.password} accounts={step.accounts} next={next} />;
  }
}
