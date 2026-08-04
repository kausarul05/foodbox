'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

/**
 * Bottom sheet on phones, centred card from `sm` up.
 *
 * Render it conditionally (`{open && <Modal …>}`) — mounting is what arms the
 * Escape handler and the body-scroll lock, and unmounting releases them.
 */
export default function Modal({
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  busy = false,
  wide = false,
}: {
  onClose: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  /** Pinned to the bottom of the sheet, above the safe area. */
  footer?: ReactNode;
  /** While a request is in flight, Escape and the overlay stop dismissing. */
  busy?: boolean;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, busy]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/50 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={() => !busy && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[88vh] sm:rounded-3xl ${
          wide ? 'sm:max-w-lg' : 'sm:max-w-md'
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-6 py-5">
          <div className="flex items-start gap-3">
            {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
            <div>
              <h3 className="text-lg leading-tight font-bold text-ink-900">{title}</h3>
              {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="বন্ধ করুন"
            className="grid size-8 shrink-0 place-items-center rounded-full text-ink-500 transition-colors hover:bg-ink-100 disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && <div className="border-t border-ink-100 bg-white px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
