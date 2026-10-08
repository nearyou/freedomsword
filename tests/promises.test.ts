import { expect, it } from 'vitest';
import { promiseSummary } from '../src/lib/promises';
it('summarizes milestones without treating partial progress as delivery', () => {
  expect(
    promiseSummary([
      { id: 'a', title: 'A', progress: 100, status: 'DELIVERED', evidence: 'Demo' },
      { id: 'b', title: 'B', progress: 50, status: 'IN_PROGRESS', evidence: 'Demo' },
    ]),
  ).toEqual({ delivered: 1, total: 2, progress: 75 });
  expect(promiseSummary([])).toEqual({ delivered: 0, total: 0, progress: 0 });
});
