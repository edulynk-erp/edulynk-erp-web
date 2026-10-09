'use client';

import { ErrorState } from '@/components/feedback/states';
import { Button } from '@/components/ui/button';

/** Route-segment boundary. Renders the opaque digest only; messages and stacks are never shown. */
export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="This page could not be loaded"
      description="An unexpected error occurred. Try again, and quote the reference if it persists."
      {...(error.digest ? { requestId: error.digest } : {})}
      action={
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}
