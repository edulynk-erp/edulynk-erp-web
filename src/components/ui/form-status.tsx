'use client';

import { cn } from '@/lib/utils/cn';

/**
 * Shown beside a submit button that is disabled because required fields are empty or invalid, so the reason is never
 * hidden. `onReveal` should validate the whole form so every problem is marked (react-hook-form `trigger`).
 */
export function IncompleteFormHint({ onReveal, className }: { onReveal?: () => void; className?: string }) {
  return (
    <p className={cn('text-xs text-muted-foreground', className)}>
      Complete the required fields to continue.
      {onReveal ? (
        <>
          {' '}
          <button
            type="button"
            onClick={onReveal}
            className="rounded-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Show what&apos;s missing
          </button>
        </>
      ) : null}
    </p>
  );
}
