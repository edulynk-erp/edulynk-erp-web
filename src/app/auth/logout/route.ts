import { cookies } from 'next/headers';
import { getIdentityAdapter } from '@/server/auth/adapter';
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from '@/server/auth/cookies';
import { unsealSession } from '@/server/auth/session';
import { getSessionKey } from '@/server/auth/session-key';
import { isSameOriginRequest, seeOther } from '@/server/http/same-origin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request.headers)) return seeOther('/dashboard');

  const payload = await unsealSession((await cookies()).get(SESSION_COOKIE)?.value, getSessionKey());
  if (payload) {
    try {
      await getIdentityAdapter().revoke({ accessToken: payload.at, refreshToken: payload.rt });
    } catch {
      // Revocation is best effort; the cookie is cleared regardless.
    }
  }

  const response = seeOther('/login?reason=signed_out');
  response.cookies.set(SESSION_COOKIE, '', { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}
