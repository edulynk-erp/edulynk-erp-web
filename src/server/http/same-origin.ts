import 'server-only';
import { NextResponse } from 'next/server';

/**
 * CSRF defence for state-changing route handlers (they are not covered by Server Actions' built-in origin check).
 * Requires an Origin header whose host matches the request Host. Combined with the SameSite=Lax session cookie.
 */
export function isSameOriginRequest(headers: Headers): boolean {
  const origin = headers.get('origin');
  const host = headers.get('host');
  if (!origin || !host || origin === 'null') return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** 303 with a relative Location, so redirects never depend on the (possibly internal) bind address. */
export function seeOther(location: string): NextResponse {
  return new NextResponse(null, { status: 303, headers: { Location: location, 'Cache-Control': 'no-store' } });
}
