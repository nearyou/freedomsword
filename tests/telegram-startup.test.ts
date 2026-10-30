// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useTelegram } from '../frontend/src/hooks/useTelegram';

const startup = readFileSync('frontend/public/telegram-startup.js', 'utf8');
let root: Root | undefined;
let container: HTMLDivElement;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); });
afterEach(async () => {
  if (root) await act(async () => { root!.unmount(); });
  root = undefined; container?.remove(); delete window.Telegram; vi.unstubAllGlobals();
});
const app = (initData = 'test-launch') => ({
  initData, ready: vi.fn(), expand: vi.fn(), isVersionAtLeast: () => false,
  setHeaderColor: vi.fn(), setBackgroundColor: vi.fn(), onEvent: vi.fn(), offEvent: vi.fn(),
});

it('removes the native loading screen when HTML is ready, without React or API requests', () => {
  const webapp = app(); const events = new Map<string, () => void>(); const dispatch = vi.fn();
  runInNewContext(startup, {
    window: { Telegram: { WebApp: webapp }, dispatchEvent: dispatch }, Event,
    document: { readyState: 'loading', addEventListener: (name: string, handler: () => void) => events.set(name, handler) },
  });
  expect(webapp.ready).not.toHaveBeenCalled();
  events.get('DOMContentLoaded')!();
  expect(webapp.ready).toHaveBeenCalledOnce(); expect(webapp.expand).toHaveBeenCalledOnce();
  expect(dispatch.mock.calls[0][0].type).toBe('fs-telegram-sdk-ready');
});

it('can start after DOMContentLoaded and keeps ordinary browser preview outside Telegram auth', () => {
  const webapp = app('');
  runInNewContext(startup, { window: { Telegram: { WebApp: webapp }, dispatchEvent: vi.fn() }, document: { readyState: 'complete' }, Event });
  expect(webapp.ready).toHaveBeenCalledOnce(); expect(webapp.expand).not.toHaveBeenCalled();
});

function Harness() { const { launch } = useTelegram(); return createElement('span', null, launch); }
async function mount() {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => { root!.render(createElement(Harness)); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
}
it('recognizes the layout-loaded SDK when the client route hydrates later', async () => {
  window.Telegram = { WebApp: app() }; await mount();
  expect(container.textContent).toBe('ready');
});
it('recognizes an SDK that finishes after the React hook mounts', async () => {
  await mount(); expect(container.textContent).toBe('loading');
  await act(async () => { window.Telegram = { WebApp: app() }; window.dispatchEvent(new Event('fs-telegram-sdk-ready')); });
  expect(container.textContent).toBe('ready');
});
it('does not classify a normal website visit as an authenticated Telegram launch', async () => {
  window.Telegram = { WebApp: app('') }; await mount(); expect(container.textContent).toBe('outside');
});
