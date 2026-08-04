import type { ReactNode } from 'react';

/**
 * The banner every inner page opens with (/order, /subscription, /guest-meal).
 * Gives them the same entry rhythm as the home page's hero without repeating
 * the hero itself.
 */
export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Optional CTAs or badges under the copy. */
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-ink-100 bg-grain">
      <div className="container-page py-12 text-center md:py-16">
        {eyebrow && (
          <span className="inline-flex items-center rounded-full bg-brand-100 px-3.5 py-1 text-xs font-semibold tracking-wide text-brand-700">
            {eyebrow}
          </span>
        )}
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-balance text-ink-900 sm:text-4xl md:text-[2.75rem]">
          {title}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-pretty text-ink-600">{subtitle}</p>
        )}
        {children && <div className="mt-7 flex flex-wrap justify-center gap-3">{children}</div>}
      </div>
    </section>
  );
}
