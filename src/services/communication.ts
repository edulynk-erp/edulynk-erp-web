import type { AuditEvent } from '@/domain/audit';
import type { CalendarEvent, Notification } from '@/domain/communication';
import type { WorkspaceContext } from '@/domain/common';
import type { ListQuery, Page } from '@/lib/query/list';

export interface NotificationService {
  list(): Promise<readonly Notification[]>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
}

export interface CalendarService {
  upcoming(context: WorkspaceContext, limit: number): Promise<readonly CalendarEvent[]>;
}

export interface AuditFilters extends Record<string, string | undefined> {
  module?: string;
  actorId?: string;
}

export interface AuditService {
  list(query: ListQuery<AuditFilters>): Promise<Page<AuditEvent>>;
}
