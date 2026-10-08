'use client';
import { useCallback, useEffect, useState } from 'react';
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        ready(): void;
        expand(): void;
        isVersionAtLeast(version: string): boolean;
        setHeaderColor(color: string): void;
        setBackgroundColor(color: string): void;
        colorScheme?: 'light' | 'dark';
        safeAreaInset?: { top: number; bottom: number; left: number; right: number };
        contentSafeAreaInset?: { top: number; bottom: number; left: number; right: number };
        onEvent?(event: string, callback: () => void): void;
        offEvent?(event: string, callback: () => void): void;
      };
    };
  }
}
export function useTelegram() {
  const [launch, setLaunch] = useState<'loading' | 'ready' | 'outside' | 'failed'>('loading');
  const onReady = useCallback(() => {
    const webapp = window.Telegram?.WebApp;
    window.dispatchEvent(new Event('dd-telegram-ready'));
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
    const update = () => {
      for (const edge of ['top', 'bottom', 'left', 'right'] as const) {
        const value =
          (webapp?.safeAreaInset?.[edge] ?? 0) + (webapp?.contentSafeAreaInset?.[edge] ?? 0);
        document.documentElement.style.setProperty(`--tg-safe-${edge}`, `${Math.max(0, value)}px`);
      }
    };
    update();
    webapp?.onEvent?.('safeAreaChanged', update);
    webapp?.onEvent?.('contentSafeAreaChanged', update);
    return () => {
      webapp?.offEvent?.('safeAreaChanged', update);
      webapp?.offEvent?.('contentSafeAreaChanged', update);
    };
  }, [launch]);
  return { launch, onReady, onError: () => setLaunch('failed') };
}
