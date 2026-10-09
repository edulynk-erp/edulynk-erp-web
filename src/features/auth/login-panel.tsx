import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import type { LoginNotice } from '@/features/auth/login-messages';
import type { SignInStep } from '@/server/auth/types';
import { cn } from '@/lib/utils/cn';
import { safeHref } from '@/lib/utils/safe-url';

interface LoginPanelProps {
  brandName: string;
  step: SignInStep;
  notice?: LoginNotice | undefined;
}

export function LoginPanel({ brandName, step, notice }: LoginPanelProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <h1 className="text-lg font-semibold">{brandName}</h1>
        <CardDescription>Institution sign-in</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {notice ? (
          <p
            role={notice.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'rounded-md border px-3 py-2 text-sm',
              notice.tone === 'error' ? 'border-destructive/40 text-destructive' : 'bg-muted',
            )}
          >
            {notice.message}
          </p>
        ) : null}
        <SignInBody step={step} />
      </CardContent>
    </Card>
  );
}

function SignInBody({ step }: { step: SignInStep }) {
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
  }
}
