'use client';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useModalAccessibility } from '../useModalAccessibility';
import { useLanguage } from '@frontend/hooks/useLanguage';
export default function Dialog({
  children,
  titleId,
  onClose,
  busy = false,
  className = '',
  portal = false,
}: {
  children: React.ReactNode;
  titleId: string;
  onClose: () => void;
  busy?: boolean;
  className?: string;
  /** Dialogs inside the app shell must escape its inert background and stacking context. */
  portal?: boolean;
}) {
  const [language] = useLanguage();
  useModalAccessibility(titleId);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [busy, onClose]);
  const overlay = (
    <div className="modal-backdrop">
      <section
        className={`modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          className="close-modal"
          type="button"
          aria-label={language === 'uk' ? 'Закрити вікно' : 'Close dialog'}
          onClick={onClose}
          disabled={busy}
        >
          <X size={20} />
        </button>
        {children}
      </section>
    </div>
  );
  return portal ? (typeof document === 'undefined' ? null : createPortal(overlay, document.body)) : overlay;
}
