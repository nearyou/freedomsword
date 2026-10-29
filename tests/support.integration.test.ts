import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import type { User } from '@prisma/client';
import { db } from '../backend/src/db';
import { changeSupport, readSupport, type SupportCommand } from '../backend/src/support';
import { verifyCitizen, signCitizenAgreement } from '../backend/src/verification';
import { sha256 } from '../backend/src/core/hash';
import { AGREEMENT_TEXT } from '../backend/src/core/agreement';
import * as time from '../backend/src/database-time';
import { listElections } from '../backend/src/elections';
import { exportElectionAudit } from '../backend/src/audit-export';
import { verifyAuditExport } from '../backend/src/core/audit-export';
import { castVote } from '../backend/src/voting';

if (process.env.INTEGRATION_TEST !== 'true') throw new Error('Use the isolated integration runner');
const electionId = `support-${randomUUID()}`;
const a = `${electionId}-a`, b = `${electionId}-b`;
let citizen: User, racing: User, unverified: User;
let now = new Date('2026-10-24T10:00:00Z');
async function enroll() {
  const user = await db.user.create({ data: { telegramId: `support-test:${randomUUID()}` } });
  await verifyCitizen(user);
  await signCitizenAgreement(user, sha256(AGREEMENT_TEXT));
  return user;
}
const command = (action: SupportCommand['action'], candidateId: string, units: number): SupportCommand =>
  ({ electionId, action, candidateId, units, requestId: randomUUID() });

beforeAll(async () => {
  citizen = await enroll(); racing = await enroll();
  unverified = await db.user.create({ data: { telegramId: `unverified:${randomUUID()}` } });
  await db.election.create({ data: { id: electionId, title: 'Reusable support integration',
    description: 'Test only', type: 'COMMUNITY', protocol: 'CONTINUOUS_SUPPORT', status: 'UPCOMING',
    opensAt: new Date('2020-01-01'), closesAt: new Date('2035-12-31') } });
  for (const [id, fullName] of [[a, 'Support Candidate A'], [b, 'Support Candidate B']])
    await db.candidate.create({ data: { id, electionId, fullName, party: 'Independent',
      ideology: 'Civic', bio: 'Fictional', color: '#1685e8' } });
  vi.spyOn(time, 'databaseNow').mockImplementation(async () => new Date(now));
});
afterAll(async () => {
  vi.restoreAllMocks();
  // Remove only this suite's time-travel fixtures from the isolated test database.
  await db.supportEvent.deleteMany({ where: { budget: { electionId } } });
  await db.supportWithdrawal.deleteMany({ where: { budget: { electionId } } });
  await db.supportAllocation.deleteMany({ where: { electionId } });
  await db.supportBudget.deleteMany({ where: { electionId } });
  await db.$disconnect();
});

it('supports full and arbitrary recalls, separate unlocks, partial reallocation and another recall', async () => {
  const first = command('allocate', a, 100);
  expect((await changeSupport(citizen, first)).activeUnits).toBe(100);
  expect((await changeSupport(citizen, first)).replayed).toBe(true);
  await expect(changeSupport(citizen, { ...first, units: 99 })).rejects.toThrow('Request ID');
  await expect(changeSupport(citizen, command('allocate', b, 1))).rejects.toThrow('Not enough');
  const withdrawn = await changeSupport(citizen, command('withdraw', a, 73));
  expect(withdrawn.activeUnits).toBe(27);
  expect(withdrawn.withdrawals[0].availableAt).toBe('2027-04-24T10:00:00.000Z');
  now = new Date('2026-10-25T10:00:00Z');
  expect((await changeSupport(citizen, command('withdraw', a, 27))).activeUnits).toBe(0);
  await expect(changeSupport(citizen, command('allocate', b, 1))).rejects.toThrow('Not enough');
  now = new Date('2027-04-24T09:59:59.999Z');
  expect((await readSupport(citizen, electionId)).availableUnits).toBe(0);
  now = new Date('2027-04-24T10:00:00Z');
  const unlocked = await readSupport(citizen, electionId);
  expect(unlocked.availableUnits).toBe(73);
  expect(unlocked.coolingUnits).toBe(27);
  await changeSupport(citizen, command('allocate', a, 30));
  await changeSupport(citizen, command('allocate', b, 43));
  now = new Date('2027-04-25T10:00:00Z');
  expect((await changeSupport(citizen, command('allocate', b, 27))).activeUnits).toBe(100);
  const secondCycle = await changeSupport(citizen, command('withdraw', b, 70));
  expect(secondCycle.activeUnits).toBe(30);
  expect(secondCycle.withdrawals).toEqual([{ units: 70, availableAt: '2027-10-25T10:00:00.000Z' }]);
  expect(await db.vote.count({ where: { electionId } })).toBe(0);
  expect(verifyAuditExport(await exportElectionAudit(electionId))).toBe(true);
}, 300_000);

