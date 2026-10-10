import { safeRedirectPath } from '@/lib/utils/safe-redirect';
import { getIdentityAdapter } from '@/server/auth/adapter';
import { setSessionCookie } from '@/server/auth/issue-session';
import { IdentityError } from '@/server/auth/types';
import { isSameOriginRequest, seeOther } from '@/server/http/same-origin';

export const dynamic = 'force-dynamic';

const MAX_FIELD_LENGTH = 256;

/**
 * Demo credential sign-in (form POST). Only the demo adapter accepts credentials; every other adapter rejects. The
 * password is compared by the adapter and never logged, echoed or stored.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request.headers)) return seeOther('/login?error=request');

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return seeOther('/login?error=request');
  }
  const email = form.get('email');
  const password = form.get('password');
  const next = safeRedirectPath(form.get('next'));
  const back = (error: string) =>
    seeOther(`/login?error=${error}${next === '/dashboard' ? '' : `&next=${encodeURIComponent(next)}`}`);

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    email.length === 0 ||
    password.length === 0 ||
    email.length > MAX_FIELD_LENGTH ||
    password.length > MAX_FIELD_LENGTH
  ) {
    return back('credentials');
  }

  const adapter = getIdentityAdapter();
  if (adapter.id !== 'demo') return back('unavailable');

  try {
    const tokens = await adapter.completeSignIn({ kind: 'demo-credentials', email, password });
    return await setSessionCookie(seeOther(next), tokens);
  } catch (error) {
    return back(error instanceof IdentityError && error.code === 'SIGN_IN_REJECTED' ? 'credentials' : 'session');
  }
}
