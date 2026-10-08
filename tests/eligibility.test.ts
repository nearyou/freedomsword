import { describe, expect, it, vi } from 'vitest';
import {
  createEligibilityProvider,
  evaluateEligibility,
  MockEligibilityProvider,
  type EligibilityProvider,
} from '../src/server/eligibility';

const provider = (verify: EligibilityProvider['verify']): EligibilityProvider => ({
  name: 'TEST',
  verify,
});

describe('eligibility providers', () => {
  it('accepts an eligible mock result without echoing the private subject', async () => {
    const result = await evaluateEligibility(new MockEligibilityProvider(), {
      subjectKey: 'private',
    });
    expect(result.eligible).toBe(true);
    expect(createEligibilityProvider('mock').name).toBe('MOCK');
  });
  it('passes an ineligible decision through without retrying', async () => {
    const verify = vi.fn(async () => ({ eligible: false, reason: 'not registered' }));
    expect((await evaluateEligibility(provider(verify), { subjectKey: 'x' })).eligible).toBe(false);
    expect(verify).toHaveBeenCalledTimes(1);
  });
  it('normalizes failure and retries a transient error once', async () => {
    const verify = vi
      .fn()
      .mockRejectedValueOnce(new Error('private provider detail'))
      .mockResolvedValueOnce({ eligible: true, uniqueSubjectId: 'unique' });
    expect((await evaluateEligibility(provider(verify), { subjectKey: 'x' })).eligible).toBe(true);
    expect(verify).toHaveBeenCalledTimes(2);
    await expect(
      evaluateEligibility(
        provider(async () => {
          throw new Error('private provider detail');
        }),
        { subjectKey: 'x' },
      ),
    ).rejects.toMatchObject({ code: 'ELIGIBILITY_PROVIDER_UNAVAILABLE' });
  });
  it('times out and never stores or exposes a raw provider response', async () => {
    const verify = vi.fn(() => new Promise<never>(() => {}));
    await expect(
      evaluateEligibility(provider(verify), { subjectKey: 'x' }, { timeoutMs: 5, retries: 1 }),
    ).rejects.toMatchObject({ code: 'ELIGIBILITY_PROVIDER_UNAVAILABLE' });
    expect(verify).toHaveBeenCalledTimes(2);
  });
  it('rejects malformed responses and unknown provider configuration', async () => {
    await expect(
      evaluateEligibility(
        provider(async () => ({ eligible: true })),
        { subjectKey: 'x' },
      ),
    ).rejects.toMatchObject({ code: 'ELIGIBILITY_PROVIDER_INVALID' });
    expect(() => createEligibilityProvider('unknown')).toThrow('ELIGIBILITY_PROVIDER');
  });
});
