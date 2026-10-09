export const dynamic = 'force-dynamic';

/** Liveness only. Reveals no configuration, versions or upstream status. */
export function GET(): Response {
  return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
}
