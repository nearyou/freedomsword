import { createHmac } from 'node:crypto';
import { z } from 'zod';
import { ApiError } from './errors';
import { eligibilityProviderName } from './config';
import { secret } from './secrets';

export type EligibilityInput = { subjectKey: string; proof?: unknown };
export type EligibilityResult = {
  eligible: boolean;
  uniqueSubjectId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
};
export interface EligibilityProvider {
  readonly name: string;
  verify(input: EligibilityInput): Promise<EligibilityResult>;
}

const resultSchema = z
  .object({
    eligible: z.boolean(),
    uniqueSubjectId: z.string().min(1).max(256).optional(),
    reason: z.string().max(200).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    expiresAt: z.date().optional(),
  })
  .strict();

export class MockEligibilityProvider implements EligibilityProvider {
  readonly name = 'MOCK';
  async verify(input: EligibilityInput): Promise<EligibilityResult> {
    return {
      eligible: true,
      uniqueSubjectId: input.subjectKey,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }
}

export function createEligibilityProvider(
  name: string = eligibilityProviderName(),
): EligibilityProvider {
  if (name === 'mock') return new MockEligibilityProvider();
  throw new Error('Invalid server configuration: ELIGIBILITY_PROVIDER');
}

export function subjectCommitment(provider: string, uniqueSubjectId: string) {
  const commitmentSecret = process.env.ELIGIBILITY_COMMITMENT_SECRET ?? secret('SESSION_SECRET');
  return createHmac('sha256', commitmentSecret)
    .update(JSON.stringify(['eligibility-v1', provider, uniqueSubjectId]))
    .digest('hex');
}

export async function evaluateEligibility(
  provider: EligibilityProvider,
  input: EligibilityInput,
  options: { timeoutMs?: number; retries?: number } = {},
): Promise<EligibilityResult> {
  const timeoutMs = options.timeoutMs ?? 3000;
  const retries = options.retries ?? 1;
  for (let attempt = 0; attempt <= retries; attempt++) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const raw = await Promise.race([
        provider.verify(input),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Provider timeout')), timeoutMs);
        }),
      ]);
      const result = resultSchema.safeParse(raw);
      if (!result.success || (result.data.eligible && !result.data.uniqueSubjectId))
        throw new ApiError(
          503,
          'Eligibility provider returned an invalid result.',
          'ELIGIBILITY_PROVIDER_INVALID',
        );
      return result.data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (attempt === retries)
        throw new ApiError(
          503,
          'Eligibility provider is unavailable. Try again later.',
          'ELIGIBILITY_PROVIDER_UNAVAILABLE',
        );
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  throw new ApiError(
    503,
    'Eligibility provider is unavailable.',
    'ELIGIBILITY_PROVIDER_UNAVAILABLE',
  );
}
