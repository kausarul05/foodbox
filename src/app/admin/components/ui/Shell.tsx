import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/** Standard section container used by every admin page. */
export function Panel({
  title,
  action,
  children,
  className = '',
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-ink-200 bg-white p-4 shadow-card sm:p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="text-base font-bold text-ink-900">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Page-level intro: a sentence of context plus the primary action. */
export function PageIntro({ description, action }: { description: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-ink-600">{description}</p>
      {action}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-300 bg-white px-6 py-14 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-full bg-ink-100 text-ink-400">
        <Icon size={24} />
      </div>
      <p className="mt-4 font-semibold text-ink-900">{title}</p>
      {hint && <p className="mt-1 text-sm text-ink-500">{hint}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-ink-100" />
      ))}
    </div>
  );
}

const TONES = {
  neutral: 'bg-ink-100 text-ink-700',
  info: 'bg-sky-100 text-sky-800',
  success: 'bg-leaf-100 text-leaf-700',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-700',
  brand: 'bg-brand-100 text-brand-800',
} as const;

export type Tone = keyof typeof TONES;

export function Pill({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
