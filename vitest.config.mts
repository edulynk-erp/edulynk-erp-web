import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const root = import.meta.dirname;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'server-only': path.join(root, 'tests/support/empty-module.ts'),
      '@edulynk/demo-identity-adapter': path.join(root, 'src/server/auth/adapters/demo.ts'),
      '@edulynk/demo-services': path.join(root, 'src/demo/index.ts'),
      '@': path.join(root, 'src'),
    },
  },
  test: {
    globals: true,
    restoreMocks: true,
    unstubEnvs: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'component',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
          setupFiles: ['./vitest.setup.ts'],
        },
      },
    ],
  },
});
