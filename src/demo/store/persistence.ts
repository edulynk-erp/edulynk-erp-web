import { PERSISTED_COLLECTIONS, SINGLE_RECORD_COLLECTIONS, type PersistedCollection } from '@/demo/store/db';
import type { IsoDate, WorkspaceContext } from '@/domain/common';

/**
 * The only module allowed to use browser storage (see eslint.config.mjs). It keeps non-sensitive demo records so a
 * page reload does not lose them. Never store passwords, tokens for real systems or secrets here: anything in
 * localStorage is readable by any script on the origin. Data is per browser and does not synchronise across devices.
 */
const STORAGE_KEY = 'edulynk-erp-demo:v2';
/** Bump when record shapes or IDs change, so data saved by an older version is discarded instead of misread. */
export const PERSISTED_VERSION = 2;

export interface PersistedState {
  readonly version: typeof PERSISTED_VERSION;
  readonly seedDate: IsoDate;
  /** Lists, except the single records in `SINGLE_RECORD_COLLECTIONS`. */
  readonly collections: Partial<Record<PersistedCollection, unknown>>;
  readonly workspace: WorkspaceContext | null;
}

export interface PersistenceAdapter {
  load(): PersistedState | null;
  /** Returns false when the browser refused to store (quota, private mode, disabled storage). */
  save(state: PersistedState): boolean;
  clear(): void;
  readonly available: boolean;
}

function storage(): Storage | null {
  try {
    const candidate = window.localStorage;
    const probe = `${STORAGE_KEY}:probe`;
    candidate.setItem(probe, '1');
    candidate.removeItem(probe);
    return candidate;
  } catch {
    return null;
  }
}

function isPersistedState(value: unknown): value is PersistedState {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<PersistedState>;
  if (candidate.version !== PERSISTED_VERSION || typeof candidate.seedDate !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate.seedDate)) return false;
  if (typeof candidate.collections !== 'object' || candidate.collections === null) return false;
  return Object.entries(candidate.collections).every(
    ([name, items]) =>
      (PERSISTED_COLLECTIONS as readonly string[]).includes(name) &&
      (SINGLE_RECORD_COLLECTIONS.has(name as PersistedCollection)
        ? typeof items === 'object' && items !== null && !Array.isArray(items)
        : Array.isArray(items)),
  );
}

export function createBrowserPersistence(): PersistenceAdapter {
  const store = typeof window === 'undefined' ? null : storage();
  return {
    available: store !== null,
    load() {
      if (!store) return null;
      try {
        const raw = store.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        return isPersistedState(parsed) ? parsed : null;
      } catch {
        return null;
      }
    },
    save(state) {
      if (!store) return false;
      try {
        store.setItem(STORAGE_KEY, JSON.stringify(state));
        return true;
      } catch {
        return false;
      }
    },
    clear() {
      try {
        store?.removeItem(STORAGE_KEY);
      } catch {
        // Nothing to clear.
      }
    },
  };
}

export function createMemoryPersistence(initial: PersistedState | null = null): PersistenceAdapter {
  let state = initial;
  return {
    available: true,
    load: () => state,
    save(next) {
      state = next;
      return true;
    },
    clear() {
      state = null;
    },
  };
}
