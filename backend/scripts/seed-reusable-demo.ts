import 'dotenv/config';
import { db } from '../src/db';
import { candidateDefinitions } from '../prisma/demo';
import { sha256 } from '../src/core/hash';
import { appendAudit } from '../src/audit';

const id = 'reusable-support-demo';
try {
  await db.$transaction(async (tx) => {
    if (await tx.election.findUnique({ where: { id } })) return;
    await tx.election.create({ data: { id, title: 'Community support · reusable vote',
      description: 'Fictional continuous-support election. Allocate 100 units across candidates; each withdrawal becomes reusable after six calendar months.',
      type: 'COMMUNITY', protocol: 'CONTINUOUS_SUPPORT', status: 'ACTIVE',
      opensAt: new Date('2026-01-01T00:00:00Z'), closesAt: new Date('2035-12-31T23:59:59Z') } });
    for (const candidate of candidateDefinitions.filter((entry) => entry.electionId === 'council-2026')) {
      const candidateId = `support-${candidate.id}`;
      await tx.candidate.create({ data: { id: candidateId, electionId: id,
        fullName: candidate.fullName, party: candidate.party, ideology: candidate.ideology,
        bio: candidate.bio, color: candidate.color } });
      await tx.candidatePlatform.create({ data: { id: `${candidateId}-v1`, candidateId, version: 1,
        title: candidate.title, content: candidate.content, contentHash: sha256(candidate.content) } });
    }
    await appendAudit(tx, JSON.stringify({ action: 'SEED_REUSABLE_SUPPORT_DEMO' }), id);
  });
  console.log('Reusable-support demo is available; existing elections and ballots were preserved.');
} finally { await db.$disconnect(); }
