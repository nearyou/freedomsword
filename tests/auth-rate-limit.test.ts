import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('limits sign-in per verified Telegram account, not through one shared bucket', () => {
  const source = readFileSync('backend/src/routes/auth.ts', 'utf8');
  expect(source).not.toContain("'global'");
  const limit = source.indexOf("enforceRateLimitAsync('auth', telegramId");
  expect(limit).toBeGreaterThan(source.indexOf('validateInitData('));
});
