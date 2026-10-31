// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ReusableSupportPanel from '../frontend/src/components/voting/ReusableSupportPanel';
import { api } from '../frontend/src/lib/client-api';
import { previewElections } from '../frontend/src/lib/preview';

vi.mock('../frontend/src/lib/client-api', async (original) => ({
  ...await original<typeof import('../frontend/src/lib/client-api')>(), api: vi.fn(),
}));
const election = { ...previewElections[0], protocol: 'CONTINUOUS_SUPPORT' as const };
const candidateId = election.candidates[0].id;
const empty = { totalUnits: 100, activeUnits: 0, availableUnits: 100, coolingUnits: 0, allocations: [], withdrawals: [] };
let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.mocked(api).mockReset();
  localStorage.clear();
  // Happy DOM has no layout; expose visible controls for the real dialog focus trap.
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
  container = document.createElement('div'); document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => { root.unmount(); });
  container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

function button(text: string) {
  const found = [...document.querySelectorAll<HTMLButtonElement>('button')].find((item) => item.textContent === text);
  if (!found) throw new Error(`Missing button: ${text}`);
  return found;
}
async function mount() {
  await act(async () => {
    root.render(createElement('main', { className: 'app-shell' }, createElement(ReusableSupportPanel, {
      election, connected: true, ready: true, now: Date.parse('2026-10-29'), onPassport: vi.fn(),
      onRefresh: vi.fn().mockResolvedValue(undefined),
    })));
  });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
}
function expectInteractiveDialog() {
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
  expect(dialog).not.toBeNull();
  expect(dialog.closest('.app-shell')).toBeNull();
  expect((document.querySelector('.app-shell') as HTMLElement).inert).toBe(true);
  for (let element: HTMLElement | null = dialog; element; element = element.parentElement)
    expect(element.inert).not.toBe(true);
  return dialog;
}

it('keeps Confirm outside the inert page and records exactly one allocation while busy', async () => {
  let finish!: (value: unknown) => void;
  vi.mocked(api).mockImplementation(async (_path, payload) => payload
    ? new Promise((resolve) => { finish = resolve; }) : empty);
  await mount();
  for (let index = 0; index < 4; index++) await act(async () => {
    document.querySelector<HTMLButtonElement>('[aria-label="Add 0.25 vote (25 units)"]')!.click();
  });
  await act(async () => { button('Add 100 units').click(); });
  expectInteractiveDialog();
  expect(document.body.textContent).toContain('Confirm your vote');
  expect(document.body.textContent).toContain('six calendar months after each withdrawal');
  await act(async () => { button('Confirm vote').click(); });
  expect(button('Recording…').disabled).toBe(true);
  expect(button('Cancel').disabled).toBe(true);
  await act(async () => {
    button('Recording…').click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  });
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  const writes = vi.mocked(api).mock.calls.filter(([, payload]) => payload);
  expect(writes).toHaveLength(1);
  expect(writes[0][1]).toMatchObject({ candidateId, action: 'allocate', units: 100 });
  await act(async () => { finish({ ...empty, activeUnits: 100, availableUnits: 0, allocations: [{ candidateId, units: 100 }] }); });
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect((document.querySelector('.app-shell') as HTMLElement).inert).toBe(false);
  expect(document.body.textContent).toContain('Your vote is cast!');
  expect(document.body.textContent).toContain('100 units allocated to');
  expect(document.querySelector('.selected-ballot')).not.toBeNull();
  expect(document.querySelectorAll('.ballot-confetti i')).toHaveLength(24);
  await act(async () => { button('View my ballot').click(); });
  expect(document.body.textContent).not.toContain('Your vote is cast!');
  expect(document.body.textContent).toContain('100 units allocated.');
  expect(vi.mocked(api).mock.calls.filter(([, payload]) => payload)).toHaveLength(1);
});

it('confirms a quarter recall from the same nested support panel', async () => {
  vi.mocked(api).mockImplementation(async (_path, payload) => payload
    ? { ...empty, activeUnits: 75, availableUnits: 0, coolingUnits: 25, allocations: [{ candidateId, units: 75 }] }
    : { ...empty, activeUnits: 100, availableUnits: 0, allocations: [{ candidateId, units: 100 }] });
  await mount();
  await act(async () => { document.querySelector<HTMLButtonElement>('[aria-label="Subtract 0.25 vote (25 units)"]')!.click(); });
  await act(async () => { button('Recall 25 units').click(); });
  expectInteractiveDialog();
  await act(async () => { button('Confirm').click(); });
  expect(vi.mocked(api).mock.calls.filter(([, payload]) => payload)).toHaveLength(1);
  expect(api).toHaveBeenLastCalledWith('support', expect.objectContaining({ candidateId, action: 'withdraw', units: 25 }));
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(document.body.textContent).toContain('25 units recalled.');
  expect(document.querySelector('.ballot-confetti')).toBeNull();
});

it('keeps a failed allocation retryable without showing success', async () => {
  vi.mocked(api).mockImplementation(async (_path, payload) => {
    if (payload) throw new Error('Connection interrupted');
    return empty;
  });
  await mount();
  await act(async () => { document.querySelector<HTMLButtonElement>('[aria-label="Add 0.25 vote (25 units)"]')!.click(); });
  await act(async () => { button('Add 25 units').click(); });
  await act(async () => { button('Confirm vote').click(); });
  expect(document.body.textContent).toContain('Connection interrupted');
  expect(button('Retry the same action safely')).toBeDefined();
  expect(document.querySelector('.vote-success')).toBeNull();
});

it.each(['Cancel', 'Close dialog', 'Escape'])('dismisses using %s without saving an allocation', async (method) => {
  vi.mocked(api).mockResolvedValue(empty);
  await mount();
  await act(async () => { document.querySelector<HTMLButtonElement>('[aria-label="Add 0.25 vote (25 units)"]')!.click(); });
  const trigger = button('Add 25 units');
  await act(async () => { trigger.focus(); trigger.click(); });
  const dialog = expectInteractiveDialog();
  await act(async () => {
    if (method === 'Escape') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    else if (method === 'Close dialog') dialog.querySelector<HTMLButtonElement>('[aria-label="Close dialog"]')!.click();
    else button('Cancel').click();
  });
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect((document.querySelector('.app-shell') as HTMLElement).inert).toBe(false);
  expect(document.activeElement).toBe(trigger);
  expect(document.body.style.overflow).toBe('');
  expect(vi.mocked(api).mock.calls.filter(([, payload]) => payload)).toHaveLength(0);
});
