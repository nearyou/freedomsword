import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError } from './errors';
import { enforceRateLimit, enforceRateLimitAsync } from './rate-limit';
import { correlationId, recordOperational, categoryForStatus, type MetricAction } from './observability';
export function rateLimit(key: string, max = 40, now = Date.now()) {
  enforceRateLimit('legacy', key, max, now);
}
export async function rateLimitAsync(key: string, max = 40) {
  await enforceRateLimitAsync('legacy', key, max);
}
export function assertOrigin(request: Request) {
  const expected = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_ORIGIN;
  if (!expected || request.headers.get('origin') !== expected)
    throw new ApiError(403, 'Request origin is not allowed');
}
export async function body<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  assertOrigin(request);
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new ApiError(415, 'JSON is required');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'A request body is required');
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > 16_384) {
      await reader.cancel();
      throw new ApiError(413, 'Request is too large');
    }
    chunks.push(value);
  }
  try {
    return schema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
  } catch {
    throw new ApiError(400, 'Invalid request data');
  }
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}
export async function handle(fn: () => Promise<Response>, request?: Request, action?: MetricAction) {
  const requestId = correlationId(request);
  let response: Response;
  try {
    response = await fn();
  } catch (error) {
    if (error instanceof ApiError)
      response = json({ error: error.message, code: error.code }, error.status);
    else response = json(
      { error: 'Service unavailable. Check server configuration and database connection.' }, 503);
    if (action) recordOperational(action, 'failure',
      categoryForStatus(response.status, error instanceof ApiError ? error.code : undefined), requestId);
  }
  if (action && response.ok) recordOperational(action, 'success', 'none', requestId);
  response.headers.set('X-Request-ID', requestId);
  return response;
}
