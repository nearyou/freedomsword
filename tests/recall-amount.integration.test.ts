import { randomUUID } from 'node:crypto';
import { afterAll, expect, it } from 'vitest';
import { db } from '../backend/src/db';
import { castVote, recallVote } from '../backend/src/voting';
import { verifyCitizen, signCitizenAgreement } from '../backend/src/verification';
import { AGREEMENT_TEXT } from '../backend/src/core/agreement';
import { sha256 } from '../backend/src/core/hash';

if (process.env.INTEGRATION_TEST !== 'true') throw new Error('Use the isolated integration runner');
afterAll(async () => { await db.$disconnect(); });

it('records a selected 50-unit recall once and rejects changed retries and overspending', async () => {
  const electionId = `recall-${randomUUID()}`, candidateId = `candidate-${randomUUID()}`;
  const citizen = await db.user.create({ data: { telegramId: `recall:${randomUUID()}` } });
  await verifyCitizen(citizen);
  await signCitizenAgreement(citizen, sha256(AGREEMENT_TEXT));
  await db.election.create({ data: { id: electionId, title: 'Isolated recall test', description: 'Test only',
    type: 'COUNCIL', protocol: 'LEGACY_RECALL', status: 'ACTIVE',
    opensAt: new Date(Date.now() - 60_000), closesAt: new Date(Date.now() + 3_600_000) } });
  await db.candidate.create({ data: { id: candidateId, electionId, fullName: 'Test candidate',
    party: 'Independent', ideology: 'Test', bio: 'Test only', color: '#1685e8' } });
  await castVote(citizen, { electionId, candidateId, requestId: randomUUID() });
  const command = { electionId, mode: 'partial' as const, units: 50, requestId: randomUUID() };
  expect(await recallVote(citizen, command)).toMatchObject({ balance: 50, recalled: 50, replayed: false });
  expect(await recallVote(citizen, command)).toMatchObject({ balance: 50, recalled: 50, replayed: true });
  await expect(recallVote(citizen, { ...command, units: 75 })).rejects.toThrow('different action');
  await expect(recallVote(citizen, { ...command, units: 75, requestId: randomUUID() })).rejects.toThrow('below');
  const ballot = await db.vote.findFirstOrThrow({ where: { electionId }, include: { events: true } });
  expect(ballot.events.filter((event) => event.type === 'RECALL')).toHaveLength(1);
  expect(ballot.events.reduce((sum, event) => sum + event.units, 0)).toBe(ballot.balance);
});
