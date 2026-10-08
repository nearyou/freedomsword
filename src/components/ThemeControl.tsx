'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

export type ThemePreference = 'system' | 'light' | 'dark';

const preferences: ThemePreference[] = ['system', 'light', 'dark'];
const background = { light: '#f4f7fc', dark: '#090f1d' };

function savedPreference(): ThemePreference {
  try {
    const value = window.localStorage.getItem('dd-theme');
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

export function resolvedTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference !== 'system') return preference;
  const webapp = window.Telegram?.WebApp;
  const telegram = webapp?.initData ? webapp.colorScheme : undefined;
  if (telegram === 'light' || telegram === 'dark') return telegram;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(preference: ThemePreference) {
  const theme = resolvedTheme(preference);
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background[theme]);
  const telegram = window.Telegram?.WebApp;
  if (telegram?.initData && telegram.isVersionAtLeast('6.10')) {
    telegram.setHeaderColor(background[theme]);
    telegram.setBackgroundColor(background[theme]);
  }
}

export default function ThemeControl() {
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const initial = setTimeout(() => {
      setPreference(savedPreference());
      setLoaded(true);
    }, 0);
    return () => clearTimeout(initial);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const update = () => applyTheme(preference);
    const media = window.matchMedia('(prefers-color-scheme: light)');
    let subscribed: NonNullable<Window['Telegram']>['WebApp'] | undefined;
    const connectTelegram = () => {
      const telegram = window.Telegram?.WebApp;
      if (telegram && telegram !== subscribed) {
        subscribed = telegram;
        telegram.onEvent?.('themeChanged', update);
      }
      update();
    };
    connectTelegram();
    media.addEventListener('change', update);
    window.addEventListener('dd-telegram-ready', connectTelegram);
    return () => {
      media.removeEventListener('change', update);
      subscribed?.offEvent?.('themeChanged', update);
      window.removeEventListener('dd-telegram-ready', connectTelegram);
    };
  }, [loaded, preference]);

  const next = preferences[(preferences.indexOf(preference) + 1) % preferences.length];
  const Icon = preference === 'light' ? Sun : preference === 'dark' ? Moon : Monitor;
  return (
    <button
      type="button"
      className="theme-control"
      title={`Appearance: ${preference}. Switch to ${next}.`}
      aria-label={`Appearance: ${preference}. Switch to ${next} mode`}
      onClick={() => {
        try {
          window.localStorage.setItem('dd-theme', next);
        } catch {
          // Appearance still changes for this page when storage is unavailable.
        }
        setPreference(next);
        applyTheme(next);
      }}
    >
      <Icon size={17} aria-hidden="true" />
      <span className="theme-control-label">{preference}</span>
    </button>
  );
}
