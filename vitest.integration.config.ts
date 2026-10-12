import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: { alias: {
    '@backend': fileURLToPath(new URL('./backend/src', import.meta.url)),
    '@frontend': fileURLToPath(new URL('./frontend/src', import.meta.url)),
  } },
  test: {
    environment: 'node',
    pool: 'threads',
    include: ['tests/**/*.integration.test.ts'],
    fileParallelism: false,
    testTimeout: 120000,
    hookTimeout: 120000,
  },
});
