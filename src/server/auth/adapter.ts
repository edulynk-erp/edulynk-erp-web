import 'server-only';
import { getServerEnv } from '@/server/env';
import { unconfiguredIdentityAdapter } from '@/server/auth/adapters/unconfigured';
import type { IdentityAdapter } from '@/server/auth/types';

/** The only way to obtain an identity adapter. Env validation accepts `unconfigured` only until a contract exists. */
export function getIdentityAdapter(): IdentityAdapter {
  switch (getServerEnv().AUTH_ADAPTER) {
    case 'unconfigured':
      return unconfiguredIdentityAdapter;
  }
}
