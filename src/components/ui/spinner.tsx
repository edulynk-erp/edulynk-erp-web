import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/** Decorative spinning indicator. Pair it with text (or `label`) so the busy state is announced. */
export function Spinner({ className, label }: { className?: string; label?: string }) {
  const icon = <Loader2 data-spinner aria-hidden className={cn('size-4 shrink-0 animate-spin', className)} />;
  if (!label) return icon;
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      {icon}
      {label}
    </span>
  );
}
