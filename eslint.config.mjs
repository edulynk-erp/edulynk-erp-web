import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'react/no-danger': 'error',
    },
  },
  {
    files: ['src/**'],
    ignores: ['src/demo/store/persistence.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='localStorage'], MemberExpression[object.name='sessionStorage']",
          message:
            'Do not use browser storage; session material lives only in the encrypted HttpOnly cookie. Demo records persist only through src/demo/store/persistence.ts.',
        },
      ],
    },
  },
  {
    files: ['src/components/**', 'src/features/**', 'src/app/**', 'src/lib/**', 'src/services/**', 'src/config/**'],
    ignores: ['src/app/**/route.ts', 'src/services/registry.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'zod',
              message:
                "Import z from '@/lib/validation/zod' (jitless), otherwise schemas trigger CSP eval violations in the browser.",
            },
          ],
          patterns: [
            {
              group: ['@/server/auth/adapters/*', '@edulynk/demo-identity-adapter'],
              message: 'Identity adapters are only reachable through src/server/auth/adapter.ts.',
            },
            {
              group: ['@/demo/*', '@edulynk/demo-services'],
              message: 'Mock data is only reachable through the service registry (src/services/registry.ts).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/**/route.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/server/auth/adapters/*',
                '@edulynk/demo-identity-adapter',
                '@/demo/*',
                '@edulynk/demo-services',
              ],
              message: 'Route handlers use src/server/auth/adapter.ts; mock data is never served from route handlers.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/lib/validation/zod.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  globalIgnores([
    '.next/**',
    '.next-demo/**',
    '.next-e2e/**',
    'out/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'next-env.d.ts',
  ]),
]);
