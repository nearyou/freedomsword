// @vitest-environment happy-dom
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import SupportSlider from '../frontend/src/components/voting/SupportSlider';

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => {
  await act(async () => { root.unmount(); }); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});
async function mount(current: number, maximum: number) {
  function Harness() {
    const [value, setValue] = useState(current);
    return createElement(SupportSlider, { current, maximum, value, disabled: false, onChange: setValue });
  }
  await act(async () => { root.render(createElement(Harness)); });
}
const range = () => container.querySelector<HTMLInputElement>('input[type="range"]')!;
const change = () => container.querySelector<HTMLElement>('.support-change')!.textContent?.trim();
const control = (name: 'Add' | 'Subtract') => container.querySelector<HTMLButtonElement>(`[aria-label^="${name} 0.25"]`)!;

it('distinguishes adding and recalling with words, icons and four visible scale sections', async () => {
  await mount(50, 100);
  expect(container.querySelectorAll('.support-quarter')).toHaveLength(4);
  expect(container.querySelectorAll('.support-ring-track')).toHaveLength(4);
  await act(async () => { control('Add').click(); });
  expect(range().value).toBe('75');
  expect(change()).toBe('Adding 25 units');
  expect(container.querySelector('[data-change="add"]')).not.toBeNull();
  expect(container.querySelectorAll('.support-ring-added')).toHaveLength(1);
  await act(async () => { control('Subtract').click(); });
  await act(async () => { control('Subtract').click(); });
  expect(range().value).toBe('25');
  expect(change()).toBe('Recalling 25 units');
  expect(container.querySelector('[data-change="subtract"]')).not.toBeNull();
  expect(container.querySelectorAll('.support-ring-removed')).toHaveLength(1);
});

it('keeps the visual scale at 100 while keyboard changes cannot spend unavailable units', async () => {
  await mount(40, 55);
  expect(range().max).toBe('100');
  await act(async () => { range().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); });
  expect(range().value).toBe('55');
  expect(control('Add').disabled).toBe(true);
  await act(async () => { range().dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true })); });
  expect(range().value).toBe('0');
  expect(control('Subtract').disabled).toBe(true);
  await act(async () => { range().dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })); });
  expect(range().value).toBe('55');
  expect(container.querySelectorAll('.support-ring-unavailable')).toHaveLength(2);
});

it('updates the four-section preview by a quarter per swipe and ignores vertical scrolling', async () => {
  vi.spyOn(HTMLElement.prototype, 'setPointerCapture').mockImplementation(() => {});
  await mount(75, 100);
  const row = container.querySelector<HTMLElement>('.support-swipe')!;
  async function swipe(x: number, y: number) {
    await act(async () => {
      row.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, isPrimary: true, button: 0, clientX: 150, clientY: 100, bubbles: true }));
      row.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, isPrimary: true, button: 0, clientX: 150 + x, clientY: 100 + y, bubbles: true }));
    });
  }
  await swipe(-60, 0);
  expect(range().value).toBe('50');
  expect(change()).toContain('Recalling 25 units');
  await swipe(60, 0);
  expect(range().value).toBe('75');
  await swipe(60, 0);
  expect(range().value).toBe('100');
  expect(change()).toContain('Adding 25 units');
  await swipe(-60, 100);
  expect(range().value).toBe('100');
});
