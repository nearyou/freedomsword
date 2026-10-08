import { expect, it } from 'vitest';
import { supportSegments, recallAvailability } from '../src/lib/ballot-ui';
import { previewElections } from '../src/lib/preview';
it('renders an exact 100-unit meter for non-divisor recall policies', () => {
  const segments = supportSegments(75, 30);
  expect(segments.map((segment) => segment.units)).toEqual([30, 30, 30, 10]);
  expect(segments.reduce((sum, segment) => sum + (segment.units * segment.fill) / 100, 0)).toBe(75);
  expect(supportSegments(0, 10).every((segment) => segment.fill === 0)).toBe(true);
  expect(supportSegments(100, 100)).toEqual([{ units: 100, fill: 100 }]);
});
it('uses actual recall count and timing without deriving counts from balance', () => {
  const election = {
    ...previewElections[0],
    recallPolicy: {
      ...previewElections[0].recallPolicy!,
      partialAmount: 30,
      firstDelaySeconds: 60,
      cooldownSeconds: 120,
      maxOperations: 3,
    },
  };
  const ballot = {
    electionId: election.id,
    candidateId: 'maya',
    balance: 40,
    castAt: '2026-10-08T01:00:00Z',
    recallCount: 2,
    lastRecallAt: '2026-10-08T01:01:00Z',
  };
  expect(recallAvailability(election, ballot, Date.parse('2026-10-08T01:02:00Z')).nextAt).toBe(
    Date.parse('2026-10-08T01:03:00Z'),
  );
  expect(recallAvailability(election, ballot, Date.parse('2026-10-08T01:02:00Z')).common).toContain(
    'cooldown',
  );
  expect(recallAvailability(election, ballot, Date.parse('2026-10-08T01:03:00Z')).common).toBe('');
  expect(
    recallAvailability(election, { ...ballot, recallCount: 3 }, Date.parse('2026-10-08T01:03:00Z'))
      .common,
  ).toContain('maximum');
});
it('leaves unsupported private timing unavailable and explains exhausted balances', () => {
  const election = previewElections[0];
  const ballot = { electionId: election.id, candidateId: 'maya', balance: 0 };
  expect(recallAvailability(election, ballot, Date.parse('2026-10-08')).nextAt).toBeUndefined();
  expect(recallAvailability(election, ballot, Date.parse('2026-10-08')).fullReason).toContain(
    'Another initial ballot',
  );
});
it('disables recalls at the exact close boundary and below the partial amount', () => {
  const election = previewElections[0];
  const ballot = { electionId: election.id, candidateId: 'maya', balance: 20 };
  expect(recallAvailability(election, ballot, Date.parse(election.closesAt)).common).toContain(
    'window',
  );
  const allowed = recallAvailability(election, ballot, Date.parse('2026-10-08'));
  expect(allowed.partialReason).toContain('below');
  expect(allowed.fullReason).toBe('');
});
