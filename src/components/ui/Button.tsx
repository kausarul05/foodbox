import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * The one button skin.
 *
 * Before this existed every page pasted its own
 * `bg-gradient-to-br from-[#3B82F6] to-[#111827] ...` string, so changing the
 * primary action meant a find-and-replace across a dozen files.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700',
  secondary: 'border border-ink-300 bg-white text-ink-800 hover:border-brand-400 hover:text-brand-700',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
  danger: 'bg-red-600 text-white shadow-sm shadow-red-600/25 hover:bg-red-700',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-[13px]',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3.5 text-base',
};

/** For `<Link>` and `<a>`, which cannot be a <button>. */
export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra = '') {
  return [
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition',
    'disabled:cursor-not-allowed disabled:opacity-60',
    VARIANTS[variant],
    SIZES[size],
    extra,
  ].join(' ');
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner in place of `icon` and disables the button. */
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  className = '',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={buttonClass(variant, size, `${fullWidth ? 'w-full' : ''} ${className}`)}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}
