import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { api } from '../frontend/src/lib/client-api';
import { useVoting } from '../frontend/src/hooks/useVoting';

vi.mock('../frontend/src/lib/client-api', () => ({ api: vi.fn() }));
const action = { path: 'recall', payload: { electionId: 'test-only', requestId: 'same-request' }, success: '25 units recalled.' };
function voting(refresh: () => Promise<void>) {
  let actions: ReturnType<typeof useVoting> | undefined;
  function Harness() { actions = useVoting(refresh); return null; }
  renderToStaticMarkup(createElement(Harness));
  return actions!;
}

it('finishes a saved recall even when the subsequent public-results refresh fails', async () => {
  vi.mocked(api).mockReset().mockResolvedValue({});
  const refresh = vi.fn().mockRejectedValue(new Error('Results unavailable'));
  expect(await voting(refresh).execute(action)).toBe(true);
  expect(api).toHaveBeenCalledExactlyOnceWith('recall', action.payload);
  expect(refresh).toHaveBeenCalledOnce();
});

it('does not report a failed recall as saved or refresh results before the mutation succeeds', async () => {
  vi.mocked(api).mockReset().mockRejectedValue(new Error('Connection interrupted'));
  const refresh = vi.fn();
  expect(await voting(refresh).execute(action)).toBe(false);
  expect(api).toHaveBeenCalledExactlyOnceWith('recall', action.payload);
  expect(refresh).not.toHaveBeenCalled();
});
