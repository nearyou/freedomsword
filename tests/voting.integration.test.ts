import { createHmac, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { User } from '@prisma/client';
import { db } from '../src/server/db';
import { castVote, recallVote } from '../src/server/voting';
import { verifyCitizen, signCitizenAgreement } from '../src/server/verification';
import { signPlatform } from '../src/server/platforms';
import { flushOutbox } from '../src/server/blockchain';
import { listElections } from '../src/server/elections';
import { sha256, ballotPseudonym } from '../src/lib/hash';
import { AGREEMENT_TEXT } from '../src/lib/agreement';
import { verifyAuditSegment } from '../src/lib/audit-chain';
import { secret } from '../src/server/secrets';
import { credentialPseudonym, privateBallotPseudonyms } from '../src/server/credentials';
import { POST as authenticate } from '../src/app/api/auth/route';
import { GET as privateMe } from '../src/app/api/me/route';
import { createSession } from '../src/lib/session';
import { NextRequest } from 'next/server';
import { GET as ready } from '../src/app/api/ready/route';
import { GET as publicAudit } from '../src/app/api/audit/route';
import { GET as adminList, POST as adminPost } from '../src/app/api/admin/elections/route';
import { administer } from '../src/server/admin';
import { sessionCookieName } from '../src/server/auth';
import { GET as publicTransparency } from '../src/app/api/elections/[id]/transparency/route';
import { GET as publicExport } from '../src/app/api/elections/[id]/audit-export/route';
import { verifyAuditExport } from '../src/lib/audit-export';
import { PostgresRateLimitStore } from '../src/server/rate-limit';
import { PostgresCommitmentOutboxStore } from '../src/server/outbox-store';
import { appendAudit } from '../src/server/audit';
import { GET as adminMetrics } from '../src/app/api/admin/metrics/route';
import { verifyDatabaseEvidence } from '../src/server/integrity-check';
if (process.env.INTEGRATION_TEST !== 'true')
  throw new Error('Run npm run test:integration to use an isolated temporary database');
const electionId = 'council-2026';
let citizen: User, racing: User, full: User, unverified: User;
async function pseudonymFor(user: User, electionId: string) {
  const credential = await db.votingCredential.findUniqueOrThrow({
    where: { userId_electionId: { userId: user.id, electionId } },
  });
  return credentialPseudonym(credential, electionId);
}
async function enroll(label: string) {
  const user = await db.user.create({ data: { telegramId: `test:${label}:${randomUUID()}` } });
  await verifyCitizen(user);
  await signCitizenAgreement(user, sha256(AGREEMENT_TEXT));
  return user;
}
const cast = (user: User, candidateId = 'maya', requestId = randomUUID()) =>
  castVote(user, { electionId, candidateId, requestId });
const recall = (user: User, mode: 'partial' | 'full' = 'partial', requestId = randomUUID()) =>
  recallVote(user, { electionId, mode, requestId });
beforeAll(async () => {
  citizen = await enroll('citizen');
  racing = await enroll('racing');
  full = await enroll('full');
  unverified = await db.user.create({ data: { telegramId: `test:unverified:${randomUUID()}` } });
});
afterAll(async () => {
  await db.$disconnect();
});

it('requires an explicit election manager grant and audits each management action', async () => {
  const manager = await db.user.create({ data: { telegramId: `test:manager:${randomUUID()}` } });
  const request = () => new NextRequest('http://127.0.0.1:3000/api/admin/elections', {
    headers: { cookie: `${sessionCookieName()}=${createSession(manager.id, manager.sessionVersion, secret('SESSION_SECRET'))}` },
  });
  expect((await adminList(request())).status).toBe(403);
  expect((await adminMetrics(request())).status).toBe(403);
  await db.adminGrant.create({ data: { userId: manager.id, role: 'ELECTION_MANAGER' } });
  const before = await db.auditEvent.count();
  const starts = '2032-01-01T00:00:00Z';
  const ends = '2032-02-01T00:00:00Z';
  const created = await administer(manager.id, { action: 'create', title: 'Test election',
    description: 'A fictional test', type: 'COMMUNITY', opensAt: starts, closesAt: ends });
  const electionId = created.electionId;
  await administer(manager.id, { action: 'recallPolicy', electionId,
    recallEnabled: true, fullRecallEnabled: true, partialRecallEnabled: true,
    partialRecallAmount: 30, firstRecallDelaySeconds: 0,
    recallCooldownSeconds: 0, maxRecallOperations: 3 });
  await administer(manager.id, { action: 'edit', electionId, title: 'Revised test election',
    description: 'A fictional test', type: 'COUNCIL', opensAt: starts, closesAt: ends });
  for (const fullName of ['First Candidate', 'Second Candidate'])
    await administer(manager.id, { action: 'addCandidate', electionId, fullName,
      party: 'Independent', ideology: 'Civic', bio: 'Fictional', color: '#3377cc' });
  const candidates = await db.candidate.findMany({ where: { electionId }, orderBy: { fullName: 'asc' } });
  await administer(manager.id, { action: 'platform', electionId, candidateId: candidates[0].id,
    title: 'Version 1', content: 'A signed platform' });
  const platform = await db.candidatePlatform.findFirstOrThrow({ where: { candidateId: candidates[0].id } });
  await administer(manager.id, { action: 'promise', electionId, platformId: platform.id, title: 'Public promise' });
  await administer(manager.id, { action: 'removeCandidate', electionId, candidateId: candidates[1].id });
  await expect(administer(manager.id, { action: 'activate', electionId })).rejects.toThrow('two candidates');
  await administer(manager.id, { action: 'addCandidate', electionId, fullName: 'Third Candidate',
    party: 'Independent', ideology: 'Civic', bio: 'Fictional', color: '#3377cc' });
  await administer(manager.id, { action: 'activate', electionId });
  await expect(administer(manager.id, { action: 'edit', electionId, title: 'Unsafe edit',
    description: 'Changed', type: 'COUNCIL', opensAt: starts, closesAt: ends })).rejects.toThrow('can no longer');
  await expect(administer(manager.id, { action: 'recallPolicy', electionId,
    recallEnabled: false, fullRecallEnabled: false, partialRecallEnabled: false,
    partialRecallAmount: 1, firstRecallDelaySeconds: 0,
    recallCooldownSeconds: 0, maxRecallOperations: null })).rejects.toThrow('can no longer');
  const activeId = `manager-active-${randomUUID()}`;
  await db.election.create({ data: { id: activeId, title: 'Active fixture', description: 'Fictional',
    type: 'COUNCIL', status: 'ACTIVE', opensAt: new Date('2020-01-01T00:00:00Z'),
    closesAt: new Date('2032-01-01T00:00:00Z') } });
  await administer(manager.id, { action: 'close', electionId: activeId });
  await expect(administer(manager.id, { action: 'addCandidate', electionId: activeId, fullName: 'Late Candidate',
    party: 'Independent', ideology: 'Civic', bio: 'Fictional', color: '#3377cc' })).rejects.toThrow('can no longer');
  expect(await db.auditEvent.count()).toBe(before + 11);
  const response = await adminList(request());
  expect(response.status).toBe(200);
  expect((await adminMetrics(request())).status).toBe(200);
  const publicResult = JSON.stringify(await response.json());
  expect(publicResult).toContain('Revised test election');
  expect(publicResult).not.toContain(manager.telegramId);
  const unauthorizedPost = await adminPost(new NextRequest('http://127.0.0.1:3000/api/admin/elections', {
    method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' },
    body: JSON.stringify({ action: 'close', electionId }),
  }));
  expect(unauthorizedPost.status).toBe(401);
  const citizenPost = await adminPost(new NextRequest('http://127.0.0.1:3000/api/admin/elections', {
    method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000',
      cookie: `${sessionCookieName()}=${createSession(citizen.id, citizen.sessionVersion, secret('SESSION_SECRET'))}` },
    body: JSON.stringify({ action: 'close', electionId }),
  }));
  expect(citizenPost.status).toBe(403);
  const forgedRole = await adminPost(new NextRequest('http://127.0.0.1:3000/api/admin/elections', {
    method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000',
      cookie: `${sessionCookieName()}=${createSession(citizen.id, citizen.sessionVersion, secret('SESSION_SECRET'))}` },
    body: JSON.stringify({ action: 'close', electionId, role: 'ELECTION_MANAGER', userId: citizen.id }),
  }));
  expect(forgedRole.status).toBe(400);
  expect(await db.adminGrant.count({ where: { userId: citizen.id } })).toBe(0);
  expect((await db.election.findUniqueOrThrow({ where: { id: electionId } })).status).toBe('UPCOMING');
});

