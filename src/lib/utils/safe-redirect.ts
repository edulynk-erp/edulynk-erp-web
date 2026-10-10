const DEFAULT_DESTINATION = '/dashboard';
const DISALLOWED_PREFIXES = [
  '/login',
  '/auth/',
  '/bff/',
  '/healthz',
  '/invite',
  '/forgot-password',
  '/reset-password',
  '/demo/',
];

/**
 * Accepts only same-origin, root-relative paths for post-login redirects. Rejects absolute and protocol-relative URLs,
 * backslash tricks, control characters and auth endpoints (to avoid loops).
 */
export function safeRedirectPath(candidate: unknown, fallback: string = DEFAULT_DESTINATION): string {
  if (typeof candidate !== 'string' || candidate.length === 0 || candidate.length > 512) return fallback;
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(candidate)) return fallback;
  let parsed: URL;
  try {
    parsed = new URL(candidate, 'http://portal.invalid');
  } catch {
    return fallback;
  }
  if (parsed.origin !== 'http://portal.invalid') return fallback;
  if (DISALLOWED_PREFIXES.some((prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(prefix))) {
    return fallback;
  }
  return `${parsed.pathname}${parsed.search}`;
}
