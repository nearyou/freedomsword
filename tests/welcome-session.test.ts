import { describe, expect, it, vi } from 'vitest';
import { api, ClientApiError } from '../src/lib/client-api';
import type { CitizenView } from '../src/lib/contracts';
import { createWelcomeSessionReader } from '../src/lib/welcome-session';

const citizen: CitizenView = {
  connected: true,
  verified: false,
  agreementSigned: false,
  provider: 'MOCK',
  signedPlatforms: [],
  votes: [],
};

describe('welcome Telegram session exchange', () => {
  it('reuses a valid session without replaying launch data', async () => {
    const request = vi.fn().mockResolvedValue(citizen);
    const read = createWelcomeSessionReader(() => 'signed-launch', request as typeof api);
    expect(await read()).toEqual(citizen);
    expect(await read()).toEqual(citizen);
    expect(request.mock.calls).toEqual([['me'], ['me']]);
  });
  it('coalesces concurrent readers into one auth exchange', async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new ClientApiError('Connect first', 401))
      .mockResolvedValueOnce({ connected: true })
      .mockResolvedValue(citizen);
    const read = createWelcomeSessionReader(() => 'signed-launch', request as typeof api);
    const [first, second] = await Promise.all([read(), read()]);
    expect(first).toEqual(citizen);
    expect(second).toEqual(citizen);
    expect(request.mock.calls).toEqual([['me'], ['auth', { initData: 'signed-launch' }], ['me']]);
  });
  it('does not exchange launch data after network or server failure', async () => {
    const request = vi.fn().mockRejectedValue(new ClientApiError('Unavailable', 503));
    const read = createWelcomeSessionReader(() => 'signed-launch', request as typeof api);
    await expect(read()).rejects.toThrow('Unavailable');
    expect(request).toHaveBeenCalledExactlyOnceWith('me');
  });
  it('requires Telegram launch data and allows retry after a failed read', async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new ClientApiError('Connect first', 401))
      .mockResolvedValue(citizen);
    const read = createWelcomeSessionReader(() => undefined, request as typeof api);
    await expect(read()).rejects.toThrow('Reopen the Mini App');
    expect(await read()).toEqual(citizen);
    expect(request.mock.calls).toEqual([['me'], ['me']]);
  });
});
