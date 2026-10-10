import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

const fieldClasses =
  'flex w-full rounded-md border border-input bg-card text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(fieldClasses, 'h-9 px-3 py-1', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(fieldClasses, 'min-h-20 px-3 py-2', className)} {...props} />;
}

/** Form dropdowns use the app's custom menu; it accepts the same props and `<option>` children as `<select>`. */
export { Select } from '@/components/ui/select-menu';

export function Label({ className, ...props }: ComponentProps<'label'>) {
  return <label className={cn('text-sm font-medium leading-none', className)} {...props} />;
}
