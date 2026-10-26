'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

type Launch = 'loading' | 'ready' | 'outside' | 'failed';
type Insets = { top: number; bottom: number; left: number; right: number };

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        ready(): void;
        expand(): void;
        close?(): void;
        isVersionAtLeast(version: string): boolean;
        setHeaderColor(color: string): void;
        setBackgroundColor(color: string): void;
        setBottomBarColor?(color: string): void;
        openTelegramLink?(url: string): void;
        BackButton?: {
          show(): void;
          hide(): void;
          onClick(callback: () => void): void;
          offClick(callback: () => void): void;
        };
        HapticFeedback?: {
          impactOccurred(style: 'light' | 'medium'): void;
          notificationOccurred(type: 'success' | 'error'): void;
          selectionChanged(): void;
        };
        colorScheme?: 'light' | 'dark';
        safeAreaInset?: Insets;
        contentSafeAreaInset?: Insets;
        onEvent?(event: string, callback: () => void): void;
        offEvent?(event: string, callback: () => void): void;
      };
    };
  }
}

export function openTelegramLink(url: string) {
  const webapp = typeof window === 'undefined' ? undefined : window.Telegram?.WebApp;
  if (!webapp?.initData || !webapp.openTelegramLink) return false;
  webapp.openTelegramLink(url);
  return true;
}

export function telegramHaptic(kind: 'selection' | 'impact' | 'success' | 'error') {
  const webapp = typeof window === 'undefined' ? undefined : window.Telegram?.WebApp;
  if (!webapp?.initData || !webapp.isVersionAtLeast('6.1')) return;
  const feedback = webapp.HapticFeedback;
  if (kind === 'selection') feedback?.selectionChanged();
  else if (kind === 'impact') feedback?.impactOccurred('light');
  else feedback?.notificationOccurred(kind);
}

export function useTelegramBackButton(launch: Launch, enabled: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);
  useEffect(() => {
    if (launch !== 'ready') return;
    const button = window.Telegram?.WebApp.BackButton;
    if (!button) return;
    if (!enabled) {
      button.hide();
      return;
    }
    const handleBack = () => onBackRef.current();
    button.onClick(handleBack);
    button.show();
    return () => {
      button.offClick(handleBack);
      button.hide();
    };
  }, [launch, enabled]);
}

export function useTelegram(color = '#151719') {
  const [launch, setLaunch] = useState<Launch>('loading');
  const onReady = useCallback(() => {
    const webapp = window.Telegram?.WebApp;
    window.dispatchEvent(new Event('fs-telegram-ready'));
    if (!webapp?.initData) {
      setLaunch('outside');
      return;
    }
    webapp.ready();
    webapp.expand();
    setLaunch('ready');
  }, []);
  useEffect(() => {
    const timer = setTimeout(
      () => setLaunch((current) => (current === 'loading' ? 'failed' : current)),
      10_000,
    );
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (launch !== 'ready') return;
    const webapp = window.Telegram?.WebApp;
    const updateColors = () => {
      if (!webapp?.isVersionAtLeast('6.1')) return;
      const background = getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim() || color;
      webapp.setHeaderColor(webapp.isVersionAtLeast('6.9') ? background : 'bg_color');
      webapp.setBackgroundColor(background);
      if (webapp.isVersionAtLeast('7.10')) webapp.setBottomBarColor?.(background);
    };
    const update = () => {
      for (const edge of ['top', 'bottom', 'left', 'right'] as const) {
        const value =
          (webapp?.safeAreaInset?.[edge] ?? 0) + (webapp?.contentSafeAreaInset?.[edge] ?? 0);
        document.documentElement.style.setProperty(`--tg-safe-${edge}`, `${Math.max(0, value)}px`);
      }
    };
    updateColors();
    update();
    webapp?.onEvent?.('themeChanged', updateColors);
    webapp?.onEvent?.('safeAreaChanged', update);
    webapp?.onEvent?.('contentSafeAreaChanged', update);
    return () => {
      webapp?.offEvent?.('themeChanged', updateColors);
      webapp?.offEvent?.('safeAreaChanged', update);
      webapp?.offEvent?.('contentSafeAreaChanged', update);
    };
  }, [color, launch]);
  return { launch, onReady, onError: () => setLaunch('failed') };
}
