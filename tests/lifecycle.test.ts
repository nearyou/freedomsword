import { describe, expect, it } from 'vitest';
import { effectiveElectionStatus } from '../src/lib/lifecycle';
const opensAt = new Date('2030-01-01T00:00:00.000Z');
const closesAt = new Date('2030-01-02T00:00:00.000Z');
describe('election lifecycle boundaries', () => {
  it('uses inclusive start and exclusive end on server time', () => {
    const election = { status: 'UPCOMING' as const, opensAt, closesAt };
    expect(effectiveElectionStatus(election, new Date(opensAt.getTime() - 1))).toBe('UPCOMING');
    expect(effectiveElectionStatus(election, opensAt)).toBe('ACTIVE');
    expect(effectiveElectionStatus(election, new Date(closesAt.getTime() - 1))).toBe('ACTIVE');
    expect(effectiveElectionStatus(election, closesAt)).toBe('FINISHED');
  });
  it('keeps draft, finished and archived elections terminal for public voting', () => {
    for (const status of ['DRAFT', 'FINISHED', 'ARCHIVED'] as const)
      expect(effectiveElectionStatus({ status, opensAt, closesAt }, opensAt)).toBe(status);
  });
});
