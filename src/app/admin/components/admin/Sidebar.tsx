'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Store, UtensilsCrossed, X } from 'lucide-react';
import { NAV_GROUPS } from './nav-items';

/**
 * Sidebar contents. Positioning (fixed drawer on phones, static column on
 * desktop) is the layout's job — this only renders the panel itself.
 */
export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    window.location.href = '/admin/login';
  };

  return (
    <div className="flex h-full w-72 flex-col bg-ink-900 text-white">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <Link href="/admin/dashboard" className="flex items-center gap-3" onClick={onNavigate}>
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-600">
            <UtensilsCrossed size={20} />
          </span>
          <span className="leading-tight">
            <span className="block font-bold">FoodBox</span>
            <span className="block text-xs text-ink-400">অ্যাডমিন প্যানেল</span>
          </span>
        </Link>

        {/* Only rendered as a drawer on phones, where a close affordance is needed. */}
        <button
          type="button"
          onClick={onNavigate}
          aria-label="মেনু বন্ধ করুন"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-300 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-ink-500 uppercase">
              {group.label}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                        active
                          ? 'bg-brand-600 font-semibold text-white'
                          : 'text-ink-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <item.icon size={18} className="shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-white/10 p-3">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Store size={18} />
          ওয়েবসাইট দেখুন
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-300 transition-colors hover:bg-red-500/15 hover:text-red-200"
        >
          <LogOut size={18} />
          লগআউট
        </button>
      </div>
    </div>
  );
}
