'use client';

import { Check, ChevronDown, FlaskConical } from 'lucide-react';
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

export interface DemoRoleOption {
  readonly roleId: string;
  readonly roleName: string;
  readonly displayName: string;
}

/**
 * DEMO ONLY. Signs in again as the demo account holding another role (POST /auth/switch-role, which the server
 * refuses unless the demo identity adapter is active). The session cookie, not this menu, decides what is shown.
 */
export function RoleSwitcher({ roles, currentRoleId }: { roles: readonly DemoRoleOption[]; currentRoleId: string }) {
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);

  return (
    <>
      <form ref={form} method="post" action="/auth/switch-role" className="hidden" aria-hidden="true">
        <input ref={input} type="hidden" name="roleId" defaultValue={currentRoleId} />
      </form>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-warning/50 bg-warning/10 text-warning-foreground hover:bg-warning/20"
            aria-label="Demo mode: switch role"
          >
            <FlaskConical aria-hidden />
            <span className="hidden sm:inline">Demo</span>
            <ChevronDown aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-[70vh] w-72 overflow-y-auto">
          <DropdownMenuLabel>
            <span className="block font-semibold">Demo mode</span>
            <span className="block text-xs font-normal text-muted-foreground">
              Simulated data and sign-in. View the ERP as another role:
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {roles.map((role) => {
            const current = role.roleId === currentRoleId;
            return (
              <DropdownMenuItem
                key={role.roleId}
                disabled={current}
                onSelect={() => {
                  if (!input.current) return;
                  input.current.value = role.roleId;
                  form.current?.requestSubmit();
                }}
              >
                <Check className={current ? 'size-4' : 'size-4 opacity-0'} aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate">{role.roleName}</span>
                  <span className="block truncate text-xs text-muted-foreground">{role.displayName}</span>
                </span>
                {current ? <span className="sr-only">(current role)</span> : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
