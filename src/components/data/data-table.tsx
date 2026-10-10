'use client';

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState, ErrorState } from '@/components/feedback/states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCount } from '@/lib/format/number';
import type { Page, SortDirection } from '@/lib/query/list';
import { cn } from '@/lib/utils/cn';

export interface DataColumn<T> {
  /** Also the service sort field when `sortable`. */
  readonly id: string;
  readonly header: string;
  readonly cell: (row: T) => ReactNode;
  readonly sortable?: boolean;
  readonly className?: string;
  /** Hide the header text visually (e.g. an actions column) while keeping it for screen readers. */
  readonly srOnlyHeader?: boolean;
}

export interface TableSort {
  readonly field: string;
  readonly direction: SortDirection;
}

interface DataTableProps<T> {
  caption: string;
  columns: readonly DataColumn<T>[];
  page: Page<T> | undefined;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  getRowId: (row: T) => string;
  sort?: TableSort | null;
  onSortChange?: (sort: TableSort | null) => void;
  onPageChange: (page: number) => void;
  emptyTitle?: string;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
}

function nextSort(current: TableSort | null | undefined, field: string): TableSort | null {
  if (current?.field !== field) return { field, direction: 'asc' };
  return current.direction === 'asc' ? { field, direction: 'desc' } : null;
}

/**
 * Accessible table over a service `Page<T>`. Searching, filtering, sorting and pagination happen in the service layer
 * (as they will in the institution API), so the table renders only the current page.
 */
export function DataTable<T>({
  caption,
  columns,
  page,
  loading,
  error,
  onRetry,
  getRowId,
  sort,
  onSortChange,
  onPageChange,
  emptyTitle = 'No records found',
  emptyDescription = 'Try changing the search or filters.',
  emptyAction,
}: DataTableProps<T>) {
  if (error) {
    return (
      <ErrorState
        title="This list could not be loaded"
        description={error}
        action={
          onRetry ? (
            <Button variant="outline" onClick={onRetry}>
              Try again
            </Button>
          ) : undefined
        }
      />
    );
  }

  const showSkeleton = !page;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border bg-card" aria-busy={loading}>
        <table className="w-full min-w-[42rem] text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b bg-muted/60 text-left text-xs font-medium text-muted-foreground uppercase">
            <tr>
              {columns.map((column) => {
                const direction = sort?.field === column.id ? sort.direction : null;
                const label = column.srOnlyHeader ? <span className="sr-only">{column.header}</span> : column.header;
                return (
                  <th
                    key={column.id}
                    scope="col"
                    className={cn('px-4 py-3 font-medium tracking-wide whitespace-nowrap', column.className)}
                    aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : undefined}
                  >
                    {column.sortable && onSortChange ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded uppercase hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => onSortChange(nextSort(sort, column.id))}
                      >
                        {label}
                        {direction === 'asc' ? (
                          <ArrowUp className="size-3.5" aria-hidden />
                        ) : direction === 'desc' ? (
                          <ArrowDown className="size-3.5" aria-hidden />
                        ) : (
                          <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />
                        )}
                      </button>
                    ) : (
                      label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className={cn('divide-y', loading && page && 'opacity-60')}>
            {showSkeleton
              ? Array.from({ length: 6 }, (_, row) => (
                  <tr key={row}>
                    {columns.map((column) => (
                      <td key={column.id} className="px-4 py-3">
                        <Skeleton className="h-4 w-full max-w-40" />
                      </td>
                    ))}
                  </tr>
                ))
              : page.items.map((row) => (
                  <tr key={getRowId(row)} className="hover:bg-muted/40">
                    {columns.map((column) => (
                      <td key={column.id} className={cn('px-4 py-3 align-middle', column.className)}>
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
        {page && page.items.length === 0 ? (
          <EmptyState
            className="rounded-none border-0"
            title={emptyTitle}
            description={emptyDescription}
            action={emptyAction}
          />
        ) : null}
      </div>
      {page && page.total > 0 ? <Pagination page={page} onPageChange={onPageChange} /> : null}
      {loading ? (
        <span role="status" className="sr-only">
          Loading
        </span>
      ) : null}
    </div>
  );
}

export function Pagination<T>({ page, onPageChange }: { page: Page<T>; onPageChange: (page: number) => void }) {
  const from = (page.page - 1) * page.pageSize + 1;
  const to = Math.min(page.page * page.pageSize, page.total);
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground">
        Showing <span className="tabular font-medium text-foreground">{formatCount(from)}</span>–
        <span className="tabular font-medium text-foreground">{formatCount(to)}</span> of{' '}
        <span className="tabular font-medium text-foreground">{formatCount(page.total)}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(page.page - 1)} disabled={page.page <= 1}>
          <ChevronLeft aria-hidden />
          Previous
        </Button>
        <span className="tabular text-muted-foreground">
          Page {page.page} of {page.pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page.page + 1)}
          disabled={page.page >= page.pageCount}
        >
          Next
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
