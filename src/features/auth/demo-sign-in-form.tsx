'use client';

import { ChevronDown, Eye, EyeOff, Info, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input, Label, Select } from '@/components/ui/input';
import type { DemoAccountSummary } from '@/server/auth/types';

interface DemoSignInFormProps {
  /** The published demo password, provided by the server-side demo adapter. */
  password: string;
  accounts: readonly DemoAccountSummary[];
  next: string;
}

const SUPPORT_EMAIL = 'support@edulynk.com';

/**
 * DEMO ONLY. Posts to /auth/sign-in, where the server-side demo adapter checks the credentials and seals the session
 * cookie. Nothing is stored in the browser.
 */
export function DemoSignInForm({ password, accounts, next }: DemoSignInFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ssoNotice, setSsoNotice] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [filled, setFilled] = useState(false);
  const checkFilled = () => setFilled(Boolean(emailRef.current?.value.trim()) && Boolean(passwordRef.current?.value));
  const emailId = useId();
  const passwordId = useId();
  const rememberId = useId();
  const pickerId = useId();

  return (
    <div className="space-y-6">
      <form
        method="post"
        action="/auth/sign-in"
        className="space-y-5"
        onInput={checkFilled}
        onFocus={checkFilled}
        onPointerOver={checkFilled}
        onSubmit={() => setSubmitting(true)}
      >
        <input type="hidden" name="next" value={next} />
        <div className="space-y-2">
          <Label htmlFor={emailId}>Email / Mobile Number</Label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              ref={emailRef}
              id={emailId}
              name="email"
              type="text"
              inputMode="email"
              autoComplete="username"
              required
              placeholder="you@school.edu.in"
              className="h-11 pl-10"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={passwordId}>Password</Label>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              ref={passwordRef}
              id={passwordId}
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              className="h-11 pr-11 pl-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute top-0 right-0 flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-controls={passwordId}
            >
              {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox id={rememberId} name="remember" defaultChecked />
            <Label htmlFor={rememberId} className="font-normal">
              Remember me
            </Label>
          </div>
          <Link href="/forgot-password" prefetch={false} className="text-sm font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="h-11 w-full text-base" loading={submitting} disabled={!filled}>
          {submitting ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="h-px flex-1 bg-border" aria-hidden />
        Or continue with
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={() => setSsoNotice('Google sign-in is not available in this demo.')}
        >
          <GoogleIcon />
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={() => setSsoNotice('Microsoft sign-in is not available in this demo.')}
        >
          <MicrosoftIcon />
          Microsoft
        </Button>
      </div>
      {ssoNotice ? (
        <p role="status" className="text-center text-sm text-muted-foreground">
          {ssoNotice}
        </p>
      ) : null}

      <p className="text-center text-sm text-muted-foreground">
        Need help?{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-primary hover:underline">
          Contact Support
        </a>
      </p>

      <details className="group rounded-lg border border-warning/40 bg-warning/10 text-sm">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-warning-foreground [&::-webkit-details-marker]:hidden">
          <h2 className="flex items-center gap-2 font-semibold">
            <Info className="size-4" aria-hidden />
            Demo sign-in (simulated)
          </h2>
          <ChevronDown className="ml-auto size-4 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-3 px-4 pb-4">
          <p className="text-foreground/80">
            This is a demonstration with simulated accounts. Every demo account uses the password{' '}
            <code className="rounded bg-card px-1.5 py-0.5 font-mono text-xs">{password}</code>. No real account or
            password exists, and passwords chosen during the demo onboarding flow are not stored.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor={pickerId}>Fill in a demo account</Label>
            <Select
              id={pickerId}
              defaultValue=""
              onChange={(event) => {
                if (!event.target.value) return;
                if (emailRef.current) emailRef.current.value = event.target.value;
                if (passwordRef.current) passwordRef.current.value = password;
                checkFilled();
                passwordRef.current?.focus();
              }}
            >
              <option value="">Choose a role…</option>
              {accounts.map((account) => (
                <option key={account.email} value={account.email}>
                  {account.roleName} · {account.displayName}
                </option>
              ))}
            </Select>
          </div>
          <p>
            <Link href="/demo/inbox" prefetch={false} className="font-medium text-primary hover:underline">
              Open the simulated email inbox
            </Link>{' '}
            to try the owner onboarding invitation.
          </p>
        </div>
      </details>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.11A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.29A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.57.38-2.29V6.6H1.28a12 12 0 0 0 0 10.8l4.01-3.11z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.28 6.6l4.01 3.11C6.23 6.88 8.88 4.77 12 4.77z"
      />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#F25022" d="M1 1h10.5v10.5H1z" />
      <path fill="#7FBA00" d="M12.5 1H23v10.5H12.5z" />
      <path fill="#00A4EF" d="M1 12.5h10.5V23H1z" />
      <path fill="#FFB900" d="M12.5 12.5H23V23H12.5z" />
    </svg>
  );
}
