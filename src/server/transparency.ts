import { Prisma } from '@prisma/client';
import type { Prisma as PrismaTypes } from '@prisma/client';
import { db } from './db';
import { ApiError } from './errors';
import { effectiveElectionStatus } from '@/lib/lifecycle';

export async function electionTransparencySnapshot(tx: PrismaTypes.TransactionClient, electionId: string, auditLimit: number | null = 100) {
    const election = await tx.election.findUnique({ where: { id: electionId }, select: {
      id: true, title: true, description: true, type: true, status: true,
      opensAt: true, closesAt: true, recallEnabled: true, fullRecallEnabled: true,
      partialRecallEnabled: true, partialRecallAmount: true, firstRecallDelaySeconds: true,
      recallCooldownSeconds: true, maxRecallOperations: true,
      candidates: { orderBy: { fullName: 'asc' }, select: {
        id: true, fullName: true, party: true, ideology: true, bio: true, color: true,
        withdrawn: true, platforms: { orderBy: { version: 'asc' }, select: {
          version: true, title: true, contentHash: true, createdAt: true,
        } },
      } },
    } });
    if (!election || election.status === 'DRAFT') throw new ApiError(404, 'Election not found');
    const tallies = await tx.vote.groupBy({ by: ['candidateId'], where: { electionId },
      _sum: { balance: true }, _count: true });
    const cast = await tx.voteEvent.aggregate({ where: { type: 'CAST', vote: { electionId } }, _sum: { units: true } });
    const recalled = await tx.voteEvent.aggregate({ where: { type: 'RECALL', vote: { electionId } }, _sum: { units: true } });
    const auditEvents = await tx.auditEvent.findMany({ where: { electionId },
      orderBy: { sequence: 'desc' }, take: auditLimit ?? undefined,
      select: { sequence: true, commitment: true, previousHash: true, hash: true,
        blockchain: { select: { adapter: true, status: true, receipt: true } } },
    });
    const activeUnits = tallies.reduce((sum, tally) => sum + (tally._sum.balance ?? 0), 0);
    const participation = tallies.reduce((sum, tally) => sum + tally._count, 0);
    return {
      schemaVersion: 1,
      election: {
        id: election.id, title: election.title, description: election.description,
        type: election.type, status: effectiveElectionStatus(election, new Date()),
        opensAt: election.opensAt.toISOString(), closesAt: election.closesAt.toISOString(),
        recallPolicy: {
          enabled: election.recallEnabled, fullEnabled: election.fullRecallEnabled,
          partialEnabled: election.partialRecallEnabled, partialAmount: election.partialRecallAmount,
          firstDelaySeconds: election.firstRecallDelaySeconds,
          cooldownSeconds: election.recallCooldownSeconds,
          maxOperations: election.maxRecallOperations,
        },
      },
      candidates: election.candidates.map((candidate) => ({
        id: candidate.id, fullName: candidate.fullName, party: candidate.party,
        ideology: candidate.ideology, bio: candidate.bio, color: candidate.color,
        withdrawn: candidate.withdrawn,
        activeUnits: tallies.find((tally) => tally.candidateId === candidate.id)?._sum.balance ?? 0,
        ballotCount: tallies.find((tally) => tally.candidateId === candidate.id)?._count ?? 0,
        platforms: candidate.platforms.map((platform) => ({
          version: platform.version, title: platform.title, contentHash: platform.contentHash,
          createdAt: platform.createdAt.toISOString(),
        })),
      })),
      totals: {
        participation,
        voteUnitsCast: cast._sum.units ?? 0,
        recalledUnits: -(recalled._sum.units ?? 0),
        activeUnits,
      },
      audit: {
        scope: 'election',
        recentEvents: auditEvents.reverse(),
        note: 'Historical events created before election scoping remain in the global /api/audit chain.',
      },
    };
}

export async function electionTransparency(electionId: string) {
  return db.$transaction(
    (tx) => electionTransparencySnapshot(tx, electionId),
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}
