import { describe, expect, it } from 'vitest';
import { supportBalance, supportUnlockAt } from '../backend/src/core/support';
import { citizenLocation, personalBallotHref } from '../frontend/src/lib/citizen-location';
import { feedbackBotUrl } from '../frontend/src/lib/feedback';

describe('six calendar months after each withdrawal', () => {
  it.each([
    ['2026-08-31T14:15:16.123Z', '2027-02-28T14:15:16.123Z'],
    ['2027-08-31T14:15:16.123Z', '2028-02-29T14:15:16.123Z'],
    ['2026-10-24T10:00:00Z', '2027-04-24T10:00:00.000Z'],
  ])('unlocks %s at %s', (withdrawal, expected) => {
    const date = new Date(withdrawal);
    expect(supportUnlockAt(date).toISOString()).toBe(expected);
    expect(date.toISOString()).toBe(new Date(withdrawal).toISOString());
  });
  it('releases each lot independently at its exact unlock instant', () => {
    const allocations = [{ candidateId: 'a', units: 20 }];
    const withdrawals = [{ units: 30, availableAt: new Date('2027-04-24T10:00:00Z') },
      { units: 50, availableAt: new Date('2027-05-24T10:00:00Z') }];
    expect(supportBalance(allocations, withdrawals, new Date('2027-04-24T09:59:59.999Z')).availableUnits).toBe(0);
    const unlocked = supportBalance(allocations, withdrawals, new Date('2027-04-24T10:00:00Z'));
    expect(unlocked.availableUnits).toBe(30);
    expect(unlocked.coolingUnits).toBe(50);
  });
  it('detects over-allocated or malformed budgets', () => {
    expect(() => supportBalance([{ candidateId: 'a', units: 101 }], [], new Date())).toThrow('integrity');
    expect(() => supportBalance([{ candidateId: 'a', units: 90 }],
      [{ units: 20, availableAt: new Date('2099-01-01') }], new Date())).toThrow('integrity');
  });
});

it('returns transparency visitors to their selected personal ballot', () => {
  const url = new URL(personalBallotHref('council / 2026'), 'https://example.com');
  expect(url.pathname).toBe('/elections');
  expect(citizenLocation(Object.fromEntries(url.searchParams))).toEqual({
    electionId: 'council / 2026', tab: 'My ballot',
  });
  expect(citizenLocation({ tab: 'unknown', election: ['a', 'b'] })).toEqual({ tab: 'Candidates', electionId: undefined });
});

it('only links to a separately configured Telegram feedback bot', () => {
  expect(feedbackBotUrl('@FreedomSwordFeedbackBot')).toBe('https://t.me/FreedomSwordFeedbackBot');
  for (const value of ['', '@freedomswordbot', 'https://untrusted.example', 'not_a_bot/path'])
    expect(feedbackBotUrl(value)).toBeNull();
});
