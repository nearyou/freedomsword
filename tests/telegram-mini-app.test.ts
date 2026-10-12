import { afterEach, expect, it, vi } from 'vitest';
import { openTelegramLink, telegramHaptic } from '../src/frontend/hooks/useTelegram';

afterEach(() => vi.unstubAllGlobals());

it('uses Telegram navigation and haptics for a signed Mini App launch', () => {
  const open = vi.fn();
  const selection = vi.fn();
  const impact = vi.fn();
  const notification = vi.fn();
  vi.stubGlobal('window', {
    Telegram: {
      WebApp: {
        initData: 'signed-launch',
        openTelegramLink: open,
        isVersionAtLeast: () => true,
        HapticFeedback: {
          selectionChanged: selection,
          impactOccurred: impact,
          notificationOccurred: notification,
        },
      },
    },
  });

  expect(openTelegramLink('https://t.me/freedomswordbot')).toBe(true);
  telegramHaptic('selection');
  telegramHaptic('impact');
  telegramHaptic('success');
  expect(open).toHaveBeenCalledWith('https://t.me/freedomswordbot');
  expect(selection).toHaveBeenCalledOnce();
  expect(impact).toHaveBeenCalledWith('light');
  expect(notification).toHaveBeenCalledWith('success');
});

it('keeps ordinary browser links and avoids Telegram haptics in preview', () => {
  const open = vi.fn();
  const notification = vi.fn();
  vi.stubGlobal('window', {
    Telegram: {
      WebApp: {
        initData: '',
        openTelegramLink: open,
        isVersionAtLeast: () => true,
        HapticFeedback: { notificationOccurred: notification },
      },
    },
  });

  expect(openTelegramLink('https://t.me/freedomswordbot')).toBe(false);
  telegramHaptic('error');
  expect(open).not.toHaveBeenCalled();
  expect(notification).not.toHaveBeenCalled();
});
