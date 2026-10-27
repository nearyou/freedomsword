import { expect, it } from 'vitest';
import { citizenLocation, personalBallotHref } from '../frontend/src/lib/citizen-location';
import { feedbackBotUrl } from '../frontend/src/lib/feedback';
import { inviteUrl, inviteText, shareNetworks } from '../frontend/src/lib/share';

it('preserves the personal ballot destination and rejects unknown tab values', () => {
  const url = new URL(personalBallotHref('council-2026'), 'https://freedomsword.org');
  expect(citizenLocation(Object.fromEntries(url.searchParams))).toEqual({ tab: 'My ballot', electionId: 'council-2026' });
  expect(citizenLocation({ tab: '<script>', election: ['invalid'] })).toEqual({ tab: 'Candidates', electionId: undefined });
});
it('allows only a separately configured feedback bot', () => {
  expect(feedbackBotUrl('freedomswordbot')).toBeNull();
  expect(feedbackBotUrl('https://example.com')).toBeNull();
  expect(feedbackBotUrl('')).toBeNull();
  expect(feedbackBotUrl('@freedomsword_feedback_bot')).toBe('https://t.me/freedomsword_feedback_bot');
});
it('shares the website invitation through every network without an account identifier', () => {
  expect(inviteUrl).toBe('https://freedomsword.org');
  expect(inviteText).toContain('True democracy starts');
  expect(inviteText).not.toContain('anonymous');
  for (const network of shareNetworks) {
    expect(decodeURIComponent(network.url)).toContain(inviteUrl);
    expect(network.url).not.toContain('freedomswordbot');
  }
});
