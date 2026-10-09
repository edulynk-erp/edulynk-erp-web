'use client';

import { ChevronDown, LogOut } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function UserMenu({ displayName }: { displayName: string }) {
  const signOutForm = useRef<HTMLFormElement>(null);
  return (
    <>
      <form ref={signOutForm} method="post" action="/auth/logout" className="hidden" aria-hidden="true" />
      {/* modal={false}: avoids the scroll-lock <style> injection that a strict style-src would block. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 px-2" aria-label={`Account menu for ${displayName}`}>
            <span className="max-w-40 truncate text-sm font-medium">{displayName}</span>
            <ChevronDown aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <span className="block font-medium">{displayName}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
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
