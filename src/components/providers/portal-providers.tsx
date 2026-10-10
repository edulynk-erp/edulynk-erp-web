'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/toast';
import type { ClientPrincipal } from '@/server/auth/guards';
import { PrincipalProvider, WorkspaceProvider } from '@/services/provider';

export function PortalProviders({ principal, children }: { principal: ClientPrincipal; children: ReactNode }) {
  return (
    <PrincipalProvider principal={principal}>
      <WorkspaceProvider>
        <ToastProvider>{children}</ToastProvider>
      </WorkspaceProvider>
    </PrincipalProvider>
  );
}
