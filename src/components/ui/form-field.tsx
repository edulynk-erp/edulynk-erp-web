import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';
import { Label } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';

export interface FieldControlProps {
  id: string;
  'aria-invalid': boolean | undefined;
  'aria-describedby': string | undefined;
  'aria-required': boolean | undefined;
}

interface FormFieldProps {
  label: string;
  /**
   * A single input-like element (it receives `id`, `aria-invalid`, `aria-describedby` and `aria-required`), or a render function that
   * spreads those props onto a nested control.
   */
  children: ReactElement<Partial<FieldControlProps>> | ((control: FieldControlProps) => ReactNode);
  error?: string | undefined;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  id?: string;
}

/** Label, control, hint and error wired together for assistive technology. */
export function FormField({ label, children, error, hint, required, className, id: idProp }: FormFieldProps) {
  const generated = useId();
  const id = idProp ?? generated;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const control: FieldControlProps = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined,
    'aria-required': required ? true : undefined,
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden>
            {' '}
            *
          </span>
        ) : null}
      </Label>
      {typeof children === 'function'
        ? children(control)
        : isValidElement(children)
          ? cloneElement(children, control)
          : children}
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
