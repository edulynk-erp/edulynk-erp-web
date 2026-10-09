import 'server-only';
import { cache } from 'react';
import { DEFAULT_BRANDING, type Branding } from '@/config/branding';

/**
 * Resolves the branding for the current request. How an institution is identified from the request (custom domain,
 * subdomain or signed-in tenant) and where its branding comes from are not yet decided, so every request receives the
 * neutral default. Replace this function once the branding contract is approved; callers do not change.
 */
export const getBranding = cache(async (): Promise<Branding> => DEFAULT_BRANDING);
