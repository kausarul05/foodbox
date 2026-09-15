'use client';

import { useRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { CalendarDays, ChevronDown, Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { bengaliDateNumeric } from '@/lib/format';

/**
 * Form primitives.
 *
 * `inputClass` is the single source of truth for what a text field looks like —
 * login, signup, profile, order and the wallet recharge sheet all render the
 * same control instead of five slightly different ones.
 */

export const inputClass =
  'w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-[15px] text-ink-900 ' +
  'placeholder:text-ink-400 transition-colors ' +
  'focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25 ' +
  'disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-500';

/**
 * Label + control + hint. Uses an explicit htmlFor/id pair rather than wrapping
 * the control in a <label>, because several fields contain their own buttons
 * (password reveal) and nesting those inside a label breaks the click target.
 */
export function Field({
  label,
  htmlFor,
  required = false,
  hint,
  children,
  className = '',
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 flex items-center gap-1 text-sm font-medium text-ink-700">
        {label}
        {required && (
          <span className="text-brand-600" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{hint}</p>}
    </div>
  );
}

type WithIcon = { icon?: LucideIcon };

export function Input({ icon: Icon, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & WithIcon) {
  if (!Icon) return <input {...props} className={`${inputClass} ${className}`} />;
  return (
    <div className="relative">
      <Icon size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-400" />
      <input {...props} className={`${inputClass} pl-11 ${className}`} />
    </div>
  );
}

export function Textarea({
  icon: Icon,
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & WithIcon) {
  if (!Icon) return <textarea {...props} className={`${inputClass} ${className}`} />;
  return (
    <div className="relative">
      <Icon size={18} className="pointer-events-none absolute top-3.5 left-3.5 text-ink-400" />
      <textarea {...props} className={`${inputClass} pl-11 ${className}`} />
    </div>
  );
}

export function Select({
  icon: Icon,
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & WithIcon) {
  return (
    <div className="relative">
      {Icon && (
        <Icon size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-400" />
      )}
      <select {...props} className={`${inputClass} ${Icon ? 'pl-11' : ''} cursor-pointer appearance-none pr-10 ${className}`}>
        {children}
      </select>
      <ChevronDown size={18} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-400" />
    </div>
  );
}

/** Password field with its own reveal toggle, so callers don't each track it. */
export function PasswordInput({
  icon: Icon,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & WithIcon) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      {Icon && (
        <Icon size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-400" />
      )}
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`${inputClass} ${Icon ? 'pl-11' : ''} pr-12 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
        className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

/**
 * Date field that always reads দিন/মাস/বছর.
 *
 * `<input type="date">` renders its text using the BROWSER's locale, not the
 * page's — on a machine set to US English it shows mm/dd/yyyy no matter what
 * the site does. That is why dates looked scrambled even after every
 * `toLocaleDateString` call was replaced: this widget was never ours to format.
 *
 * The native input is kept (so the OS date picker, keyboard entry and mobile
 * wheel all still work) but made transparent and laid over our own text, which
 * is formatted with the same helper the rest of the site uses.
 */
export function DateInput({
  value,
  onChange,
  id,
  min,
  max,
  required,
  disabled,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  /** Opens the OS picker from anywhere in the field, not just the tiny icon. */
  const openPicker = () => {
    const el = ref.current;
    if (!el || disabled) return;
    try {
      // Chrome/Edge/Safari 16+. Older browsers fall back to focus alone.
      el.showPicker?.();
    } catch {
      el.focus();
    }
  };

  return (
    <div
      className={`relative ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      onClick={openPicker}
    >
      <input
        ref={ref}
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        required={required}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        // Transparent but still focusable, clickable and keyboard-operable.
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
      <div
        aria-hidden
        className={`${inputClass} pointer-events-none flex items-center gap-2.5 ${
          disabled ? 'bg-ink-50 text-ink-500' : ''
        }`}
      >
        <CalendarDays size={18} className="shrink-0 text-ink-400" />
        <span className={value ? 'text-ink-900' : 'text-ink-400'}>
          {value ? bengaliDateNumeric(value) : 'দিন/মাস/বছর'}
        </span>
      </div>
    </div>
  );
}
