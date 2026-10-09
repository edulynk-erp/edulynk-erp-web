import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/server/auth/cookies';
import { isAccessTokenExpired, unsealSession } from '@/server/auth/session';
import { getSessionKey } from '@/server/auth/session-key';
import { forwardToTenantApi } from '@/server/bff/forward';
import { getServerEnv } from '@/server/env';

export const dynamic = 'force-dynamic';

async function handle(request: Request, context: RouteContext<'/bff/[...path]'>): Promise<Response> {
  const { path } = await context.params;
  const env = getServerEnv();
  const session = await unsealSession((await cookies()).get(SESSION_COOKIE)?.value, getSessionKey());
  return forwardToTenantApi({
    request,
    segments: path,
    accessToken: session && !isAccessTokenExpired(session) ? session.at : null,
    upstreamBaseUrl: env.TENANT_API_BASE_URL,
    timeoutMs: env.API_TIMEOUT_MS,
  });
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
