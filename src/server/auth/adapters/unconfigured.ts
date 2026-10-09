import 'server-only';
import { IdentityError, type IdentityAdapter } from '@/server/auth/types';

const notConfigured = () =>
  new IdentityError('NOT_CONFIGURED', 'No identity provider is configured for this environment.');

/** Default adapter: sign-in is unavailable until the tenant-realm identity integration exists. Fails closed. */
export const unconfiguredIdentityAdapter: IdentityAdapter = {
  id: 'unconfigured',
  beginSignIn: async () => ({ kind: 'unavailable' }),
  completeSignIn: async () => {
    throw notConfigured();
  },
  refresh: async () => {
    throw notConfigured();
  },
  revoke: async () => {},
  getPrincipal: async () => null,
};
