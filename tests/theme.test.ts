import { afterEach, expect, it, vi } from 'vitest';
import { resolvedTheme } from '../src/components/ThemeControl';
afterEach(() => vi.unstubAllGlobals());
it('follows the device outside Telegram even when the SDK supplies a default scheme', () => {
  vi.stubGlobal('window', {
    Telegram: { WebApp: { initData: '', colorScheme: 'light' } },
    matchMedia: () => ({ matches: false }),
  });
  expect(resolvedTheme('system')).toBe('dark');
});
it('follows a real Telegram launch scheme in system mode', () => {
  vi.stubGlobal('window', {
    Telegram: { WebApp: { initData: 'test-launch', colorScheme: 'light' } },
    matchMedia: () => ({ matches: false }),
  });
  expect(resolvedTheme('system')).toBe('light');
});
it('respects manual preferences independently of Telegram and the device', () => {
  vi.stubGlobal('window', {
    Telegram: { WebApp: { initData: 'test-launch', colorScheme: 'dark' } },
    matchMedia: () => ({ matches: false }),
  });
  expect(resolvedTheme('light')).toBe('light');
  expect(resolvedTheme('dark')).toBe('dark');
});
