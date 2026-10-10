import type { DemoStore } from '@/demo/store/store';
import type { AuditEvent } from '@/domain/audit';
import { DEMO_TENANT_ID } from '@/demo/access/accounts';
import { getModule, type ModuleId, type PermissionAction } from '@/config/modules';
import { hasGrant, inCampusScope } from '@/lib/access/grants';
import { ServiceError } from '@/services/errors';
import type { Actor } from '@/services/types';

export interface MockContext {
  readonly store: DemoStore;
  readonly now: () => Date;
  readonly actor: () => Actor | null;
  /** Simulated latency for writes, so pending states are visible. Zero in tests. */
  readonly writeDelayMs: number;
}

export function randomId(prefix: string, length = 16): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return `${prefix}_${Array.from(bytes, (byte) => (byte % 36).toString(36)).join('')}`;
}

export async function simulateWrite(context: MockContext): Promise<void> {
  if (context.writeDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, context.writeDelayMs));
}

/** Returns a structured clone so callers can never mutate store state by accident. */
export function copy<T>(value: T): T {
  return structuredClone(value);
}

/**
 * Rejects the call unless the acting principal holds `module:action`. Fails closed when nobody is signed in. This is
 * the mock counterpart of the check the institution API makes against the verified identity.
 */
export function authorize(context: MockContext, module: ModuleId, action: PermissionAction): Actor {
  const actor = context.actor();
  if (!actor || !hasGrant(actor.grants, module, action)) {
    throw new ServiceError(
      'FORBIDDEN',
      `You don't have permission to ${action} ${getModule(module).label}. Ask an institution administrator for access.`,
    );
  }
  return actor;
}

/**
 * Rejects reads of a campus (or of every campus, `'all'`) outside the acting principal's campus scope. Fails closed
 * when nobody is signed in.
 */
export function authorizeCampus(context: MockContext, campusId: string | 'all'): void {
  const actor = context.actor();
  if (!actor || !inCampusScope(actor.campusScope, campusId)) {
    throw new ServiceError('FORBIDDEN', "You don't have access to that campus. Choose one of your campuses.");
  }
}

export function recordAudit(
  context: MockContext,
  event: Pick<AuditEvent, 'module' | 'action' | 'summary' | 'subjectId'>,
  actorOverride?: Pick<Actor, 'id' | 'name'>,
): void {
  const actor = actorOverride ?? context.actor();
  context.store.update('audit', (events) => [
    {
      tenantId: DEMO_TENANT_ID,
      id: randomId('aud'),
      at: context.now().toISOString(),
      actorId: actor?.id ?? null,
      actorName: actor?.name ?? 'System',
      ...event,
    },
    ...events,
  ]);
}
