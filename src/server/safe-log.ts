const authOutcomes = new Set(['SUCCESS', 'INVALID', 'EXPIRED', 'REPLAYED', 'UNAVAILABLE']);
export type AuthOutcome = 'SUCCESS' | 'INVALID' | 'EXPIRED' | 'REPLAYED' | 'UNAVAILABLE';

/** Fixed event vocabulary only. Never pass request objects or caught exceptions here. */
export function logAuthOutcome(outcome: AuthOutcome) {
  if (!authOutcomes.has(outcome)) throw new Error('Unsupported authentication outcome');
  if (process.env.NODE_ENV === 'test' || process.env.LOG_LEVEL === 'error') return;
  console.info(JSON.stringify({ event: 'telegram.auth', outcome }));
}
