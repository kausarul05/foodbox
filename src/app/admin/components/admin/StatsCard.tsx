import type { LucideIcon } from 'lucide-react';

const TONES = {
  brand: 'bg-brand-100 text-brand-700',
  leaf: 'bg-leaf-100 text-leaf-700',
  sky: 'bg-sky-100 text-sky-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
} as const;

export default function StatsCard({
  title,
  value,
  icon: Icon,
  tone = 'brand',
  hint,
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-ink-500">{title}</p>
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${TONES[tone]}`}>
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}
