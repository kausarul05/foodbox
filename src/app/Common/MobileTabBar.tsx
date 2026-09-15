'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarRange, Home, ShoppingBag, User, UtensilsCrossed } from 'lucide-react';
import { useSession } from '@/lib/useSession';

/**
 * Phone-only tab bar.
 *
 * Almost every customer is on a phone, where the only way to reach anything
 * was the hamburger drawer — two taps and a hidden menu for the five screens
 * people actually use. These sit under the thumb instead.
 *
 * Hidden from `lg` up, where the navbar already shows the same links.
 */
const TABS = [
  { name: 'হোম', href: '/', icon: Home },
  { name: 'মেনু', href: '/#weekly-menu', icon: UtensilsCrossed, match: '/#weekly-menu' },
  { name: 'অর্ডার', href: '/order', icon: ShoppingBag },
  { name: 'সাবস্ক্রিপশন', href: '/subscription', icon: CalendarRange },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const { user } = useSession();

  /** The account tab points at the dashboard or at login, never at a dead end. */
  const accountTab = {
    name: user ? 'অ্যাকাউন্ট' : 'লগইন',
    href: user ? '/dashboard/profile' : '/login',
    icon: User,
  };

  const isActive = (href: string) => {
    if (href.includes('#')) return false; // an anchor is never a "current page"
    if (href === '/') return pathname === '/';
    if (href === '/dashboard/profile') return pathname.startsWith('/dashboard');
    return pathname.startsWith(href);
  };

  // The tab bar would cover the order form's own sticky action bar.
  if (pathname.startsWith('/order')) return null;

  return (
    <nav
      aria-label="প্রধান মেনু"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-cream/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {[...TABS, accountTab].map((tab) => {
          const active = isActive(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 py-2 transition-colors ${
                  active ? 'text-brand-700' : 'text-ink-500'
                }`}
              >
                <span
                  className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${
                    active ? 'bg-brand-100' : ''
                  }`}
                >
                  <tab.icon size={19} strokeWidth={active ? 2.4 : 2} />
                </span>
                <span className="max-w-full truncate px-0.5 text-[10.5px] font-medium">{tab.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
