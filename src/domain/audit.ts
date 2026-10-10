import type { ModuleId } from '@/config/modules';
import type { IsoDateTime, TenantScoped } from '@/domain/common';

export interface AuditEvent extends TenantScoped {
  readonly id: string;
  readonly at: IsoDateTime;
  readonly actorId: string | null;
  readonly actorName: string;
  readonly module: ModuleId;
  readonly action: string;
  readonly summary: string;
  /** Record the event concerns, e.g. a user ID. */
  readonly subjectId: string | null;
}
