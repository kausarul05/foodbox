'use client';

import { usePathname } from 'next/navigation';
import { Menu, UserRound } from 'lucide-react';
import { NAV_GROUPS } from './nav-items';

/** Page title comes from the nav config, so it can never drift from the menu. */
function titleFor(pathname: string) {
  for (const group of NAV_GROUPS) {
    const match = group.items.find((item) => item.href === pathname);
    if (match) return match.name;
  }
  return 'অ্যাডমিন';
}

export default function Header({
  onMenuClick,
  adminName,
  adminRole,
}: {
  onMenuClick: () => void;
  adminName: string;
  adminRole: string;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200 bg-white">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="মেনু খুলুন"
          className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-700 transition-colors hover:bg-ink-100 lg:hidden"
        >
          <Menu size={22} />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold text-ink-900 sm:text-lg">{titleFor(pathname)}</h1>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <span className="hidden text-right sm:block">
            <span className="block max-w-40 truncate text-sm font-semibold text-ink-900">{adminName}</span>
            <span className="block text-xs text-ink-500">{adminRole}</span>
          </span>
          <span className="grid size-9 place-items-center rounded-full bg-brand-100 text-brand-700">
            <UserRound size={18} />
          </span>
        </div>
      </div>
    </header>
  );
}
