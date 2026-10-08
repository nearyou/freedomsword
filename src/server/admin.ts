import { randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { sha256 } from '@/lib/hash';
import { db } from './db';
import { ApiError } from './errors';
import { requireUser } from './auth';
import { serializable } from './transaction';
import { appendAudit } from './audit';
import { effectiveElectionStatus } from '@/lib/lifecycle';
import { databaseNow } from './database-time';

const id = z.string().min(1).max(100);
const text = z.string().trim().min(1).max(2000);
const date = z.iso.datetime({ offset: true });
const type = z.enum(['COUNCIL', 'BUDGET', 'COMMUNITY']);
export const adminCommand = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), title: text.max(160), description: text, type, opensAt: date, closesAt: date }).strict(),
  z.object({ action: z.literal('edit'), electionId: id, title: text.max(160), description: text, type, opensAt: date, closesAt: date }).strict(),
  z.object({ action: z.literal('addCandidate'), electionId: id, fullName: text.max(160), party: text.max(160), ideology: text.max(80), bio: text, color: z.string().regex(/^#[0-9a-fA-F]{6}$/) }).strict(),
  z.object({ action: z.literal('removeCandidate'), electionId: id, candidateId: id }).strict(),
  z.object({ action: z.literal('platform'), electionId: id, candidateId: id, title: text.max(160), content: text }).strict(),
  z.object({ action: z.literal('promise'), electionId: id, platformId: id, title: text.max(160) }).strict(),
  z.object({ action: z.literal('activate'), electionId: id }).strict(),
  z.object({ action: z.literal('close'), electionId: id }).strict(),
  z.object({ action: z.literal('archive'), electionId: id }).strict(),
  z.object({ action: z.literal('recallPolicy'), electionId: id,
    recallEnabled: z.boolean(), fullRecallEnabled: z.boolean(), partialRecallEnabled: z.boolean(),
    partialRecallAmount: z.number().int().min(1).max(100),
    firstRecallDelaySeconds: z.number().int().min(0).max(31_536_000),
    recallCooldownSeconds: z.number().int().min(0).max(31_536_000),
    maxRecallOperations: z.number().int().min(1).max(100).nullable(),
  }).strict(),
]);
export type AdminCommand = z.infer<typeof adminCommand>;

export async function requireAdmin(request: NextRequest) {
  const user = await requireUser(request);
  const role = await db.adminGrant.findUnique({
    where: { userId_role: { userId: user.id, role: 'ELECTION_MANAGER' } },
    select: { id: true },
  });
  if (!role) throw new ApiError(403, 'Election manager access required', 'ADMIN_REQUIRED');
  return user;
}

export async function adminElections() {
  return db.election.findMany({
    orderBy: { opensAt: 'desc' },
    select: {
      id: true, title: true, description: true, type: true, status: true, opensAt: true,
      closesAt: true, recallEnabled: true, fullRecallEnabled: true,
      partialRecallEnabled: true, partialRecallAmount: true,
      firstRecallDelaySeconds: true, recallCooldownSeconds: true, maxRecallOperations: true,
      candidates: {
        select: {
          id: true, fullName: true, party: true, ideology: true, bio: true, color: true,
          withdrawn: true,
          platforms: { orderBy: { version: 'desc' }, select: { id: true, version: true, title: true, contentHash: true, promises: { select: { id: true, title: true } } } },
        },
      },
    },
  });
}

export async function administer(userId: string, input: AdminCommand) {
  return serializable(async (tx) => {
    if (input.action === 'create') {
      if (new Date(input.closesAt) <= new Date(input.opensAt) || new Date(input.opensAt) <= new Date())
        throw new ApiError(400, 'Choose a future start before the end');
      const election = await tx.election.create({
        data: { id: randomUUID(), title: input.title, description: input.description,
          type: input.type, opensAt: new Date(input.opensAt), closesAt: new Date(input.closesAt), status: 'DRAFT' },
      });
      await appendAudit(tx, JSON.stringify({ action: 'ADMIN_CREATE_ELECTION', actor: userId, electionId: election.id }), election.id);
      return { electionId: election.id, status: election.status };
    }
    await tx.$queryRaw`SELECT "id" FROM "Election" WHERE "id" = ${input.electionId} FOR UPDATE`;
    const election = await tx.election.findUnique({ where: { id: input.electionId } });
    if (!election) throw new ApiError(404, 'Election not found');
    const now = await databaseNow(tx);
    const current = effectiveElectionStatus(election, now);
    const editable = current === 'DRAFT' &&
      (await tx.vote.count({ where: { electionId: election.id } })) === 0;
    if (input.action === 'close') {
      if (current !== 'ACTIVE') throw new ApiError(409, 'Only an active election can be closed');
      await tx.election.update({ where: { id: election.id }, data: { status: 'FINISHED' } });
    } else if (input.action === 'archive') {
      if (current !== 'FINISHED') throw new ApiError(409, 'Only a finished election can be archived');
      if (election.status !== 'FINISHED')
        await tx.election.update({ where: { id: election.id }, data: { status: 'FINISHED' } });
      await tx.election.update({ where: { id: election.id }, data: { status: 'ARCHIVED' } });
    } else {
      if (!editable) throw new ApiError(409, 'Election can no longer be changed');
      switch (input.action) {
        case 'edit': {
          if (new Date(input.closesAt) <= new Date(input.opensAt) || new Date(input.opensAt) <= new Date())
            throw new ApiError(400, 'Choose a future start before the end');
          await tx.election.update({ where: { id: election.id }, data: {
            title: input.title, description: input.description, type: input.type,
            opensAt: new Date(input.opensAt), closesAt: new Date(input.closesAt),
          } });
          break;
        }
        case 'addCandidate':
          await tx.candidate.create({ data: { id: randomUUID(), electionId: election.id,
            fullName: input.fullName, party: input.party, ideology: input.ideology,
            bio: input.bio, color: input.color } });
          break;
        case 'removeCandidate': {
          const changed = await tx.candidate.updateMany({ where: { id: input.candidateId, electionId: election.id, withdrawn: false }, data: { withdrawn: true } });
          if (changed.count !== 1) throw new ApiError(404, 'Candidate not found');
          break;
        }
        case 'platform': {
          const candidate = await tx.candidate.findFirst({ where: { id: input.candidateId, electionId: election.id, withdrawn: false } });
          if (!candidate) throw new ApiError(404, 'Candidate not found');
          const latest = await tx.candidatePlatform.findFirst({ where: { candidateId: candidate.id }, orderBy: { version: 'desc' } });
          await tx.candidatePlatform.create({ data: { id: randomUUID(), candidateId: candidate.id,
            version: (latest?.version ?? 0) + 1, title: input.title, content: input.content,
            contentHash: sha256(input.content) } });
          break;
        }
        case 'promise': {
          const platform = await tx.candidatePlatform.findFirst({ where: { id: input.platformId, candidate: { electionId: election.id, withdrawn: false } }, include: { candidate: true } });
          if (!platform) throw new ApiError(404, 'Platform not found');
          const latest = await tx.candidatePlatform.findFirst({ where: { candidateId: platform.candidateId }, orderBy: { version: 'desc' } });
          if (latest?.id !== platform.id) throw new ApiError(409, 'Promises can only be added to the current platform');
          await tx.platformPromise.create({ data: { id: randomUUID(), platformId: platform.id,
            title: input.title, evidence: '' } });
          break;
        }
        case 'activate': {
          if (now >= election.closesAt)
            throw new ApiError(409, 'Reschedule this draft before activating it');
          const count = await tx.candidate.count({ where: { electionId: election.id, withdrawn: false } });
          if (count < 2) throw new ApiError(409, 'At least two candidates are required');
          await tx.election.update({ where: { id: election.id }, data: { status: now < election.opensAt ? 'UPCOMING' : 'ACTIVE' } });
          break;
        }
        case 'recallPolicy':
          await tx.election.update({ where: { id: election.id }, data: {
            recallEnabled: input.recallEnabled,
            fullRecallEnabled: input.fullRecallEnabled,
            partialRecallEnabled: input.partialRecallEnabled,
            partialRecallAmount: input.partialRecallAmount,
            firstRecallDelaySeconds: input.firstRecallDelaySeconds,
            recallCooldownSeconds: input.recallCooldownSeconds,
            maxRecallOperations: input.maxRecallOperations,
          } });
          break;
      }
    }
    await appendAudit(tx, JSON.stringify({ action: `ADMIN_${input.action}`, actor: userId,
      electionId: election.id, commandHash: sha256(JSON.stringify(input)) }), election.id);
    return { electionId: election.id, action: input.action };
  });
}
