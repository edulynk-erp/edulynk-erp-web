import type { Metadata } from 'next';
import { AuthLayout } from '@/components/layout/auth-layout';
import { ForgotPasswordFlow } from '@/features/onboarding/forgot-password-flow';
import { getBranding } from '@/server/branding';
import { requireDemoMode } from '@/server/demo-mode';

export const metadata: Metadata = { title: 'Forgot password' };

export default async function ForgotPasswordPage() {
  requireDemoMode();
  const branding = await getBranding();
  return (
    <AuthLayout brandName={branding.displayName}>
      <div className="w-full max-w-md">
        <ForgotPasswordFlow />
      </div>
    </AuthLayout>
  );
}
