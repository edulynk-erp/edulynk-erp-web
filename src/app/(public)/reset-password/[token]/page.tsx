import type { Metadata } from 'next';
import { AuthLayout } from '@/components/layout/auth-layout';
import { ResetFlow } from '@/features/onboarding/reset-flow';
import { getBranding } from '@/server/branding';
import { requireDemoMode } from '@/server/demo-mode';

export const metadata: Metadata = { title: 'Reset password', referrer: 'no-referrer' };

export default async function ResetPasswordPage({ params }: PageProps<'/reset-password/[token]'>) {
  requireDemoMode();
  const [{ token }, branding] = await Promise.all([params, getBranding()]);
  return (
    <AuthLayout brandName={branding.displayName}>
      <div className="w-full max-w-md">
        <ResetFlow token={token} />
      </div>
    </AuthLayout>
  );
}
