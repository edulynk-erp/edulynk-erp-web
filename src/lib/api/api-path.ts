export const API_PREFIX = '/api/v1/';
/** Platform administration belongs to the control plane; the institution app never reaches these paths. */
export const PLATFORM_API_PREFIX = '/api/v1/platform/';

export class UnsafeApiPathError extends Error {
  constructor(reason: string) {
    super(`Unsafe API path: ${reason}`);
    this.name = 'UnsafeApiPathError';
  }
}

const SEGMENT_PATTERN = /^[A-Za-z0-9._~-]+$/;

/**
 * Validates a relative API path. Only `/api/v1/...` paths made of plain URL-safe segments are accepted: no absolute or
 * protocol-relative URLs, no query strings (use `query`), no dot segments, no encoded separators.
 */
export function assertApiPath(path: string, prefix: string = API_PREFIX): string {
  if (!path.startsWith(prefix)) throw new UnsafeApiPathError(`must start with ${prefix}`);
  const segments = path.slice(1).split('/');
  for (const segment of segments) {
    if (segment === '' || segment === '.' || segment === '..') throw new UnsafeApiPathError('invalid segment');
    if (!SEGMENT_PATTERN.test(segment)) throw new UnsafeApiPathError('segment contains disallowed characters');
  }
  return path;
}

/** A tenant (institution) API path: any `/api/v1/...` path except platform administration. */
export function assertTenantApiPath(path: string): string {
  assertApiPath(path, API_PREFIX);
  if (`${path}/`.startsWith(PLATFORM_API_PREFIX)) {
    throw new UnsafeApiPathError('platform administration paths are not reachable from the institution app');
  }
  return path;
}

/** Builds a path from trusted literals and untrusted identifiers; identifiers are percent-encoded per segment. */
export function apiPath(strings: TemplateStringsArray, ...values: Array<string | number>): string {
  let result = strings[0] ?? '';
  values.forEach((value, index) => {
    const raw = String(value);
    if (raw === '' || raw === '.' || raw === '..') throw new UnsafeApiPathError('invalid identifier');
    result += encodeURIComponent(raw) + (strings[index + 1] ?? '');
  });
  return result;
}

/** Maps a tenant API path to the same-origin BFF path the browser calls. */
export function toBffPath(tenantPath: string): string {
  assertTenantApiPath(tenantPath);
  return `/bff/${tenantPath.slice(API_PREFIX.length)}`;
}
