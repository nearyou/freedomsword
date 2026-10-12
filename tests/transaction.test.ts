import { expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { retryableConflict } from '../src/backend/transaction';
it('retries MongoDB write conflicts, timeouts and labeled transient transaction errors', () => {
  const error = (code: string) =>
    new Prisma.PrismaClientKnownRequestError('conflict', {
      code,
      clientVersion: '6',
    });
  expect(retryableConflict(error('P2034'))).toBe(true);
  expect(retryableConflict(error('P2002'))).toBe(true);
  expect(retryableConflict(error('P2028'))).toBe(true);
  expect(retryableConflict(new Prisma.PrismaClientKnownRequestError('transient', {
    code: 'P2010', clientVersion: '6', meta: { message: 'TransientTransactionError' },
  }))).toBe(true);
  expect(retryableConflict(error('P2010'))).toBe(false);
  expect(retryableConflict(new Error('network'))).toBe(false);
});
