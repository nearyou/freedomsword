import { api, ClientApiError } from './client-api';
import type { CitizenView } from './contracts';

/** Coalesces concurrent initialization and exchanges launch data only without a valid session. */
export function createWelcomeSessionReader(
  readLaunchData: () => string | undefined,
  request: typeof api = api,
) {
  let pending: Promise<CitizenView> | null = null;
  return function readSession() {
    if (pending) return pending;
    pending = (async () => {
      try {
        return await request<CitizenView>('me');
      } catch (failure) {
        if (!(failure instanceof ClientApiError) || failure.status !== 401) throw failure;
      }
      const initData = readLaunchData();
      if (!initData) throw new Error('Telegram launch data is unavailable. Reopen the Mini App.');
      await request('auth', { initData });
      return request<CitizenView>('me');
    })();
    const task = pending;
    void task.then(
      () => {
        pending = null;
      },
      () => {
        pending = null;
      },
    );
    return task;
  };
}
