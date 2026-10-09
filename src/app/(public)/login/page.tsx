import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginPanel } from '@/features/auth/login-panel';
import { loginNotice } from '@/features/auth/login-messages';
import { safeRedirectPath } from '@/lib/utils/safe-redirect';
import { getIdentityAdapter } from '@/server/auth/adapter';
import { getServerSession } from '@/server/auth/guards';
import { getBranding } from '@/server/branding';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const params = await searchParams;
  const next = safeRedirectPath(first(params.next));
  if (await getServerSession()) redirect(next);

  const step = await getIdentityAdapter().beginSignIn();
  const notice = loginNotice(first(params.reason), first(params.error));
  const branding = await getBranding();

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted p-6">
      <LoginPanel brandName={branding.displayName} step={step} notice={notice} />
    </main>
  );
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
