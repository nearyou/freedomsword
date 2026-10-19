import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: { alias: {
    '@backend': fileURLToPath(new URL('./backend/src', import.meta.url)),
    '@frontend': fileURLToPath(new URL('./frontend/src', import.meta.url)),
  } },
  test: {
    environment: 'node',
    env: { RATE_LIMIT_BACKEND: 'memory' },
    pool: 'threads',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/**/*.integration.test.ts'],
  },
});
