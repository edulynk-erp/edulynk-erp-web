'use client';

import { Pencil, Trash2, type LucideIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { EmptyState } from '@/components/feedback/states';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';
import { isServiceError } from '@/services/errors';

export function SectionCard({
  icon: Icon,
  title,
  description,
  actions,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            aria-hidden
          >
            <Icon className="size-4.5" />
          </span>
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">{title}</h2>
            {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** A text input with a decorative leading icon. Receives the FormField control props like a plain input. */
export function IconInput({ icon: Icon, className, ...props }: ComponentProps<'input'> & { icon: LucideIcon }) {
  return (
    <div className="relative">
      <Icon
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input className={cn('pl-9', className)} {...props} />
    </div>
  );
}

export interface SetupColumn<T> {
  readonly header: string;
  readonly cell: (row: T) => ReactNode;
  readonly className?: string;
  readonly srOnlyHeader?: boolean;
}

/** A compact, fully rendered table for the short lists in Institution Setup (no paging). */
export function SetupTable<T>({
  caption,
  columns,
  rows,
  getRowId,
  emptyTitle,
  emptyDescription,
  loading = false,
}: {
  caption: string;
  columns: readonly SetupColumn<T>[];
  rows: readonly T[];
  getRowId: (row: T) => string;
  emptyTitle: string;
  emptyDescription?: string;
  loading?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border" aria-busy={loading}>
      <table className="w-full min-w-[36rem] text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b bg-muted/60 text-left text-xs text-muted-foreground uppercase">
          <tr>
            {columns.map((column) => (
              <th
                key={column.header}
                scope="col"
                className={cn('px-4 py-2.5 font-medium tracking-wide whitespace-nowrap', column.className)}
              >
                {column.srOnlyHeader ? <span className="sr-only">{column.header}</span> : column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={cn('divide-y', loading && rows.length > 0 && 'opacity-60')}>
          {loading && rows.length === 0
            ? Array.from({ length: 3 }, (_, index) => (
                <tr key={`skeleton-${index}`} aria-hidden>
                  {columns.map((column) => (
                    <td key={column.header} className="px-4 py-3">
                      <Skeleton className="h-4 w-full max-w-40" />
                    </td>
                  ))}
                </tr>
              ))
            : null}
          {rows.map((row) => (
            <tr key={getRowId(row)} className="hover:bg-muted/40">
              {columns.map((column) => (
                <td key={column.header} className={cn('px-4 py-2.5 align-middle', column.className)}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && !loading ? (
        <EmptyState className="rounded-none border-0" title={emptyTitle} description={emptyDescription} />
      ) : null}
    </div>
  );
}

/** Edit and delete icon buttons for a row; each is omitted when its handler is null. */
export function RowActions({
  label,
  onEdit,
  onDelete,
  children,
}: {
  label: string;
  onEdit: (() => void) | null;
  onDelete: (() => void) | null;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      {children}
      {onEdit ? (
        <Button variant="ghost" size="icon" className="size-8" onClick={onEdit} aria-label={`Edit ${label}`}>
          <Pencil />
        </Button>
      ) : null}
      {onDelete ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onDelete}
          aria-label={`Delete ${label}`}
        >
          <Trash2 />
        </Button>
      ) : null}
    </div>
  );
}

/** Copies field-level service errors onto the form. Returns true when at least one field was marked. */
export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly string[],
): boolean {
  if (!isServiceError(error, 'VALIDATION')) return false;
  let applied = false;
  for (const [field, message] of Object.entries(error.fieldErrors)) {
    if (fields.some((name) => field === name || field.startsWith(`${name}.`))) {
      setError(field as Path<T>, { type: 'server', message });
      applied = true;
    }
  }
  return applied;
}
