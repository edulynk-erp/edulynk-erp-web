import { Skeleton } from '@/components/ui/skeleton';

/** Placeholder for a portal page while its route loads: heading, summary cards and a table. */
export function PageSkeleton({ label = 'Loading page' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">{label}</span>
      <div className="space-y-3">
        <Skeleton className="h-3 w-48" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-80 max-w-[60vw]" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <Skeleton className="h-9 w-full max-w-sm" />
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

/** Placeholder for the single-card public pages (sign-in, invitations, password reset). */
export function CardSkeleton({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="mx-auto w-full max-w-md space-y-5 p-6">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
