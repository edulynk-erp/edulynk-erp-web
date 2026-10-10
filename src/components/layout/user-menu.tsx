'use client';

import { ChevronDown, Inbox, LifeBuoy, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserMenuProps {
  displayName: string;
  roleName?: string;
  email?: string;
  /** Demo builds link to the simulated inbox. */
  showInbox?: boolean;
  showHelp?: boolean;
}

export function UserMenu({ displayName, roleName, email, showInbox = false, showHelp = false }: UserMenuProps) {
  const signOutForm = useRef<HTMLFormElement>(null);
  return (
    <>
      <form ref={signOutForm} method="post" action="/auth/logout" className="hidden" aria-hidden="true" />
      {/* modal={false}: avoids the scroll-lock <style> injection that a strict style-src would block. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-10 gap-2 px-2" aria-label={`Account menu for ${displayName}`}>
            <Avatar name={displayName} size="sm" />
            <span className="hidden max-w-40 text-left md:block">
              <span className="block truncate text-sm leading-tight font-medium">{displayName}</span>
              {roleName ? (
                <span className="block truncate text-xs leading-tight text-muted-foreground">{roleName}</span>
              ) : null}
            </span>
            <ChevronDown aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <span className="block font-medium">{displayName}</span>
            {email ? <span className="block truncate text-xs font-normal text-muted-foreground">{email}</span> : null}
            {roleName ? <span className="block text-xs font-normal text-muted-foreground">{roleName}</span> : null}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {showInbox ? (
            <DropdownMenuItem asChild>
              <Link href="/demo/inbox" prefetch={false}>
                <Inbox className="size-4" aria-hidden="true" />
                Simulated email inbox
              </Link>
            </DropdownMenuItem>
          ) : null}
          {showHelp ? (
            <DropdownMenuItem asChild>
              <Link href="/help" prefetch={false}>
                <LifeBuoy className="size-4" aria-hidden="true" />
                Help & onboarding
              </Link>
            </DropdownMenuItem>
          ) : null}
          {showInbox || showHelp ? <DropdownMenuSeparator /> : null}
          {/* The menu unmounts on select, so the (POST, same-origin) form is submitted explicitly. */}
          <DropdownMenuItem onSelect={() => signOutForm.current?.requestSubmit()}>
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
