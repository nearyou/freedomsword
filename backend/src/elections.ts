import { db } from './db';
import type { ElectionView } from '@backend/transport';
import { effectiveElectionStatus } from '@backend/core/lifecycle';
export async function listElections(query = ''): Promise<ElectionView[]> {
  return db.$transaction(
    async (tx) => {
      const elections = await tx.election.findMany({
        where: { status: { not: 'DRAFT' } },
        orderBy: { title: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          protocol: true,
          status: true,
          opensAt: true,
          closesAt: true,
          recallEnabled: true,
          fullRecallEnabled: true,
          partialRecallEnabled: true,
          partialRecallAmount: true,
          firstRecallDelaySeconds: true,
          recallCooldownSeconds: true,
          maxRecallOperations: true,
          privatePoll: { select: { chainId: true, maciAddress: true, pollAddress: true,
            pollId: true, coordinatorPublicKeyX: true, coordinatorPublicKeyY: true,
            deploymentBlock: true, candidateIds: true, registrationMode: true } },
          candidates: {
            where: { withdrawn: false },
            orderBy: { id: 'asc' },
            select: {
              id: true,
              electionId: true,
              fullName: true,
              party: true,
              ideology: true,
              bio: true,
              color: true,
              platforms: {
                orderBy: { version: 'desc' },
                take: 1,
                select: {
                  id: true,
                  version: true,
                  title: true,
                  content: true,
                  contentHash: true,
                  createdAt: true,
                  promises: {
                    orderBy: { id: 'asc' },
                    select: { id: true, title: true, progress: true, status: true, evidence: true },
                  },
                },
              },
            },
          },
        },
      });
      const totals = await tx.vote.groupBy({
        by: ['candidateId', 'electionId'],
        _sum: { balance: true },
        _count: true,
      });
      const signatures = await tx.voterAgreement.groupBy({
        by: ['documentId', 'version'],
        where: { documentId: { startsWith: 'platform:' } },
        _count: true,
      });
      return elections.map((e) => {
        const tally = totals.filter((t) => t.electionId === e.id);
        const activeUnits = tally.reduce((sum, t) => sum + (t._sum.balance ?? 0), 0);
        const ballotCount = tally.reduce((sum, t) => sum + t._count, 0);
        return {
          id: e.id,
          title: e.title,
          description: e.description,
          type: e.type,
          protocol: e.protocol,
          privatePoll: e.protocol === 'MACI_PRIVATE' ? e.privatePoll : null,
          status: effectiveElectionStatus(e, new Date()),
          opensAt: e.opensAt.toISOString(),
          closesAt: e.closesAt.toISOString(),
          recallPolicy: {
            enabled: e.recallEnabled,
            fullEnabled: e.fullRecallEnabled,
            partialEnabled: e.partialRecallEnabled,
            partialAmount: e.partialRecallAmount,
            firstDelaySeconds: e.firstRecallDelaySeconds,
            cooldownSeconds: e.recallCooldownSeconds,
            maxOperations: e.maxRecallOperations,
          },
          activeUnits: e.protocol === 'MACI_PRIVATE' ? 0 : activeUnits,
          ballotCount: e.protocol === 'MACI_PRIVATE' ? 0 : ballotCount,
          recalledUnits: e.protocol === 'MACI_PRIVATE' ? 0 : ballotCount * 100 - activeUnits,
          candidates: e.candidates
            .filter((c) =>
              c.fullName.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
            )
            .map((c) => {
              const p = c.platforms[0];
              return {
                id: c.id,
                electionId: c.electionId,
                fullName: c.fullName,
                party: c.party,
                ideology: c.ideology,
                bio: c.bio,
                color: c.color,
                units: e.protocol === 'MACI_PRIVATE' ? 0 : (tally.find((t) => t.candidateId === c.id)?._sum.balance ?? 0),
                platform: p
                  ? {
                      id: p.id,
                      version: p.version,
                      title: p.title,
                      content: p.content,
                      contentHash: p.contentHash,
                      createdAt: p.createdAt.toISOString(),
                      promises: p.promises,
                      signatures:
                        signatures.find(
                          (s) => s.documentId === `platform:${p.id}` && s.version === p.version,
                        )?._count ?? 0,
                    }
                  : null,
              };
            }),
        };
      });
    },
  );
}
