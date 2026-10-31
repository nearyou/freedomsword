import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import ResultsPanel from '../frontend/src/components/results/ResultsPanel';
import { previewElections } from '../frontend/src/lib/preview';

vi.mock('next/link', () => ({ default: 'a' }));
const election = { ...previewElections[0], protocol: 'CONTINUOUS_SUPPORT' as const };
const render = (changes = {}) => renderToStaticMarkup(createElement(ResultsPanel, { election: { ...election, ...changes }, source: 'database', stale: false }));

it('uses actual candidate totals and does not invent a participation percentage', () => {
  const html = render();
  expect(html).toContain('100%');
  expect(html.match(/data-result-units=/g)).toHaveLength(election.candidates.length);
  for (const candidate of election.candidates) {
    expect(html).toContain(candidate.fullName);
    expect(html).toContain(`${(candidate.units / election.activeUnits * 100).toFixed(1)}%`);
  }
  expect(html).toContain('Participants');
  expect(html).toContain('Participation unavailable');
  expect(html).not.toContain('76%');
});

it('handles zero support and unlisted support without silently losing a ring segment', () => {
  const empty = render({ activeUnits: 0, candidates: election.candidates.map((item) => ({ ...item, units: 0 })) });
  expect(empty).toContain('0%');
  expect(empty).not.toMatch(/NaN|Infinity/);
  const other = render({ activeUnits: election.activeUnits + 25 });
  expect(other).toContain('Other support');
  expect(other).toContain('data-result-units="25"');
});

it('keeps private candidate totals hidden until a verified tally is published', () => {
  const html = render({ protocol: 'MACI_PRIVATE', privatePoll: null });
  expect(html).toContain('Private results pending');
  expect(html).not.toContain('live-results-chart');
  expect(html).not.toContain(election.candidates[0].fullName);
});
