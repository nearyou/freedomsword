import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../src/server/errors';
import { handle } from '../src/server/http';
import { categoryForStatus, metricsSnapshot, recordOperational } from '../src/server/observability';

describe('operational observability', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
  it('returns a correlation ID and logs only fixed labels, never request contents', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const sink = vi.spyOn(console, 'info').mockImplementation(() => {});
    const sensitive = 'query_id=private&hash=secret-cookie';
    try {
      const request = new Request('http://localhost:3000/api/auth', { headers: { 'x-request-id': sensitive, cookie: sensitive } });
      const response = await handle(async () => { throw new ApiError(401, 'Invalid sign-in', 'AUTH_INVALID'); }, request, 'auth');
      expect(response.status).toBe(401);
      expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
      expect(JSON.stringify(sink.mock.calls)).not.toContain(sensitive);
      expect(JSON.stringify(metricsSnapshot())).toContain('auth:failure:authentication');
    } finally { vi.unstubAllEnvs(); }
  });
  it('classifies errors and rejects arbitrary log labels', () => {
    expect(categoryForStatus(429)).toBe('rate_limit');
    expect(categoryForStatus(403)).toBe('authorization');
    expect(categoryForStatus(503)).toBe('dependency');
    expect(() => recordOperational('cookie=private' as never, 'failure', 'internal')).toThrow('Invalid');
  });
});
