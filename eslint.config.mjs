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
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='localStorage'], MemberExpression[object.name='sessionStorage']",
          message: 'Do not use browser storage; session material lives only in the encrypted HttpOnly cookie.',
        },
      ],
    },
  },
  {
    files: ['src/components/**', 'src/features/**', 'src/app/**', 'src/lib/**'],
    ignores: ['src/app/**/route.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/server/auth/adapters/*'],
              message: 'Identity adapters are only reachable through src/server/auth/adapter.ts.',
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    '.next/**',
    '.next-e2e/**',
    'out/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'next-env.d.ts',
  ]),
]);
