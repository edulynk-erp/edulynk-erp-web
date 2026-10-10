import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Supporting line, e.g. "+4.2% vs last year". */
  detail?: ReactNode;
  tone?: 'primary' | 'success' | 'warning' | 'info' | 'violet';
  href?: string;
}

const TONES = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/15 text-success-foreground',
  warning: 'bg-warning/15 text-warning-foreground',
  info: 'bg-info/15 text-[#075985]',
  violet: 'bg-[#ede9fe] text-[#5b21b6]',
} as const;

export function StatCard({ label, value, icon: Icon, detail, tone = 'primary', href }: StatCardProps) {
  const body = (
    <Card className={cn('flex items-start gap-4 p-5', href && 'transition-shadow hover:shadow-md')}>
      <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-lg', TONES[tone])} aria-hidden>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 space-y-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="tabular text-2xl font-semibold tracking-tight">{value}</p>
        {detail ? <div className="text-xs text-muted-foreground">{detail}</div> : null}
      </div>
    </Card>
  );
  return href ? (
    <Link href={href} className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {body}
    </Link>
  ) : (
    body
  );
}

export function StatCardSkeleton() {
  return (
    <Card className="flex items-start gap-4 p-5" aria-hidden>
      <Skeleton className="size-11 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-20" />
      </div>
    </Card>
  );
}
