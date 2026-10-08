import { expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { retryableConflict } from '../src/server/transaction';
it('retries ORM and raw PostgreSQL serialization/deadlock conflicts only', () => {
  const error = (code: string, sql?: string) =>
    new Prisma.PrismaClientKnownRequestError('conflict', {
      code,
      clientVersion: '6',
      meta: { code: sql },
    });
  expect(retryableConflict(error('P2034'))).toBe(true);
  expect(retryableConflict(error('P2010', '40001'))).toBe(true);
  expect(retryableConflict(error('P2010', '40P01'))).toBe(true);
  expect(retryableConflict(error('P2002'))).toBe(false);
  expect(retryableConflict(error('P2010', '23514'))).toBe(false);
  expect(retryableConflict(new Error('network'))).toBe(false);
});
it('handles PostgreSQL JavaScript driver conflict metadata', () => {
  const error = new Prisma.PrismaClientKnownRequestError('conflict', {
    code: 'P2010',
    clientVersion: '6',
    meta: {
      driverAdapterError: { cause: { originalCode: '40001', kind: 'TransactionWriteConflict' } },
    },
  });
  expect(retryableConflict(error)).toBe(true);
});
