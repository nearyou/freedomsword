import { afterEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  settle: vi.fn(async () => {}),
  add: vi.fn(async () => {}),
  redis: null as unknown,
}));
vi.mock('@backend/blockchain', () => ({ settleOutbox: mocks.settle }));
vi.mock('@backend/redis', () => ({ redisClient: () => mocks.redis }));
vi.mock('bullmq', () => ({ Queue: class { add = mocks.add; } }));
import { afterCommittedOutbox } from '../backend/src/outbox-queue';

afterEach(() => {
  vi.unstubAllEnvs();
  mocks.settle.mockClear();
  mocks.add.mockClear();
  mocks.redis = null;
});

it('does not wait for chain RPC when a continuous worker owns the durable outbox', async () => {
  vi.stubEnv('OUTBOX_PROCESSING', 'worker');
  await afterCommittedOutbox();
  expect(mocks.settle).not.toHaveBeenCalled();
});

it('queues a chain wake-up after the MongoDB commit when Redis is ready', async () => {
  vi.stubEnv('OUTBOX_PROCESSING', 'worker');
  mocks.redis = {};
  await afterCommittedOutbox();
  expect(mocks.add).toHaveBeenCalledOnce();
  expect(mocks.settle).not.toHaveBeenCalled();
});

it('processes the outbox inline when no continuous worker is configured', async () => {
  vi.stubEnv('OUTBOX_PROCESSING', 'inline');
  await afterCommittedOutbox();
  expect(mocks.settle).toHaveBeenCalledOnce();
});
