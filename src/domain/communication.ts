import type { ModuleId } from '@/config/modules';
import type { IsoDate, IsoDateTime, TenantScoped, Tone } from '@/domain/common';

export interface Notification extends TenantScoped {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly at: IsoDateTime;
  readonly read: boolean;
  readonly tone: Tone;
  /** Module the notification relates to; only shown to principals who can view it. */
  readonly module: ModuleId;
  readonly href: string | null;
}

export interface CalendarEvent extends TenantScoped {
  readonly id: string;
  readonly title: string;
  readonly kind: 'event' | 'examination' | 'holiday' | 'meeting';
  readonly startsOn: IsoDate;
  readonly endsOn: IsoDate;
  readonly campusId: string | 'all';
  readonly audience: string;
}
