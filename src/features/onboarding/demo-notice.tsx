import { FlaskConical } from 'lucide-react';
import type { ReactNode } from 'react';

/** States plainly that a screen is a simulation, so nobody mistakes it for real account provisioning. */
export function DemoNotice({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
      <FlaskConical className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