it('serializes competing allocations without exceeding 100 units', async () => {
  const results = await Promise.allSettled([
    changeSupport(racing, command('allocate', a, 70)), changeSupport(racing, command('allocate', b, 70)),
  ]);
  expect(results.filter((entry) => entry.status === 'fulfilled')).toHaveLength(1);
  const state = await readSupport(racing, electionId);
  expect(state.activeUnits).toBe(70);
  expect(state.availableUnits).toBe(30);
  const shown = (await listElections()).find((entry) => entry.id === electionId);
  expect(shown?.activeUnits).toBe(100);
  expect(shown?.ballotCount).toBe(2);
});

it('rejects legacy ballots, missing eligibility and oversized recalls', async () => {
  await expect(castVote(citizen, { electionId, candidateId: a, requestId: randomUUID() }))
    .rejects.toThrow('reusable-support API');
  await expect(changeSupport(unverified, command('allocate', a, 10))).rejects.toThrow('verification');
  await expect(changeSupport(citizen, command('withdraw', a, 31))).rejects.toThrow('exceeds');
  await expect(changeSupport(citizen, command('allocate', b, 0))).rejects.toThrow('between 1 and 100');
});

it('allows recalling existing support after a candidate withdraws, but rejects new allocations', async () => {
  await db.candidate.update({ where: { id: a }, data: { withdrawn: true } });
  await expect(changeSupport(racing, command('allocate', a, 1))).rejects.toThrow('Candidate');
  expect((await changeSupport(citizen, command('withdraw', a, 30))).activeUnits).toBe(0);
});

it('recalls a quarter at a time to zero and restores those units only after their six-month timers', async () => {
  const user = await enroll();
  const withdrawnAt = new Date(now);
  await changeSupport(user, command('allocate', b, 100));
  for (const expected of [75, 50, 25, 0]) {
    const request = command('withdraw', b, 25);
    expect((await changeSupport(user, request)).activeUnits).toBe(expected);
    expect((await changeSupport(user, request)).replayed).toBe(true);
  }
  expect(await readSupport(user, electionId)).toMatchObject({ activeUnits: 0, coolingUnits: 100, availableUnits: 0 });
  await expect(changeSupport(user, command('allocate', b, 25))).rejects.toThrow('Not enough');
  const unlock = new Date(withdrawnAt);
  unlock.setUTCMonth(unlock.getUTCMonth() + 6);
  now = new Date(unlock.getTime() - 1);
  expect((await readSupport(user, electionId)).availableUnits).toBe(0);
  now = unlock;
  for (const expected of [25, 50, 75, 100])
    expect((await changeSupport(user, command('allocate', b, 25))).activeUnits).toBe(expected);
  expect((await changeSupport(user, command('withdraw', b, 100))).activeUnits).toBe(0);
  expect((await readSupport(user, electionId)).availableUnits).toBe(0);
});
