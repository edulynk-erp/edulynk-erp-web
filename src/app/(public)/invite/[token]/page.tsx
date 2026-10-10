import type { Metadata } from 'next';
import { AuthLayout } from '@/components/layout/auth-layout';
import { InviteFlow } from '@/features/onboarding/invite-flow';
import { getBranding } from '@/server/branding';
import { requireDemoMode } from '@/server/demo-mode';

export const metadata: Metadata = { title: 'Set up your account', referrer: 'no-referrer' };

export default async function InvitePage({ params }: PageProps<'/invite/[token]'>) {
  requireDemoMode();
  const [{ token }, branding] = await Promise.all([params, getBranding()]);
  return (
    <AuthLayout brandName={branding.displayName}>
      <div className="w-full max-w-md">
        <InviteFlow token={token} />
      </div>
    </AuthLayout>
  );
}
