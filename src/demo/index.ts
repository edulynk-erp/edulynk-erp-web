import { createDashboardService } from '@/demo/services/dashboard';
import { createOnboardingService, createInboxService } from '@/demo/services/onboarding';
import { createAuditService, createCalendarService, createNotificationService } from '@/demo/services/institution';
import { createInstitutionService } from '@/demo/services/institution-setup';
import { createRoleService, createUserService } from '@/demo/services/users';
import type { MockContext } from '@/demo/services/context';
import { createBrowserPersistence, type PersistenceAdapter } from '@/demo/store/persistence';
import { DemoStore } from '@/demo/store/store';
import { todayIso } from '@/lib/format/date';
import type { Actor, Services } from '@/services/types';

/** Present in every build that includes mock data; `npm run verify:production-build` asserts it is absent otherwise. */
export const DEMO_SERVICES_MARKER = 'edulynk-demo-services:included';

export interface DemoServiceOptions {
  readonly persistence?: PersistenceAdapter;
  readonly now?: () => Date;
  readonly writeDelayMs?: number;
}

/** DEMO ONLY. Mock implementations of every service, backed by the in-browser demo store. */
export function createDemoServices(options: DemoServiceOptions = {}): Services {
  const now = options.now ?? (() => new Date());
  const store = new DemoStore(options.persistence ?? createBrowserPersistence(), () => todayIso(now()));
  let actor: Actor | null = null;
  const context: MockContext = {
    store,
    now,
    actor: () => actor,
    writeDelayMs: options.writeDelayMs ?? 250,
  };
  return {
    institution: createInstitutionService(context),
    users: createUserService(context),
    roles: createRoleService(context),
    onboarding: createOnboardingService(context),
    inbox: createInboxService(context),
    notifications: createNotificationService(context),
    calendar: createCalendarService(context),
    audit: createAuditService(context),
    dashboard: createDashboardService(context),
    subscribe: (listener) => store.subscribe(listener),
    demo: {
      marker: DEMO_SERVICES_MARKER,
      setActor(next) {
        actor = next;
      },
      reset() {
        store.reset();
      },
      get persistent() {
        return store.persistent;
      },
      getWorkspace: () => store.getWorkspace(),
      setWorkspace: (workspace) => store.setWorkspace(workspace),
    },
  };
}
