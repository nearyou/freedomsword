export class ClientApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, payload?: Record<string, unknown>): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), payload ? 25_000 : 15_000);
  try {
    const response = await fetch(`/api/${path}`, {
      method: payload ? 'POST' : 'GET',
      headers: payload ? { 'Content-Type': 'application/json' } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
      cache: 'no-store',
      signal: controller.signal,
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new ClientApiError('The service could not be reached. Please retry.', response.status);
    }
    if (!response.ok)
      throw new ClientApiError(
        response.status >= 500 && !data.code
          ? 'The service is temporarily unavailable. Please retry.'
          : (data.error ?? 'Request failed'),
        response.status,
        data.code,
      );
    return data as T;
  } catch (error) {
    if (error instanceof ClientApiError) throw error;
    throw new ClientApiError(
      controller.signal.aborted
        ? 'Request timed out. You can retry a vote or recall safely.'
        : 'Connection interrupted. Please retry.',
      0,
    );
  } finally {
    clearTimeout(timeout);
  }
}
