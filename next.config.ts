import type { NextConfig } from 'next';

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

/** The e2e build (EDULYNK_E2E_BUILD=include) is emitted to `.next-e2e` without standalone output for `next start`. */
export default function config(): NextConfig {
  const isE2eBuild = process.env.EDULYNK_E2E_BUILD === 'include';
  return {
    distDir: isE2eBuild ? '.next-e2e' : '.next',
    output: isE2eBuild ? undefined : 'standalone',
    poweredByHeader: false,
    reactStrictMode: true,
    productionBrowserSourceMaps: false,
    async headers() {
      return [{ source: '/:path*', headers: securityHeaders }];
    },
  };
}