it('archives naturally expired elections through the required persisted state transition', async () => {
  const before = await db.auditEvent.count();
  for (const status of ['ACTIVE', 'UPCOMING'] as const) {
    const electionId = `archive-expired-${randomUUID()}`;
    await db.election.create({ data: { id: electionId, title: 'Expired fixture',
      description: 'Fictional', type: 'COUNCIL', status,
      opensAt: new Date(Date.now() - 120_000), closesAt: new Date(Date.now() - 60_000) } });
    await administer(citizen.id, { action: 'archive', electionId });
    expect((await db.election.findUniqueOrThrow({ where: { id: electionId } })).status).toBe('ARCHIVED');
  }
  expect(await db.auditEvent.count()).toBe(before + 2);
});

it('activates drafts within their window and allows expired drafts to be rescheduled', async () => {
  for (const expired of [false, true]) {
    const electionId = `late-draft-${randomUUID()}`;
    const candidateId = randomUUID();
    await db.election.create({ data: { id: electionId, title: 'Late draft fixture',
      description: 'Fictional', type: 'COMMUNITY', status: 'DRAFT',
      opensAt: new Date(Date.now() - 120_000),
      closesAt: new Date(Date.now() + (expired ? -60_000 : 3_600_000)) } });
    for (const id of [candidateId, randomUUID()])
      await administer(citizen.id, { action: 'addCandidate', electionId, fullName: id,
        party: 'Independent', ideology: 'Civic', bio: 'Fictional', color: '#3377cc' });
    if (expired) {
      await expect(administer(citizen.id, { action: 'activate', electionId })).rejects.toThrow('Reschedule');
      await administer(citizen.id, { action: 'edit', electionId, title: 'Rescheduled draft',
        description: 'Fictional', type: 'COMMUNITY',
        opensAt: new Date(Date.now() + 3_600_000).toISOString(),
        closesAt: new Date(Date.now() + 7_200_000).toISOString() });
    }
    await administer(citizen.id, { action: 'activate', electionId });
    expect((await db.election.findUniqueOrThrow({ where: { id: electionId } })).status)
      .toBe(expired ? 'UPCOMING' : 'ACTIVE');
  }
});

