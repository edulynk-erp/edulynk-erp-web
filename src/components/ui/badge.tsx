import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import type { Tone } from '@/domain/common';
import { cn } from '@/lib/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/10 text-accent-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'text-foreground',
        warning: 'border-transparent bg-warning/15 text-warning-foreground',
        success: 'border-transparent bg-success/15 text-success-foreground',
        destructive: 'border-transparent bg-destructive/10 text-destructive',
        info: 'border-transparent bg-info/15 text-[#075985]',
        neutral: 'border-transparent bg-muted text-muted-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

export function Badge({ className, variant, ...props }: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

const TONE_VARIANT: Record<Tone, BadgeVariant> = {
  neutral: 'neutral',
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'destructive',
  primary: 'default',
};

/** A status pill with a leading dot. Colour is never the only signal: the label always carries the meaning. */
export function StatusBadge({ tone, children, className }: { tone: Tone; children: string; className?: string }) {
  return (
    <Badge variant={TONE_VARIANT[tone]} className={className}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </Badge>
  );
}
