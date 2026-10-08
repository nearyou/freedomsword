'use client';
import { useEffect } from 'react';
export function useModalAccessibility(key: string | null) {
  useEffect(() => {
    if (!key) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const backgrounds = [
      ...document.querySelectorAll<HTMLElement>(
        '.app-shell, .mobile-nav, .admin-grid, .admin-heading',
      ),
    ];
    backgrounds.forEach((element) => (element.inert = true));
    const dialog = [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].at(-1);
    const focusable = () =>
      [
        ...(dialog?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], summary, [tabindex="0"]',
        ) ?? []),
      ].filter((element) => element.getClientRects().length > 0);
    focusable()[0]?.focus();
    function trap(event: KeyboardEvent) {
      if (event.key !== 'Tab') return;
      const targets = focusable();
      const first = targets[0],
        last = targets.at(-1);
      if (!first) return;
      if (
        event.shiftKey &&
        (document.activeElement === first || !dialog?.contains(document.activeElement))
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !dialog?.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', trap);
    return () => {
      document.body.style.overflow = overflow;
      backgrounds.forEach((element) => (element.inert = false));
      document.removeEventListener('keydown', trap);
      if (previous?.isConnected) previous.focus();
    };
  }, [key]);
}