it('rejects draft, pre-window and expired ballots at the database-controlled boundary', async () => {
  const user = await enroll('boundary');
  const now = Date.now();
  async function fixture(opensAt: Date, closesAt: Date, status: 'DRAFT' | 'UPCOMING' | 'ACTIVE') {
    const electionId = `boundary-${randomUUID()}`;
    const candidateId = `boundary-candidate-${randomUUID()}`;
    await db.election.create({ data: { id: electionId, title: 'Boundary test', description: 'Fictional',
      type: 'COUNCIL', status: 'DRAFT', opensAt, closesAt } });
    await db.candidate.create({ data: { id: candidateId, electionId, fullName: 'Boundary Candidate',
      party: 'Independent', ideology: 'Civic', bio: 'Fictional', color: '#3377cc' } });
    if (status !== 'DRAFT') await db.election.update({ where: { id: electionId }, data: { status } });
    return { electionId, candidateId, request: () => castVote(user, { electionId, candidateId, requestId: randomUUID() }) };
  }
  const draft = await fixture(new Date(now - 60_000), new Date(now + 60_000), 'DRAFT');
  await expect(draft.request()).rejects.toThrow('not open');
  const future = await fixture(new Date(now + 60_000), new Date(now + 120_000), 'UPCOMING');
  await expect(future.request()).rejects.toThrow('not open');
  const expired = await fixture(new Date(now - 120_000), new Date(now - 60_000), 'ACTIVE');
  await expect(expired.request()).rejects.toThrow('not open');
  const live = await fixture(new Date(now - 60_000), new Date(now + 60_000), 'UPCOMING');
  expect((await live.request()).balance).toBe(100);
  expect((await db.election.findUniqueOrThrow({ where: { id: live.electionId } })).status).toBe('ACTIVE');
  await db.election.update({ where: { id: live.electionId }, data: { status: 'FINISHED' } });
  await expect(recallVote(user, { electionId: live.electionId, mode: 'partial', requestId: randomUUID() })).rejects.toThrow('not open');
});

it('serializes an administrative close with a concurrent cast', async () => {
  const user = await enroll('closing-race');
  const electionId = `closing-${randomUUID()}`;
  const candidateId = `closing-candidate-${randomUUID()}`;
  await db.election.create({ data: { id: electionId, title: 'Closing race', description: 'Fictional',
    type: 'COUNCIL', status: 'DRAFT', opensAt: new Date('2020-01-01T00:00:00Z'),
    closesAt: new Date('2032-01-01T00:00:00Z') } });
  await db.candidate.create({ data: { id: candidateId, electionId, fullName: 'Closing Candidate',
    party: 'Independent', ideology: 'Civic', bio: 'Fictional', color: '#3377cc' } });
  await db.election.update({ where: { id: electionId }, data: { status: 'ACTIVE' } });
  const outcomes = await Promise.allSettled([
    castVote(user, { electionId, candidateId, requestId: randomUUID() }),
    administer(user.id, { action: 'close', electionId }),
  ]);
  expect(outcomes[1].status).toBe('fulfilled');
  expect((await db.election.findUniqueOrThrow({ where: { id: electionId } })).status).toBe('FINISHED');
  expect(await db.vote.count({ where: { electionId } })).toBe(outcomes[0].status === 'fulfilled' ? 1 : 0);
  await expect(castVote(user, { electionId, candidateId, requestId: randomUUID() })).rejects.toThrow('not open');
});

it('enforces a custom recall amount and operation limit in the vote transaction', async () => {
  const user = await enroll('custom-recall');
  const electionId = `custom-recall-${randomUUID()}`;
  const candidateId = `custom-candidate-${randomUUID()}`;
  await db.election.create({ data: { id: electionId, title: 'Custom recall', description: 'Fictional',
    type: 'COMMUNITY', status: 'DRAFT', opensAt: new Date('2020-01-01T00:00:00Z'),
    closesAt: new Date('2032-01-01T00:00:00Z'), partialRecallAmount: 30,
    maxRecallOperations: 2, fullRecallEnabled: false } });
  await db.candidate.create({ data: { id: candidateId, electionId, fullName: 'Custom Candidate',
    party: 'Independent', ideology: 'Civic', bio: 'Fictional', color: '#3377cc' } });
  await db.election.update({ where: { id: electionId }, data: { status: 'ACTIVE' } });
  await castVote(user, { electionId, candidateId, requestId: randomUUID() });
  await expect(recallVote(user, { electionId, mode: 'full', requestId: randomUUID() })).rejects.toThrow('disabled');
  const first = randomUUID();
  expect((await recallVote(user, { electionId, mode: 'partial', requestId: first })).balance).toBe(70);
  expect((await recallVote(user, { electionId, mode: 'partial', requestId: first })).replayed).toBe(true);
  expect((await recallVote(user, { electionId, mode: 'partial', requestId: randomUUID() })).balance).toBe(40);
  await expect(recallVote(user, { electionId, mode: 'partial', requestId: randomUUID() })).rejects.toThrow('limit');
  const vote = await db.vote.findFirstOrThrow({ where: { electionId }, include: { events: true } });
  expect(vote.balance).toBe(40);
  expect(vote.events.map((event) => event.units).sort((a, b) => a - b)).toEqual([-30, -30, 100]);
});

