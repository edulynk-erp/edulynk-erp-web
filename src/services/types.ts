import type { Grant } from '@/config/modules';
import type { CampusScope, WorkspaceContext } from '@/domain/common';
import type { AuditService, CalendarService, NotificationService } from '@/services/communication';
import type { DashboardService } from '@/services/dashboard';
import type { InstitutionService } from '@/services/institution';
import type { InboxService, OnboardingService } from '@/services/onboarding';
import type { RoleService, UserService } from '@/services/users';

/**
 * The person acting in the browser. Mock services attribute audit events to it and check its grants before writes,
 * mirroring the checks the institution API will make against the verified identity.
 */
export interface Actor {
  readonly id: string;
  readonly name: string;
  readonly roleId: string;
  readonly grants: readonly Grant[];
  readonly campusScope: CampusScope;
}

/** Controls that exist only for the mock implementation (demo builds). API-backed services do not provide them. */
export interface DemoControls {
  readonly marker: string;
  setActor(actor: Actor | null): void;
  /** Discards local changes and restores the seed data. */
  reset(): void;
  /** Whether changes are being kept in this browser (false when browser storage is unavailable). */
  readonly persistent: boolean;
  /** The last campus and academic year chosen in the header (a preference, not an access decision). */
  getWorkspace(): WorkspaceContext | null;
  setWorkspace(workspace: WorkspaceContext): void;
}

/**
 * Every data dependency of the UI. Components obtain these through `useServices()` and never import data directly, so
 * the mock implementation can be replaced by API clients without touching screens.
 */
export interface Services {
  readonly institution: InstitutionService;
  readonly users: UserService;
  readonly roles: RoleService;
  readonly onboarding: OnboardingService;
  readonly inbox: InboxService;
  readonly notifications: NotificationService;
  readonly calendar: CalendarService;
  readonly audit: AuditService;
  readonly dashboard: DashboardService;
  /** Notifies after any data change, so open screens can refresh. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  readonly demo?: DemoControls;
}
