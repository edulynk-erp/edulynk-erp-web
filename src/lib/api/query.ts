export type QueryValue = string | number | boolean | null | undefined | ReadonlyArray<string | number | boolean>;
export type QueryParams = Readonly<Record<string, QueryValue>>;

export const MAX_PAGE_SIZE = 100;
export const MAX_SEARCH_LENGTH = 100;

/** Serialises query params; `undefined`/`null` are omitted and arrays become repeated keys. */
export function buildQueryString(params: QueryParams | undefined): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const entry of value) search.append(key, String(entry));
    } else {
      search.append(key, String(value));
    }
  }
  const serialised = search.toString();
  return serialised ? `?${serialised}` : '';
}

export interface SortField {
  readonly field: string;
  readonly direction: 'asc' | 'desc';
}

const SORT_FIELD_PATTERN = /^[A-Za-z][A-Za-z0-9]*$/;

/** Contract sort syntax: `name,-createdAt`. */
export function formatSort(fields: readonly SortField[]): string | undefined {
  const parts = fields
    .filter((field) => SORT_FIELD_PATTERN.test(field.field))
    .map((field) => (field.direction === 'desc' ? `-${field.field}` : field.field));
  return parts.length > 0 ? parts.join(',') : undefined;
}

export function parseSort(value: string | null | undefined): SortField[] {
  if (!value) return [];
  return value
    .split(',')
    .map((part) => part.trim())
    .map((part): SortField =>
      part.startsWith('-') ? { field: part.slice(1), direction: 'desc' } : { field: part, direction: 'asc' },
    )
    .filter((field) => SORT_FIELD_PATTERN.test(field.field));
}