it('publishes election aggregates and commitments without private ballot or identity fields', async () => {
  const user = await enroll('transparency');
  const electionId = 'community-2026';
  const candidate = await db.candidate.findFirstOrThrow({ where: { electionId } });
  const requestId = randomUUID();
  await castVote(user, { electionId, candidateId: candidate.id, requestId });
  await recallVote(user, { electionId, mode: 'partial', requestId: randomUUID() });
  const response = await publicTransparency(new Request(`http://127.0.0.1:3000/api/elections/${electionId}/transparency`),
    { params: Promise.resolve({ id: electionId }) });
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.totals).toMatchObject({ voteUnitsCast: 100, recalledUnits: 25, activeUnits: 75, participation: 1 });
  expect(data.audit.recentEvents.length).toBeGreaterThanOrEqual(2);
  expect(data.candidates[0].platforms[0].contentHash).toMatch(/^[a-f0-9]{64}$/);
  const credential = await db.votingCredential.findUniqueOrThrow({ where: { userId_electionId: { userId: user.id, electionId } } });
  const serialized = JSON.stringify(data);
  for (const secretValue of [user.id, user.telegramId, credential.token,
    credentialPseudonym(credential, electionId), requestId])
    expect(serialized).not.toContain(secretValue);
  for (const forbiddenKey of ['telegramId', 'userId', 'pseudonym', 'session', 'subjectCommitment']) {
    expect(serialized).not.toContain(`"${forbiddenKey}"`);
  }
  const exportResponse = await publicExport(new Request(`http://127.0.0.1:3000/api/elections/${electionId}/audit-export`),
    { params: Promise.resolve({ id: electionId }) });
  expect(exportResponse.status).toBe(200);
  const auditBundle = await exportResponse.json();
  expect(verifyAuditExport(auditBundle)).toBe(true);
  const exportText = JSON.stringify(auditBundle);
  for (const secretValue of [user.id, user.telegramId, credential.token,
    credentialPseudonym(credential, electionId), requestId])
    expect(exportText).not.toContain(secretValue);
});
describe('PostgreSQL ballots', () => {
  it('issues opaque, election-scoped credentials without changing the public ballot shape', async () => {
    // A ballot created later in this suite uses a random election credential, not the old user key.
    const user = await enroll('credential');
    await cast(user);
    await castVote(user, {
      electionId: 'budget-2026',
      candidateId: 'leo',
      requestId: randomUUID(),
    });
    const credentials = await db.votingCredential.findMany({ where: { userId: user.id } });
    expect(credentials).toHaveLength(2);
    expect(credentials[0].token).toMatch(/^[a-f0-9]{64}$/);
    expect(credentials[0].token).not.toBe(credentials[1].token);
    for (const credential of credentials) {
      const pseudonym = credentialPseudonym(credential, credential.electionId);
      expect(pseudonym).not.toBe(
        ballotPseudonym(user.voterKey, credential.electionId, secret('BALLOT_SECRET')),
      );
      expect(await db.vote.count({ where: { electionId: credential.electionId, pseudonym } })).toBe(
        1,
      );
    }
    await expect(cast(user, 'alex')).rejects.toThrow('already cast');
    const publicData = JSON.stringify(await listElections());
    expect(publicData).not.toContain(user.telegramId);
    expect(publicData).not.toContain(credentials[0].token);
  });
  it('requires verification and an exact citizen agreement', async () => {
    await expect(cast(unverified)).rejects.toThrow('verification');
    await verifyCitizen(unverified);
    await expect(cast(unverified)).rejects.toThrow('agreement');
    await expect(signCitizenAgreement(unverified, 'a'.repeat(64))).rejects.toThrow(
      'Agreement changed',
    );
  });
  it('rejects cross-election candidate and non-open elections', async () => {
    await expect(cast(citizen, 'leo')).rejects.toThrow('does not belong');
    await expect(
      castVote(citizen, { electionId: 'missing', candidateId: 'maya', requestId: randomUUID() }),
    ).rejects.toThrow('not open');
  });
  it('casts exactly once and safely replays the same request', async () => {
    const requestId = randomUUID();
    expect((await cast(citizen, 'maya', requestId)).balance).toBe(100);
    expect((await cast(citizen, 'maya', requestId)).replayed).toBe(true);
    await expect(cast(citizen, 'alex')).rejects.toThrow('already cast');
    await expect(cast(citizen, 'alex', requestId)).rejects.toThrow('already cast');
  });
  it('appends four recalls without negative balances or re-casting', async () => {
    const requestId = randomUUID();
    expect((await recall(citizen, 'partial', requestId)).balance).toBe(75);
    expect((await recall(citizen, 'partial', requestId)).balance).toBe(75);
    await expect(recall(citizen, 'full', requestId)).rejects.toThrow('different action');
    for (const expected of [50, 25, 0]) expect((await recall(citizen)).balance).toBe(expected);
    await expect(recall(citizen)).rejects.toThrow('fully recalled');
    await expect(cast(citizen)).rejects.toThrow('already cast');
    const vote = await db.vote.findUniqueOrThrow({
      where: {
        electionId_pseudonym: {
          electionId,
          pseudonym: await pseudonymFor(citizen, electionId),
        },
      },
      include: { events: true },
    });
    expect(vote.events.map((e) => e.units).sort((a, b) => a - b)).toEqual([
      -25, -25, -25, -25, 100,
    ]);
    expect(vote.balance).toBe(0);
  });
  it('allows only one winning cast in a race', async () => {
    const outcomes = await Promise.allSettled([cast(racing, 'maya'), cast(racing, 'alex')]);
    expect(outcomes.filter((o) => o.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((o) => o.status === 'rejected')).toHaveLength(1);
  });
  it('serializes racing recalls at zero', async () => {
    const outcomes = await Promise.allSettled(Array.from({ length: 5 }, () => recall(racing)));
    expect(
      outcomes.filter((o) => o.status === 'fulfilled'),
      outcomes
        .filter((o) => o.status === 'rejected')
        .map((o) => JSON.stringify(o.reason))
        .join('\n'),
    ).toHaveLength(4);
    const vote = await db.vote.findUniqueOrThrow({
      where: {
        electionId_pseudonym: {
          electionId,
          pseudonym: await pseudonymFor(racing, electionId),
        },
      },
    });
    expect(vote.balance).toBe(0);
  });
  it('fully recalls a partially recalled ballot', async () => {
    await cast(full);
    await recall(full);
    const requestId = randomUUID();
    expect(await recall(full, 'full', requestId)).toMatchObject({ balance: 0, recalled: 75 });
    expect((await recall(full, 'full', requestId)).replayed).toBe(true);
  });
  it('allows one separate ballot per election and rejects expired eligibility', async () => {
    await castVote(full, {
      electionId: 'budget-2026',
      candidateId: 'leo',
      requestId: randomUUID(),
    });
    await db.voterVerification.update({
      where: { userId_provider: { userId: full.id, provider: 'MOCK' } },
      data: { expiresAt: new Date(0) },
    });
    await expect(
      recallVote(full, { electionId: 'budget-2026', mode: 'partial', requestId: randomUUID() }),
    ).rejects.toThrow('verification');
  });
  it('forbids event/audit mutation and detects projection divergence', async () => {
    const event = await db.voteEvent.findFirstOrThrow();
    const audit = await db.auditEvent.findFirstOrThrow();
    await expect(
      db.voteEvent.update({ where: { id: event.id }, data: { units: 75 } }),
    ).rejects.toThrow();
    await expect(db.voteEvent.delete({ where: { id: event.id } })).rejects.toThrow();
    await expect(
      db.auditEvent.update({ where: { id: audit.id }, data: { hash: 'f'.repeat(64) } }),
    ).rejects.toThrow();
    await expect(db.auditEvent.delete({ where: { id: audit.id } })).rejects.toThrow();
    const vote = await db.vote.findUniqueOrThrow({ where: { id: event.voteId } });
    await expect(
      db.vote.update({ where: { id: vote.id }, data: { balance: vote.balance === 0 ? 25 : 75 } }),
    ).rejects.toThrow();
    expect((await db.vote.findUniqueOrThrow({ where: { id: vote.id } })).balance).toBe(
      vote.balance,
    );
    await expect(
      db.vote.update({ where: { id: vote.id }, data: { candidateId: 'jordan' } }),
    ).rejects.toThrow();
  });
  it('rolls back ballot and ledger together on transaction failure', async () => {
    const before = await db.vote.count();
    await expect(
      db.$transaction(async (tx) => {
        await tx.vote.create({
          data: {
            electionId,
            candidateId: 'maya',
            pseudonym: randomUUID(),
            balance: 100,
            events: {
              create: {
                type: 'CAST',
                units: 100,
                requestId: randomUUID(),
                requestHash: 'a'.repeat(64),
              },
            },
          },
        });
        throw new Error('Injected failure');
      }),
    ).rejects.toThrow('Injected failure');
    expect(await db.vote.count()).toBe(before);
  });
});
it('recognizes a legacy ballot and binds it to an opaque credential on recall', async () => {
  const user = await enroll('legacy');
  const oldPseudonym = ballotPseudonym(user.voterKey, 'community-2026', secret('BALLOT_SECRET'));
  const candidate = await db.candidate.findFirstOrThrow({
    where: { electionId: 'community-2026' },
  });
  await db.vote.create({
    data: {
      electionId: 'community-2026',
      candidateId: candidate.id,
      pseudonym: oldPseudonym,
      events: {
        create: { type: 'CAST', units: 100, requestId: randomUUID(), requestHash: 'a'.repeat(64) },
      },
    },
  });
  const lookups = await db.$transaction((tx) =>
    privateBallotPseudonyms(tx, user, ['community-2026']),
  );
  expect(lookups[0].pseudonym).toBe(oldPseudonym);
  expect(
    (
      await recallVote(user, {
        electionId: 'community-2026',
        mode: 'partial',
        requestId: randomUUID(),
      })
    ).balance,
  ).toBe(75);
  const credential = await db.votingCredential.findUniqueOrThrow({
    where: { userId_electionId: { userId: user.id, electionId: 'community-2026' } },
  });
  expect(credential.legacyPseudonym).toBe(oldPseudonym);
  expect(credential.token).toMatch(/^[a-f0-9]{64}$/);
  await expect(
    db.votingCredential.update({ where: { id: credential.id }, data: { token: 'f'.repeat(64) } }),
  ).rejects.toThrow();
});
it('rejects duplicate provider subjects without exposing the subject', async () => {
  const a = await db.user.create({ data: { telegramId: `test:duplicate-a:${randomUUID()}` } });
  const b = await db.user.create({ data: { telegramId: `test:duplicate-b:${randomUUID()}` } });
  const provider = {
    name: 'TEST',
    verify: async () => ({ eligible: true, uniqueSubjectId: 'same-private-identity' }),
  };
  await verifyCitizen(a, provider);
  await expect(verifyCitizen(b, provider)).rejects.toMatchObject({ code: 'ELIGIBILITY_DUPLICATE' });
  expect(await db.voterVerification.count({ where: { provider: 'TEST' } })).toBe(1);
  expect(JSON.stringify(await db.auditEvent.findMany())).not.toContain('same-private-identity');
  const changed = {
    name: 'TEST',
    verify: async () => ({ eligible: true, uniqueSubjectId: 'different-identity' }),
  };
  await expect(verifyCitizen(a, changed)).rejects.toMatchObject({
    code: 'ELIGIBILITY_SUBJECT_CHANGED',
  });
  const original = await db.voterVerification.findUniqueOrThrow({
    where: { userId_provider: { userId: a.id, provider: 'TEST' } },
  });
  await expect(
    db.voterVerification.update({
      where: { id: original.id },
      data: { subjectCommitment: 'f'.repeat(64) },
    }),
  ).rejects.toThrow();
  await expect(db.voterVerification.delete({ where: { id: original.id } })).rejects.toThrow();
});
it('rejects replayed Telegram initData, including reordered fields', async () => {
  const bot = '123456:integration-token';
  vi.stubEnv('TELEGRAM_AUTH_ENABLED', 'true');
  vi.stubEnv('TELEGRAM_BOT_TOKEN', bot);
  try {
    const params = new URLSearchParams({
      auth_date: String(Math.floor(Date.now() / 1000)),
      user: JSON.stringify({ id: 987654321 }),
      query_id: randomUUID(),
    });
    const check = [...params.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    const key = createHmac('sha256', 'WebAppData').update(bot).digest();
    params.set('hash', createHmac('sha256', key).update(check).digest('hex'));
    const origin = process.env.APP_ORIGIN!;
    const request = (data: string) =>
      new Request(`${origin}/api/auth`, {
        method: 'POST',
        headers: { origin, 'content-type': 'application/json' },
        body: JSON.stringify({ initData: data }),
      });
    expect((await authenticate(request(params.toString()))).status).toBe(200);
    const reordered = [...params.entries()]
      .reverse()
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    const replay = await authenticate(request(reordered));
    expect(replay.status).toBe(409);
    expect((await replay.json()).code).toBe('AUTH_REPLAYED');
    const replayRecord = await db.telegramAuthReplay.findFirstOrThrow();
    expect(replayRecord.expiresAt.getTime()).toBe((Number(params.get('auth_date')) + 301) * 1000);
  } finally {
    vi.unstubAllEnvs();
  }
});
it('serves private ballot state without emitting Telegram IDs or credential material', async () => {
  const request = new NextRequest('http://localhost:3000/api/me', {
    headers: {
      cookie: `dd_session=${createSession(citizen.id, citizen.sessionVersion, secret('SESSION_SECRET'))}`,
    },
  });
  const response = await privateMe(request);
  expect(response.status).toBe(200);
  const body = await response.text();
  expect(body).not.toContain(citizen.telegramId);
  expect(body).not.toContain(citizen.voterKey);
  expect(body).not.toContain(
    (await db.votingCredential.findFirstOrThrow({ where: { userId: citizen.id } })).token,
  );
  expect(body).not.toContain('pseudonym');
  const state = JSON.parse(body);
  expect(state.votes.length).toBeGreaterThan(0);
  for (const ballot of state.votes) {
    const vote = await db.vote.findFirstOrThrow({
      where: {
        electionId: ballot.electionId,
        pseudonym: await pseudonymFor(citizen, ballot.electionId),
      },
      include: { events: { where: { type: 'RECALL' }, orderBy: { createdAt: 'desc' } } },
    });
    expect(ballot.castAt).toBe(vote.createdAt.toISOString());
    expect(ballot.recallCount).toBe(vote.events.length);
    expect(ballot.lastRecallAt).toBe(vote.events[0]?.createdAt.toISOString() ?? null);
    expect(Object.keys(ballot).sort()).toEqual([
      'balance',
      'candidateId',
      'castAt',
      'electionId',
      'lastRecallAt',
      'recallCount',
    ]);
  }
});
it('reports database readiness through the minimal endpoint', async () => {
  expect(await (await ready()).json()).toMatchObject({ status: 'ok', dependencies: { postgres: 'ok', schema: 'ok' } });
});
describe('platforms, privacy and audit', () => {
  it('signs a content version only once and rejects altered text', async () => {
    const p = await db.candidatePlatform.findUniqueOrThrow({ where: { id: 'maya-v1' } });
    const input = { platformId: p.id, version: p.version, textHash: p.contentHash };
    await signPlatform(citizen, input);
    await signPlatform(citizen, input);
    expect(
      await db.voterAgreement.count({
        where: { userId: citizen.id, documentId: `platform:${p.id}` },
      }),
    ).toBe(1);
    await expect(signPlatform(citizen, { ...input, textHash: 'f'.repeat(64) })).rejects.toThrow(
      'Platform changed',
    );
  });
  it('exposes aggregates without identity, pseudonyms, or private ballots', async () => {
    const publicData = JSON.stringify(await listElections());
    for (const privateValue of [
      citizen.telegramId,
      citizen.id,
      citizen.voterKey,
      ballotPseudonym(citizen.voterKey, electionId, secret('BALLOT_SECRET')),
    ])
      expect(publicData).not.toContain(privateValue);
    for (const field of ['telegramId', 'pseudonym', 'userId', 'signatureHash', 'requestId'])
      expect(publicData).not.toContain(`"${field}"`);
    expect((await listElections('maya chen')).flatMap((e) => e.candidates)).toHaveLength(1);
  });
  it('keeps a valid commitment-only audit chain across transactions', async () => {
    const events = await db.auditEvent.findMany({ orderBy: { sequence: 'asc' } });
    expect(verifyAuditSegment(events, '0'.repeat(64))).toBe(true);
    expect(events.length).toBeGreaterThan(10);
    for (const event of events) {
      expect(event.commitment).toMatch(/^[a-f0-9]{64}$/);
      expect(JSON.stringify(event)).not.toContain(citizen.telegramId);
    }
  });
  it('retries failed mock receipts and never submits personal data', async () => {
    const submitted: string[] = [];
    const failed = await flushOutbox({
      name: 'MOCK',
      submit: async (commitment) => {
        submitted.push(commitment);
        throw new Error('Injected adapter outage');
      },
    });
    expect(failed.confirmed).toBe(0);
    expect(submitted.length).toBeGreaterThan(0);
    expect(submitted.every((value) => /^[a-f0-9]{64}$/.test(value))).toBe(true);
    for (let i = 0; i < 10; i++) await flushOutbox();
    expect(await db.blockchainRecord.count({ where: { status: { not: 'CONFIRMED' } } })).toBe(0);
  });
});
it('protects platform versions, audit hashes and outbox bindings in SQL', async () => {
  const platform = await db.candidatePlatform.findFirstOrThrow();
  await expect(
    db.candidatePlatform.update({
      where: { id: platform.id },
      data: { content: 'Modified after signing' },
    }),
  ).rejects.toThrow();
  const last = await db.auditEvent.findFirstOrThrow({ orderBy: { sequence: 'desc' } });
  await expect(
    db.auditEvent.create({
      data: { commitment: 'b'.repeat(64), previousHash: last.hash, hash: 'c'.repeat(64) },
    }),
  ).rejects.toThrow();
  const outbox = await db.blockchainRecord.findFirstOrThrow();
  await expect(
    db.blockchainRecord.update({ where: { id: outbox.id }, data: { commitment: 'd'.repeat(64) } }),
  ).rejects.toThrow();
  await expect(db.$executeRaw`TRUNCATE TABLE "VoteEvent"`).rejects.toThrow();
  expect(await db.voteEvent.count()).toBeGreaterThan(0);
});
it('publishes paginated audit commitments with no identity or event metadata', async () => {
  const response = await publicAudit(new Request('http://localhost:3000/api/audit?limit=2'));
  expect(response.status).toBe(200);
  const page = await response.json();
  expect(page.events).toHaveLength(2);
  expect(page.verifiedRange).toBe(true);
  expect(page.hasMore).toBe(true);
  for (const event of page.events)
    expect(Object.keys(event).sort()).toEqual([
      'blockchain',
      'commitment',
      'hash',
      'previousHash',
      'sequence',
    ]);
  const more = await publicAudit(
    new Request(`http://localhost:3000/api/audit?after=${page.nextAfter}&limit=2`),
  );
  const next = await more.json();
  expect(next.events[0].sequence).toBeGreaterThan(page.nextAfter);
  expect(next.verifiedRange).toBe(true);
  expect(JSON.stringify(page)).not.toContain(citizen.telegramId);
  expect(JSON.stringify(page)).not.toContain(citizen.voterKey);
  expect((await publicAudit(new Request('http://localhost:3000/api/audit?limit=-1'))).status).toBe(
    400,
  );
});

it('atomically shares PostgreSQL rate limits across concurrent consumers', async () => {
  const first = new PostgresRateLimitStore();
  const second = new PostgresRateLimitStore();
  const key = `test:${randomUUID()}`;
  const results = await Promise.all(Array.from({ length: 12 }, (_, index) =>
    (index % 2 ? first : second).consume(key, 3, 60_000)));
  expect(results.filter(Boolean)).toHaveLength(3);
  expect(await first.consume(key, 3, 60_000)).toBe(false);
});

it('leases each outbox commitment to one worker and rejects stale completion', async () => {
  const store = new PostgresCommitmentOutboxStore();
  await db.$transaction((tx) => appendAudit(tx, JSON.stringify({ action: 'TEST_OUTBOX_LEASE' })));
  const [a, b] = await Promise.all([store.claimBatch(1, 60_000), store.claimBatch(1, 60_000)]);
  expect(a.length + b.length).toBe(1);
  const first = (a[0] ?? b[0])!;
  await db.blockchainRecord.update({ where: { id: first.id }, data: { leaseExpiresAt: new Date(0) } });
  const reclaimed = await store.claimBatch(1, 60_000);
  expect(reclaimed).toHaveLength(1);
  expect(reclaimed[0].id).toBe(first.id);
  expect(await store.complete(first, `mock:${'a'.repeat(64)}`)).toBe(false);
  expect(await store.complete(reclaimed[0], `mock:${'a'.repeat(64)}`)).toBe(true);
  expect((await db.blockchainRecord.findUniqueOrThrow({ where: { id: first.id } })).status).toBe('CONFIRMED');
});

it('checks the live audit chain, ballot ledgers and platform hashes read-only', async () => {
  const before = await db.auditEvent.count();
  const result = await verifyDatabaseEvidence();
  expect(result.auditEvents).toBe(before);
  expect(result.rootHash).toMatch(/^[a-f0-9]{64}$/);
  expect(result.ballots).toBeGreaterThan(0);
  expect(await db.auditEvent.count()).toBe(before);
});

it('rejects direct SQL changes to activated election configuration and candidates', async () => {
  const id = `immutable-${randomUUID()}`;
  const candidateId = `immutable-candidate-${randomUUID()}`;
  const platformId = `immutable-platform-${randomUUID()}`;
  const promiseId = `immutable-promise-${randomUUID()}`;
  await db.election.create({ data: { id, title: 'Immutable election', description: 'Fictional',
    type: 'COUNCIL', opensAt: new Date('2020-01-01T00:00:00Z'),
    closesAt: new Date('2032-01-01T00:00:00Z') } });
  await expect(db.election.update({ where: { id }, data: { status: 'ARCHIVED' } })).rejects.toThrow();
  await db.candidate.create({ data: { id: candidateId, electionId: id, fullName: 'First Candidate',
    party: 'Independent', ideology: 'Civic', bio: 'Fictional', color: '#3377cc' } });
  await db.candidatePlatform.create({ data: { id: platformId, candidateId, version: 1,
    title: 'Original platform', content: 'Original platform text',
    contentHash: sha256('Original platform text') } });
  await db.platformPromise.create({ data: { id: promiseId, platformId,
    title: 'Original promise', evidence: '' } });
  await db.election.update({ where: { id }, data: { status: 'ACTIVE' } });

  await expect(db.election.update({ where: { id }, data: { title: 'Changed title' } })).rejects.toThrow();
  await expect(db.election.update({ where: { id }, data: { partialRecallAmount: 1 } })).rejects.toThrow();
  await expect(db.election.update({ where: { id }, data: { closesAt: new Date('2040-01-01T00:00:00Z') } })).rejects.toThrow();
  await expect(db.election.update({ where: { id }, data: { status: 'DRAFT' } })).rejects.toThrow();
  await expect(db.election.delete({ where: { id } })).rejects.toThrow();
  await expect(db.candidate.create({ data: { id: randomUUID(), electionId: id,
    fullName: 'Late Candidate', party: 'Independent', ideology: 'Civic',
    bio: 'Fictional', color: '#3377cc' } })).rejects.toThrow();
  await expect(db.candidate.update({ where: { id: candidateId }, data: { withdrawn: true } })).rejects.toThrow();
  await expect(db.candidate.delete({ where: { id: candidateId } })).rejects.toThrow();
  await expect(db.candidatePlatform.create({ data: { id: randomUUID(), candidateId, version: 2,
    title: 'Late platform', content: 'Late text', contentHash: sha256('Late text') } })).rejects.toThrow();
  await expect(db.platformPromise.create({ data: { id: randomUUID(), platformId,
    title: 'Late promise', evidence: '' } })).rejects.toThrow();
  await expect(db.platformPromise.update({ where: { id: promiseId },
    data: { title: 'Changed promise' } })).rejects.toThrow();
  await db.platformPromise.update({ where: { id: promiseId }, data: { progress: 50 } });
  expect((await db.election.findUniqueOrThrow({ where: { id } })).title).toBe('Immutable election');
  expect(await db.candidate.count({ where: { electionId: id } })).toBe(1);
  expect((await db.platformPromise.findUniqueOrThrow({ where: { id: promiseId } })).title).toBe('Original promise');
  await db.election.update({ where: { id }, data: { status: 'FINISHED' } });
  await expect(db.election.update({ where: { id }, data: { status: 'ACTIVE' } })).rejects.toThrow();
  await db.election.update({ where: { id }, data: { status: 'ARCHIVED' } });
  await expect(db.election.update({ where: { id }, data: { status: 'FINISHED' } })).rejects.toThrow();
  expect((await verifyDatabaseEvidence()).rootHash).toMatch(/^[a-f0-9]{64}$/);
});

it('serializes a direct candidate insert with election activation', async () => {
  const id = `activation-race-${randomUUID()}`;
  await db.election.create({ data: { id, title: 'Activation race', description: 'Fictional',
    type: 'COUNCIL', opensAt: new Date('2020-01-01T00:00:00Z'),
    closesAt: new Date('2032-01-01T00:00:00Z') } });
  let electionLocked = () => {};
  let finishActivation = () => {};
  const locked = new Promise<void>((resolve) => { electionLocked = resolve; });
  const proceed = new Promise<void>((resolve) => { finishActivation = resolve; });
  const activation = db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Election" WHERE "id" = ${id} FOR UPDATE`;
    electionLocked();
    await proceed;
    await tx.election.update({ where: { id }, data: { status: 'ACTIVE' } });
  });
  await locked;
  let settled = false;
  const insert = db.candidate.create({ data: { id: randomUUID(), electionId: id,
    fullName: 'Too Late', party: 'Independent', ideology: 'Civic',
    bio: 'Fictional', color: '#3377cc' } }).then(() => true, () => false)
    .finally(() => { settled = true; });
  try {
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(settled).toBe(false);
  } finally {
    finishActivation();
  }
  await activation;
  expect(await insert).toBe(false);
  expect(await db.candidate.count({ where: { electionId: id } })).toBe(0);
});
