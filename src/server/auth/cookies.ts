import 'server-only';

/**
 * `__Host-` requires Secure, Path=/ and no Domain, binding the cookie to this exact origin, so an institution session
 * is never shared with the Business Portal (platform realm, `__Host-edl_bp_session`). Browsers accept Secure cookies on
 * http://localhost, so local development keeps the same attributes as production. No Max-Age: the cookie ends with the
 * browser session until identity-service lifetime semantics are defined.
 */
export const SESSION_COOKIE = '__Host-edl_erp_session';

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
} as const;
