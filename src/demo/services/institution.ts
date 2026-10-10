import { authorizeCampus, copy, type MockContext } from '@/demo/services/context';
import { runListQuery } from '@/lib/query/list';
import { todayIso } from '@/lib/format/date';
import type { AuditService, CalendarService, NotificationService } from '@/services/communication';

export function createNotificationService(context: MockContext): NotificationService {
  return {
    async list() {
      return copy([...context.store.data.notifications].sort((a, b) => b.at.localeCompare(a.at)));
    },
    async markRead(id) {
      context.store.update('notifications', (items) =>
        items.map((item) => (item.id === id ? { ...item, read: true } : item)),
      );
    },
    async markAllRead() {
      context.store.update('notifications', (items) => items.map((item) => ({ ...item, read: true })));
    },
  };
}

export function createCalendarService(context: MockContext): CalendarService {
  return {
    async upcoming(workspace, limit) {
      authorizeCampus(context, workspace.campusId);
      const today = todayIso(context.now());
      return copy(
        context.store.data.events
          .filter((event) => event.endsOn >= today)
          .filter(
            (event) =>
              workspace.campusId === 'all' || event.campusId === 'all' || event.campusId === workspace.campusId,
          )
          .sort((a, b) => a.startsOn.localeCompare(b.startsOn))
          .slice(0, limit),
      );
    },
  };
}

export function createAuditService(context: MockContext): AuditService {
  return {
    async list(query) {
      return copy(
        runListQuery(context.store.data.audit, query, {
          searchText: (event) => `${event.summary} ${event.actorName} ${event.action}`,
          filters: {
            module: (event, value) => event.module === value,
            actorId: (event, value) => event.actorId === value,
          },
          sortKeys: { at: (event) => event.at, actorName: (event) => event.actorName, module: (event) => event.module },
        }),
      );
    },
  };
}
