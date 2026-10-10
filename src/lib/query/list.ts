/** Search, filter, sort and paginate. Shared by every list service so behaviour is identical across modules. */

export type SortDirection = 'asc' | 'desc';

export interface ListQuery<TFilters extends Record<string, string | undefined> = Record<string, string | undefined>> {
  readonly search?: string;
  readonly filters?: Partial<TFilters>;
  readonly sort?: { readonly field: string; readonly direction: SortDirection };
  /** 1-based. */
  readonly page?: number;
  readonly pageSize?: number;
}

export interface Page<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly pageCount: number;
}

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

export interface ListSpec<T> {
  /** Text the search term is matched against (case- and accent-insensitive substring). */
  readonly searchText: (item: T) => string;
  /** Filter predicates keyed by filter name; an empty or missing value means "no filter". */
  readonly filters?: Record<string, (item: T, value: string) => boolean>;
  /** Sort keys by field name. Unknown fields are ignored (stable original order). */
  readonly sortKeys?: Record<string, (item: T) => string | number | null>;
}

export function normaliseText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function runListQuery<T>(items: readonly T[], query: ListQuery, spec: ListSpec<T>): Page<T> {
  const term = normaliseText(query.search ?? '');
  let result = term ? items.filter((item) => normaliseText(spec.searchText(item)).includes(term)) : [...items];

  for (const [name, value] of Object.entries(query.filters ?? {})) {
    const predicate = spec.filters?.[name];
    if (predicate && value) result = result.filter((item) => predicate(item, value));
  }

  const sortKey = query.sort ? spec.sortKeys?.[query.sort.field] : undefined;
  if (sortKey && query.sort) {
    const factor = query.sort.direction === 'desc' ? -1 : 1;
    result = result
      .map((item, index) => ({ item, index, key: sortKey(item) }))
      .sort((a, b) => compareKeys(a.key, b.key) * factor || a.index - b.index)
      .map(({ item }) => item);
  }

  const pageSize = clamp(Math.trunc(query.pageSize ?? DEFAULT_PAGE_SIZE), 1, MAX_PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(result.length / pageSize));
  const page = clamp(Math.trunc(query.page ?? 1), 1, pageCount);
  return {
    items: result.slice((page - 1) * pageSize, page * pageSize),
    total: result.length,
    page,
    pageSize,
    pageCount,
  };
}

/** Nulls sort last in ascending order. Strings compare with Indian-English collation. */
function compareKeys(a: string | number | null, b: string | number | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'en-IN', { sensitivity: 'base', numeric: true });
}

function clamp(value: number, min: number, max: number): number {
  return Number.isNaN(value) ? min : Math.min(Math.max(value, min), max);
}
