import { API_PREFIX, toBffPath } from '@/lib/api/api-path';
import { executeRequest, type ApiResponse, type RequestOptions, type Transport } from '@/lib/api/request';

const BFF_TIMEOUT_MS = 15000;

const bffTransport: Transport = {
  allowedPrefix: API_PREFIX,
  resolveUrl: toBffPath,
  defaultTimeoutMs: BFF_TIMEOUT_MS,
};

/**
 * Browser-side client. Calls the same-origin BFF (`/bff/...`), which attaches the session's access token server-side;
 * no token is ever available to browser code. Only tenant `/api/v1/...` contract paths are accepted; platform
 * administration paths are refused.
 */
export function bffRequest<T>(options: RequestOptions<T>): Promise<ApiResponse<T>> {
  return executeRequest(bffTransport, options);
}
