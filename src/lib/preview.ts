import { candidateDefinitions, electionDefinitions } from './demo';
import type { ElectionView } from './contracts';
export const previewElections: ElectionView[] = electionDefinitions.map((election) => {
  const candidates = candidateDefinitions
    .filter((c) => c.electionId === election.id)
    .map((c, index) => ({
      id: c.id,
      electionId: c.electionId,
      fullName: c.fullName,
      party: c.party,
      ideology: c.ideology,
      bio: c.bio,
      color: c.color,
      units: [24800, 18700, 12400, 8300][index],
      platform: {
        id: `${c.id}-v1`,
        version: 1,
        title: c.title,
        content: c.content,
        contentHash: '',
        signatures: [342, 256, 190, 123][index],
        promises: c.promises.map((title, i) => ({
          id: `${c.id}-promise-${i}`,
          title,
          progress: c.progress[i],
          status: c.progress[i] === 100 ? 'DELIVERED' : 'IN_PROGRESS',
          evidence: 'Fictional demonstration milestone; no real-world evidence is claimed.',
        })),
      },
    }));
  return {
    ...election,
    status: 'ACTIVE',
    recallPolicy: { enabled: true, fullEnabled: true, partialEnabled: true,
      partialAmount: 25, firstDelaySeconds: 0, cooldownSeconds: 0, maxOperations: null },
    opensAt: '2026-01-01T00:00:00Z',
    closesAt: '2030-12-31T23:59:59Z',
    activeUnits: candidates.reduce((sum, c) => sum + c.units, 0),
    recalledUnits: 4200,
    ballotCount: (candidates.reduce((sum, c) => sum + c.units, 0) + 4200) / 100,
    candidates,
  };
});
