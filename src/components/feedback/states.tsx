import { AlertTriangle, Construction, Inbox, Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';

interface StateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

function StatePanel({
  icon,
  title,
  description,
  action,
  className,
  role,
}: StateProps & { icon: ReactNode; role?: 'alert' | 'status' }) {
  return (
    <div
      role={role}
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-card px-6 py-12 text-center',
        className,
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden>
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        {description ? <div className="max-w-md text-sm text-muted-foreground">{description}</div> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState(props: StateProps) {
  return <StatePanel icon={<Inbox className="size-5" />} {...props} />;
}

export function NotAvailableState(props: StateProps) {
  return <StatePanel icon={<Construction className="size-5" />} role="status" {...props} />;
}

export function ForbiddenState(props: StateProps) {
  return <StatePanel icon={<Lock className="size-5" />} {...props} />;
}

export function ErrorState({ requestId, ...props }: StateProps & { requestId?: string }) {
  return (
    <StatePanel
      icon={<AlertTriangle className="size-5" />}
      role="alert"
      {...props}
      description={
        <>
          {props.description}
          {requestId ? (
            <span className="mt-2 block font-mono text-xs">
              Reference: <span className="select-all">{requestId}</span>
            </span>
          ) : null}
        </>
      }
    />
  );
}

export function LoadingState({ label = 'Loading', rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}
