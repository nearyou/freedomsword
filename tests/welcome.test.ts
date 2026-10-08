import { describe, expect, it } from 'vitest';
import { nextWelcomeStep, validateMockVerification } from '../src/lib/welcome';

describe('welcome participation gates', () => {
  it('requires verification even if an agreement flag exists', () => {
    expect(nextWelcomeStep(false, true)).toBe('verification');
    expect(nextWelcomeStep(false, false)).toBe('verification');
    expect(nextWelcomeStep(true, false)).toBe('agreement');
    expect(nextWelcomeStep(true, true)).toBe('dashboard');
  });
  it('rejects blank, too short and oversized names without substituting consent', () => {
    for (const name of ['', '   ', ' A ', 'a'.repeat(61)]) {
      expect(validateMockVerification(name, true)).toEqual({ name: true, consent: false });
    }
    expect(validateMockVerification('  Demo Participant  ', false)).toEqual({
      name: false,
      consent: true,
    });
    expect(validateMockVerification('Учасник', true)).toEqual({ name: false, consent: false });
  });
});
