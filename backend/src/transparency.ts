import type { Prisma as PrismaTypes } from '@prisma/client';
import { db } from './db';
import { ApiError } from './errors';
import { effectiveElectionStatus } from '@backend/core/lifecycle';

export async function electionTransparencySnapshot(tx: PrismaTypes.TransactionClient, electionId: string, auditLimit: number | null = 100) {
    const election = await tx.election.findUnique({ where: { id: electionId }, select: {
      id: true, title: true, description: true, type: true, protocol: true, status: true,
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
    if (election.protocol === 'MACI_PRIVATE')
      throw new ApiError(409, 'Private-election results require a verified final MACI tally', 'PRIVATE_TALLY_PENDING');
    const reusable = election.protocol === 'CONTINUOUS_SUPPORT';
    let tallies = await tx.vote.groupBy({ by: ['candidateId'], where: { electionId },
      _sum: { balance: true }, _count: true });
    let castUnits: number;
    let recalledUnits: number;
    if (reusable) {
      const allocations = await tx.supportAllocation.groupBy({ by: ['candidateId'],
        where: { electionId, units: { gt: 0 } }, _sum: { units: true }, _count: true });
      tallies = allocations.map((entry) => ({ candidateId: entry.candidateId,
        _sum: { balance: entry._sum.units }, _count: entry._count }));
      const allocated = await tx.supportEvent.aggregate({ where: { type: 'ALLOCATE', budget: { electionId } }, _sum: { units: true } });
      const withdrawn = await tx.supportEvent.aggregate({ where: { type: 'WITHDRAW', budget: { electionId } }, _sum: { units: true } });
      castUnits = allocated._sum.units ?? 0;
      recalledUnits = withdrawn._sum.units ?? 0;
    } else {
      const cast = await tx.voteEvent.aggregate({ where: { type: 'CAST', vote: { electionId } }, _sum: { units: true } });
      const recalled = await tx.voteEvent.aggregate({ where: { type: 'RECALL', vote: { electionId } }, _sum: { units: true } });
      castUnits = cast._sum.units ?? 0;
      recalledUnits = -(recalled._sum.units ?? 0);
    }
    const auditEvents = await tx.auditEvent.findMany({ where: { electionId },
      orderBy: { sequence: 'desc' }, take: auditLimit ?? undefined,
      select: { sequence: true, commitment: true, previousHash: true, hash: true,
        blockchain: { select: { adapter: true, status: true, receipt: true } } },
    });
    const activeUnits = tallies.reduce((sum, tally) => sum + (tally._sum.balance ?? 0), 0);
    const participation = reusable ? await tx.supportBudget.count({ where: { electionId } })
      : tallies.reduce((sum, tally) => sum + tally._count, 0);
    return {
      schemaVersion: 1,
      election: {
        id: election.id, title: election.title, description: election.description,
        protocol: election.protocol,
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
        voteUnitsCast: castUnits,
        recalledUnits,
        activeUnits,
      },
      audit: {
        scope: 'election',
        recentEvents: auditEvents.reverse(),
        note: reusable
          ? 'Reusable support is enforced by the application. Blockchain anchors commit to audit events, not on-chain support balances. Allocation and recall totals include all cycles; no individual account or allocation is disclosed.'
          : 'Historical events created before election scoping remain in the global /api/audit chain.',
      },
    };
}

export async function electionTransparency(electionId: string) {
  return db.$transaction((tx) => electionTransparencySnapshot(tx, electionId));
}
