import 'server-only';
import { ApiError } from '@/lib/api/api-error';
import { API_PREFIX, assertTenantApiPath } from '@/lib/api/api-path';
import { executeRequest, type ApiResponse, type RequestOptions } from '@/lib/api/request';
import { createRequestId } from '@/lib/api/request-id';
import { getServerEnv } from '@/server/env';

export const UPSTREAM_NOT_CONFIGURED = 'UPSTREAM_NOT_CONFIGURED';

/**
 * Server-side client for Server Components and route handlers. The upstream base URL stays on the server. When
 * TENANT_API_BASE_URL is unset it fails with a 503 ApiError instead of pretending to return data.
 */
export async function tenantApiRequest<T>(
  accessToken: string,
  options: RequestOptions<T>,
  fetchImpl?: typeof fetch,
): Promise<ApiResponse<T>> {
  const env = getServerEnv();
  const baseUrl = env.TENANT_API_BASE_URL;
  if (!baseUrl) {
    throw new ApiError({
      kind: 'http',
      status: 503,
      code: UPSTREAM_NOT_CONFIGURED,
      message: 'The institution API is not configured for this environment.',
      requestId: options.requestId ?? createRequestId(),
    });
  }
  return executeRequest(
    {
      allowedPrefix: API_PREFIX,
      resolveUrl: (path) => `${baseUrl}${assertTenantApiPath(path)}`,
      defaultTimeoutMs: env.API_TIMEOUT_MS,
      headers: () => ({ Authorization: `Bearer ${accessToken}` }),
      ...(fetchImpl ? { fetch: fetchImpl } : {}),
    },
    options,
  );
}
