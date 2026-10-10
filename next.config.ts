import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  // No `preload`: HSTS preload is deferred. Browsers ignore this header over plain HTTP.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

/**
 * Demo mode (mock data, simulated onboarding and the demo identity adapter) is selected at build time, not at runtime.
 * `@edulynk/demo-identity-adapter` and `@edulynk/demo-services` point at the real demo modules only under `next dev` or
 * an explicit demo build (EDULYNK_DEMO_BUILD=include), which is emitted to `.next-demo` without standalone output so
 * the Dockerfile cannot package it. Every other build resolves both to inert stubs, so no fixture reaches the compiled
 * output; `npm run verify:production-build` proves this.
 */
const DEMO_ALIASES = {
  '@edulynk/demo-identity-adapter': {
    included: './src/server/auth/adapters/demo.ts',
    excluded: './src/server/auth/adapters/demo.excluded.ts',
  },
  '@edulynk/demo-services': {
    included: './src/demo/index.ts',
    excluded: './src/demo/excluded.ts',
  },
} as const;

export default function config(phase: string): NextConfig {
  const isDemoBuild = process.env.EDULYNK_DEMO_BUILD === 'include';
  const includeDemo = phase === PHASE_DEVELOPMENT_SERVER || isDemoBuild;

  if (isDemoBuild && (process.env.APP_ENV === 'staging' || process.env.APP_ENV === 'production')) {
    throw new Error('EDULYNK_DEMO_BUILD=include is not permitted when APP_ENV is staging or production.');
  }

  return {
    distDir: isDemoBuild ? '.next-demo' : '.next',
    output: isDemoBuild ? undefined : 'standalone',
    poweredByHeader: false,
    reactStrictMode: true,
    productionBrowserSourceMaps: false,
    turbopack: {
      resolveAlias: Object.fromEntries(
        Object.entries(DEMO_ALIASES).map(([alias, target]) => [alias, includeDemo ? target.included : target.excluded]),
      ),
    },
    async headers() {
      return [{ source: '/:path*', headers: securityHeaders }];
    },
    async redirects() {
      return [{ source: '/institution', destination: '/institution-setup', permanent: true }];
    },
  };
}
