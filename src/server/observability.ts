import { randomUUID } from 'node:crypto';

export type MetricAction = 'auth' | 'vote' | 'recall' | 'outbox';
export type ErrorCategory = 'none' | 'authentication' | 'authorization' | 'validation' |
  'conflict' | 'rate_limit' | 'dependency' | 'internal';
export type MetricOutcome = 'success' | 'failure';
const actions = new Set<MetricAction>(['auth', 'vote', 'recall', 'outbox']);
const outcomes = new Set<MetricOutcome>(['success', 'failure']);
const categories = new Set<ErrorCategory>(['none', 'authentication', 'authorization', 'validation',
  'conflict', 'rate_limit', 'dependency', 'internal']);
const counts = new Map<string, number>();

export function correlationId(request?: Request) {
  const incoming = request?.headers.get('x-request-id');
  return incoming && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(incoming)
    ? incoming.toLowerCase() : randomUUID();
}

/** Only fixed labels and a validated UUID can enter this log or metric sink. */
export function recordOperational(action: MetricAction, outcome: MetricOutcome,
  category: ErrorCategory, requestId: string = randomUUID()) {
  if (!actions.has(action) || !outcomes.has(outcome) || !categories.has(category) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId))
    throw new Error('Invalid operational event');
  const key = `${action}:${outcome}:${category}`;
  counts.set(key, (counts.get(key) ?? 0) + 1);
  if (process.env.NODE_ENV !== 'test' && (process.env.LOG_LEVEL !== 'error' || outcome === 'failure'))
    console.info(JSON.stringify({ time: new Date().toISOString(), event: 'operation', action, outcome, category, requestId }));
}

export function metricsSnapshot() {
  return { scope: 'process', counters: Object.fromEntries(counts) };
}

export function categoryForStatus(status: number, code?: string): ErrorCategory {
  if (status === 429) return 'rate_limit';
  if (status === 401 || code?.startsWith('AUTH_') || code === 'SESSION_EXPIRED') return 'authentication';
  if (status === 403) return 'authorization';
  if (status === 409) return 'conflict';
  if (status >= 500) return 'dependency';
  if (status >= 400) return 'validation';
  return 'none';
}
