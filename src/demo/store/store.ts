import { createSeed } from '@/demo/seed';
import { PERSISTED_COLLECTIONS, type DemoDatabase, type PersistedCollection } from '@/demo/store/db';
import { PERSISTED_VERSION, type PersistenceAdapter, type PersistedState } from '@/demo/store/persistence';
import type { IsoDate, WorkspaceContext } from '@/domain/common';
import {
  INSTITUTION_CATEGORIES,
  INSTITUTION_TYPES,
  LOCATION_KINDS,
  type Campus,
  type GradingConfig,
  type Institution,
  type InstitutionType,
} from '@/domain/institution';

type Listener = () => void;

/**
 * In-memory demo database. Seed data is regenerated deterministically; only collections changed in this browser are
 * persisted, together with the seed date they were created against.
 */
export class DemoStore {
  private db: DemoDatabase;
  private workspace: WorkspaceContext | null;
  private readonly dirty = new Set<PersistedCollection>();
  private readonly listeners = new Set<Listener>();

  constructor(
    private readonly persistence: PersistenceAdapter,
    private readonly today: () => IsoDate,
  ) {
    const persisted = persistence.load();
    this.db = createSeed(persisted?.seedDate ?? today());
    this.workspace = persisted?.workspace ?? null;
    if (persisted) this.restore(persisted);
  }

  get data(): DemoDatabase {
    return this.db;
  }

  get persistent(): boolean {
    return this.persistence.available;
  }

  getWorkspace(): WorkspaceContext | null {
    return this.workspace;
  }

  setWorkspace(workspace: WorkspaceContext): void {
    this.workspace = workspace;
    this.save();
    this.emit();
  }

  update<K extends PersistedCollection>(
    collection: K,
    change: (items: DemoDatabase[K]) => DemoDatabase[K],
  ): DemoDatabase[K] {
    const next = change(this.db[collection]);
    this.db = { ...this.db, [collection]: next };
    this.dirty.add(collection);
    this.save();
    this.emit();
    return next;
  }

  reset(): void {
    this.persistence.clear();
    this.dirty.clear();
    this.workspace = null;
    this.db = createSeed(this.today());
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private restore(persisted: PersistedState): void {
    for (const name of PERSISTED_COLLECTIONS) {
      const items = persisted.collections[name];
      if (!items) continue;
      this.db = { ...this.db, [name]: restored(this.db, name, items) };
      this.dirty.add(name);
    }
    const roleIds = new Set([...this.db.roles, ...this.db.customRoles].map((role) => role.id));
    if (this.db.users.some((user) => !roleIds.has(user.roleId))) {
      this.db = { ...this.db, users: this.db.users.filter((user) => roleIds.has(user.roleId)) };
    }
  }

  private save(): void {
    const collections: Partial<Record<PersistedCollection, unknown>> = {};
    for (const name of this.dirty) collections[name] = this.db[name];
    this.persistence.save({
      version: PERSISTED_VERSION,
      seedDate: this.db.seedDate,
      collections,
      workspace: this.workspace,
    });
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

function restored(seed: DemoDatabase, name: PersistedCollection, saved: unknown): unknown {
  if (name === 'institution') return mergeInstitution(seed.institution, saved);
  if (name === 'grading') return mergeGrading(seed.grading, saved);
  if (name === 'campuses') return (saved as Partial<Campus>[]).map(normaliseCampus);
  return saved;
}

/** Older saves used a school/college type list and kept board details at the top level. */
const LEGACY_TYPES: Readonly<Record<string, InstitutionType>> = {
  college: 'degree-college',
  'school-and-college': 'school',
};

type LegacyInstitution = Partial<Institution> & {
  readonly boardId?: string;
  readonly affiliationNumber?: string;
  readonly udiseCode?: string;
};

/** Saved institution settings over the seed, so fields added after the save keep their seed values. */
function mergeInstitution(seed: Institution, saved: unknown): Institution {
  const record = saved as LegacyInstitution;
  const { boardId, affiliationNumber, udiseCode, ...rest } = record;
  const type = (INSTITUTION_TYPES as readonly string[]).includes(String(record.type))
    ? (record.type as InstitutionType)
    : (LEGACY_TYPES[String(record.type)] ?? seed.type);
  const category = (INSTITUTION_CATEGORIES as readonly string[]).includes(String(record.category))
    ? record.category!
    : seed.category;
  const details = record.typeDetails;
  const legacySchool =
    boardId === undefined ? {} : { boardId, affiliationNumber: affiliationNumber ?? '', udiseCode: udiseCode ?? '' };
  return {
    ...seed,
    ...rest,
    type,
    category,
    typeDetails: {
      school: { ...seed.typeDetails.school, ...legacySchool, ...details?.school },
      'junior-college': { ...seed.typeDetails['junior-college'], ...details?.['junior-college'] },
      'degree-college': { ...seed.typeDetails['degree-college'], ...details?.['degree-college'] },
      university: { ...seed.typeDetails.university, ...details?.university },
      coaching: { ...seed.typeDetails.coaching, ...details?.coaching },
      other: { ...seed.typeDetails.other, ...details?.other },
    },
    structure: Object.fromEntries(
      INSTITUTION_TYPES.map((key) => [key, { ...seed.structure[key], ...record.structure?.[key] }]),
    ) as Institution['structure'],
    policies: { ...seed.policies, ...record.policies },
    branding: { ...seed.branding, ...record.branding },
  };
}

function mergeGrading(seed: GradingConfig, saved: unknown): GradingConfig {
  const record = saved as Partial<GradingConfig>;
  return { ...seed, ...record, transcript: { ...seed.transcript, ...record.transcript } };
}

function normaliseCampus(campus: Partial<Campus>): Campus {
  return {
    ...(campus as Campus),
    kind: (LOCATION_KINDS as readonly string[]).includes(String(campus.kind)) ? campus.kind! : 'campus',
    pinCode: campus.pinCode ?? '',
    contactPerson: campus.contactPerson ?? '',
  };
}
