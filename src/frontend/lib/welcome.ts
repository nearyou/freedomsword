export type WelcomeStep = 'verification' | 'agreement' | 'dashboard';

export function nextWelcomeStep(verified: boolean, accepted: boolean): WelcomeStep {
  if (!verified) return 'verification';
  return accepted ? 'dashboard' : 'agreement';
}

export function validateMockVerification(name: string, consent: boolean) {
  const length = name.trim().length;
  return { name: length < 2 || length > 60, consent: !consent };
}
