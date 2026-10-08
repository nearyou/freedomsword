import { expect, it } from 'vitest';
import { previewElections } from '../src/lib/preview';
import { searchCandidates } from '../src/lib/contracts';
it('includes three elections and ten fictional candidates', () => {
  expect(previewElections).toHaveLength(3);
  expect(previewElections.flatMap((e) => e.candidates)).toHaveLength(10);
});
it('finds candidates by full name, case insensitively', () => {
  expect(searchCandidates(previewElections[0].candidates, '  MAYA CHEN ')).toHaveLength(1);
  expect(searchCandidates(previewElections[0].candidates, 'No such citizen')).toHaveLength(0);
});
