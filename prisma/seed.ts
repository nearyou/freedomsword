import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { candidateDefinitions, electionDefinitions } from '../src/lib/demo';
import { sha256 } from '../src/lib/hash';
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
async function main() {
  for (const election of electionDefinitions) {
    await db.election.upsert({
      where: { id: election.id },
      update: {},
      create: {
        ...election,
        status: 'DRAFT',
        opensAt: new Date('2026-01-01T00:00:00Z'),
        closesAt: new Date('2030-12-31T23:59:59Z'),
      },
    });
  }
  for (const { promises, progress, title, content, ...candidate } of candidateDefinitions) {
    await db.candidate.upsert({ where: { id: candidate.id }, update: {}, create: candidate });
    const platformId = `${candidate.id}-v1`;
    await db.candidatePlatform.upsert({
      where: { id: platformId },
      update: {},
      create: {
        id: platformId,
        candidateId: candidate.id,
        version: 1,
        title,
        content,
        contentHash: sha256(content),
      },
    });
    for (let i = 0; i < promises.length; i++) {
      const id = `${candidate.id}-promise-${i}`;
      await db.platformPromise.upsert({
        where: { id },
        update: {},
        create: {
          id,
          platformId,
          title: promises[i],
          progress: progress[i],
          status: progress[i] === 100 ? 'DELIVERED' : 'IN_PROGRESS',
          evidence: 'Fictional demonstration milestone; no real-world evidence is claimed.',
        },
      });
    }
  }
  for (const election of electionDefinitions) {
    await db.election.updateMany({ where: { id: election.id, status: 'DRAFT' }, data: { status: 'ACTIVE' } });
  }
  console.log('Seeded 3 elections, 10 fictional candidates, platforms and promises.');
}
main().finally(() => db.$disconnect());
