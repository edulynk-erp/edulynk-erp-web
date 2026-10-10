'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { ModuleId, PermissionAction } from '@/config/modules';
import type { WorkspaceContext } from '@/domain/common';
import type { AcademicYear, Campus } from '@/domain/institution';
import { hasGrant, inCampusScope } from '@/lib/access/grants';
import type { ClientPrincipal } from '@/server/auth/guards';
import { isServiceError } from '@/services/errors';
import { getServices } from '@/services/registry';
import type { Services } from '@/services/types';

const subscribeNoop = () => () => {};

/** Services exist only in the browser (after hydration); during server rendering this is null. */
export function useServices(): Services | null {
  return useSyncExternalStore(subscribeNoop, getServices, () => null);
}

const PrincipalContext = createContext<ClientPrincipal | null>(null);

export function usePrincipal(): ClientPrincipal {
  const principal = useContext(PrincipalContext);
  if (!principal) throw new Error('usePrincipal must be used inside <PortalProviders>.');
  return principal;
}

/** Presentation hint for showing or hiding controls. The server and (later) the API enforce access. */
export function useCan(): (module: ModuleId, action?: PermissionAction) => boolean {
  const principal = usePrincipal();
  return useCallback((module, action = 'view') => hasGrant(principal.grants, module, action), [principal.grants]);
}

export function PrincipalProvider({ principal, children }: { principal: ClientPrincipal; children: ReactNode }) {
  const services = useServices();
  useEffect(() => {
    services?.demo?.setActor({
      id: principal.subject,
      name: principal.displayName,
      roleId: principal.roleId,
      grants: principal.grants,
      campusScope: principal.campusScope,
    });
  }, [services, principal.subject, principal.displayName, principal.roleId, principal.grants, principal.campusScope]);
  return <PrincipalContext.Provider value={principal}>{children}</PrincipalContext.Provider>;
}

export interface QueryState<T> {
  readonly data: T | undefined;
  readonly error: string | null;
  readonly loading: boolean;
  readonly reload: () => void;
}

/**
 * Runs `load` against the services and re-runs it when `deps` change or the underlying data changes. Results from
 * superseded runs are discarded. `load` must be stable for the given deps.
 */
export function useServiceQuery<T>(load: (services: Services) => Promise<T>, deps: readonly unknown[]): QueryState<T> {
  const services = useServices();
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{ key: string; data: T | undefined; error: string | null } | null>(null);
  const key = `${version}:${JSON.stringify(deps)}`;
  const run = useEffectEvent((target: Services) => load(target));

  useEffect(() => {
    if (!services) return;
    return services.subscribe(() => setVersion((value) => value + 1));
  }, [services]);

  useEffect(() => {
    if (!services) return;
    let cancelled = false;
    run(services).then(
      (data) => {
        if (!cancelled) setResult({ key, data, error: null });
      },
      (error: unknown) => {
        if (!cancelled) setResult({ key, data: undefined, error: describeError(error) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [services, key]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  const settled = result !== null && result.key === key;
  return {
    // Keep showing the previous data while a refresh is in flight (tables dim instead of flashing skeletons).
    data: result?.data,
    error: settled ? result.error : null,
    loading: !services || !settled,
    reload,
  };
}

export function describeError(error: unknown): string {
  if (isServiceError(error)) return error.message;
  return 'Something went wrong. Try again.';
}

interface WorkspaceValue {
  readonly workspace: WorkspaceContext | null;
  /** Campuses the signed-in user may select. */
  readonly campuses: readonly Campus[];
  /** Whether "All campuses" may be selected (institution-wide roles only). */
  readonly allowAllCampuses: boolean;
  readonly years: readonly AcademicYear[];
  readonly setWorkspace: (workspace: WorkspaceContext) => void;
}

const WorkspaceContextValue = createContext<WorkspaceValue | null>(null);

/** Holds the header's campus and academic-year selection. A display preference only, never an access decision. */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const services = useServices();
  const { campusScope } = usePrincipal();
  const options = useServiceQuery(async (s) => {
    const [campuses, years] = await Promise.all([s.institution.listCampuses(), s.institution.listAcademicYears()]);
    return { campuses, years };
  }, []);
  const [selected, setSelected] = useState<WorkspaceContext | null>(null);

  const campuses = useMemo(
    () => (options.data?.campuses ?? []).filter((campus) => inCampusScope(campusScope, campus.id)),
    [options.data, campusScope],
  );
  const allowAllCampuses = campusScope === 'all';
  const years = useMemo(() => options.data?.years ?? [], [options.data]);

  const workspace = useMemo<WorkspaceContext | null>(() => {
    if (years.length === 0) return null;
    const stored = selected ?? services?.demo?.getWorkspace() ?? null;
    const validYear = stored && years.some((year) => year.id === stored.academicYearId);
    const validCampus =
      stored &&
      ((stored.campusId === 'all' && allowAllCampuses) || campuses.some((campus) => campus.id === stored.campusId));
    const currentYear = years.find((year) => year.status === 'current') ?? years[0]!;
    const fallbackCampus = allowAllCampuses ? 'all' : campuses[0]?.id;
    if (!fallbackCampus) return null;
    return {
      campusId: validCampus && stored ? stored.campusId : fallbackCampus,
      academicYearId: validYear && stored ? stored.academicYearId : currentYear.id,
    };
  }, [selected, services, years, campuses, allowAllCampuses]);

  const setWorkspace = useCallback(
    (next: WorkspaceContext) => {
      setSelected(next);
      services?.demo?.setWorkspace(next);
    },
    [services],
  );

  const value = useMemo(
    () => ({ workspace, campuses, allowAllCampuses, years, setWorkspace }),
    [workspace, campuses, allowAllCampuses, years, setWorkspace],
  );
  return <WorkspaceContextValue.Provider value={value}>{children}</WorkspaceContextValue.Provider>;
}

export function useWorkspace(): WorkspaceValue {
  const value = useContext(WorkspaceContextValue);
  if (!value) throw new Error('useWorkspace must be used inside <WorkspaceProvider>.');
  return value;
}
