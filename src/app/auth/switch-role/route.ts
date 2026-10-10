import { getIdentityAdapter } from '@/server/auth/adapter';
import { getServerSession } from '@/server/auth/guards';
import { setSessionCookie } from '@/server/auth/issue-session';
import { isSameOriginRequest, seeOther } from '@/server/http/same-origin';

export const dynamic = 'force-dynamic';

/**
 * Demo role switcher (form POST). Requires a current session and the demo adapter; signs in as the demo account that
 * holds the chosen role. Never available with a real identity provider.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request.headers)) return seeOther('/dashboard');
  const adapter = getIdentityAdapter();
  if (adapter.id !== 'demo') return seeOther('/dashboard');
  if (!(await getServerSession())) return seeOther('/login');

  let roleId: FormDataEntryValue | null;
  try {
    roleId = (await request.formData()).get('roleId');
  } catch {
    return seeOther('/dashboard');
  }
  if (typeof roleId !== 'string' || !/^[a-z-]{2,40}$/.test(roleId)) return seeOther('/dashboard');

  try {
    const tokens = await adapter.completeSignIn({ kind: 'demo-role', roleId });
    return await setSessionCookie(seeOther('/dashboard?switched=1'), tokens);
  } catch {
    return seeOther('/dashboard');
  }
}
