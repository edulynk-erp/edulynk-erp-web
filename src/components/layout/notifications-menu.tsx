'use client';

import { Bell, CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatRelative } from '@/lib/format/date';
import { cn } from '@/lib/utils/cn';
import { useCan, useServiceQuery, useServices } from '@/services/provider';

export function NotificationsMenu() {
  const services = useServices();
  const can = useCan();
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const query = useServiceQuery((s) => s.notifications.list(), []);

  if (!services) return <Skeleton className="size-9" />;

  const notifications = (query.data ?? []).filter((notification) => can(notification.module));
  const unread = notifications.filter((notification) => !notification.read).length;

  const markAllRead = async () => {
    try {
      await services.notifications.markAllRead();
      setFailed(false);
    } catch {
      setFailed(true);
    }
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        >
          <Bell />
          {unread > 0 ? (
            <span
              aria-hidden
              className="tabular absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.6rem] font-semibold text-white"
            >
              {unread > 9 ? '9+' : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0 font-semibold">Notifications</DropdownMenuLabel>
          {unread > 0 ? (
            <DropdownMenuItem
              className="gap-1 px-2 py-1 text-xs text-primary"
              onSelect={(event) => {
                event.preventDefault();
                void markAllRead();
              }}
            >
              <CheckCheck className="size-3.5" aria-hidden />
              Mark all read
            </DropdownMenuItem>
          ) : null}
        </div>
        <DropdownMenuSeparator className="m-0" />
        {failed ? (
          <p role="alert" className="px-3 py-2 text-xs text-destructive">
            Notifications could not be updated.
          </p>
        ) : null}
        <div className="max-h-96 overflow-y-auto p-1">
          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="items-start gap-3 py-2"
                onSelect={() => {
                  void services.notifications.markRead(notification.id).catch(() => setFailed(true));
                  if (notification.href) router.push(notification.href);
                }}
              >
                <span
                  aria-hidden
                  className={cn(
                    'mt-1.5 size-2 shrink-0 rounded-full',
                    notification.read ? 'bg-transparent' : 'bg-primary',
                  )}
                />
                <span className="min-w-0 space-y-0.5">
                  <span className={cn('block text-sm', !notification.read && 'font-medium')}>
                    {notification.title}
                    {notification.read ? null : <span className="sr-only"> (unread)</span>}
                  </span>
                  <span className="block text-xs text-muted-foreground">{notification.body}</span>
                  <span className="block text-xs text-muted-foreground">{formatRelative(notification.at)}</span>
                </span>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
