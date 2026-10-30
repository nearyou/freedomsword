'use client';

import { useEffect, useSyncExternalStore } from 'react';
import type { Language } from '@frontend/components/welcome/copy';

const key = 'freedomsword-language';
const event = 'freedomsword-language-changed';
let sessionLanguage: Language = 'en';
function snapshot(): Language {
  try {
    const saved = window.localStorage.getItem(key);
    if (saved === 'en' || saved === 'uk') return saved;
  } catch { /* Keep the selection for this session when storage is unavailable. */ }
  return sessionLanguage;
}
function subscribe(update: () => void) {
  window.addEventListener(event, update);
  window.addEventListener('storage', update);
  return () => { window.removeEventListener(event, update); window.removeEventListener('storage', update); };
}
export function setLanguage(language: Language) {
  sessionLanguage = language;
  try { window.localStorage.setItem(key, language); } catch { /* Session selection still works. */ }
  window.dispatchEvent(new Event(event));
}
export function useLanguage() {
  const language = useSyncExternalStore(subscribe, snapshot, () => 'en' as const);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  return [language, setLanguage] as const;
}
