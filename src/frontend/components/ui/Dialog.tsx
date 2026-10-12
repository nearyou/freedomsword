'use client';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useModalAccessibility } from '../useModalAccessibility';
export default function Dialog({
  children,
  titleId,
  onClose,
  busy = false,
  className = '',
}: {
  children: React.ReactNode;
  titleId: string;
  onClose: () => void;
  busy?: boolean;
  className?: string;
}) {
  useModalAccessibility(titleId);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [busy, onClose]);
  return (
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
          aria-label="Close dialog"
          onClick={onClose}
          disabled={busy}
        >
          <X size={20} />
        </button>
        {children}
      </section>
    </div>
  );
}
