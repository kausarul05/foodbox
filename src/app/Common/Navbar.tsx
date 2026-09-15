'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { CalendarRange, LogIn, ShoppingBag, UserRound, Users, UtensilsCrossed } from 'lucide-react';
import { displayName, useSession } from '@/lib/useSession';
import logo from '../../../public/Images/logo.jpg';

const NAV_LINKS = [
  { name: 'হোম', href: '/', icon: UtensilsCrossed },
  { name: 'অর্ডার', href: '/order', icon: ShoppingBag },
  { name: 'গেস্ট মিল', href: '/guest-meal', icon: Users },
  { name: 'সাবস্ক্রিপশন', href: '/subscription', icon: CalendarRange },
];

/**
 * Top bar. On phones this is only the brand and the order button — navigation
 * lives in MobileTabBar.
 *
 * The hamburger drawer that used to sit here was removed once the tab bar
 * landed: every link in it was already either a tab (home, order,
 * subscription, account) or in the footer (guest meal), so it was a second
 * hidden copy of the same menu. Two competing navigations on one small screen
 * is worse than one obvious one.
 */
export default function Navbar() {
  const pathname = usePathname();
  const { user } = useSession();
  const name = displayName(user);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <nav className="border-b border-ink-200/70 bg-cream/90 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4 md:h-[4.5rem]">
        {/* Brand */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image
            src={logo}
            alt=""
            width={40}
            height={40}
            className="size-9 rounded-xl object-cover ring-1 ring-ink-200 md:size-10"
            priority
          />
          <span className="flex flex-col leading-none">
            <span className="text-lg font-bold tracking-tight text-ink-900 md:text-xl">FoodBox</span>
            <span className="mt-0.5 text-[11px] font-medium text-ink-500">ঘরের মতো রান্না</span>
          </span>
        </Link>

        {/* Desktop links — the tab bar covers these on phones. */}
        <div className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? 'page' : undefined}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? 'bg-brand-100 text-brand-800'
                  : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {user ? (
            <Link
              href="/dashboard/profile"
              className="hidden items-center gap-2 rounded-full border border-ink-200 bg-white py-1.5 pr-4 pl-1.5 transition-colors hover:border-brand-300 lg:flex"
            >
              <span className="grid size-8 place-items-center rounded-full bg-brand-100 text-brand-700">
                <UserRound size={16} />
              </span>
              <span className="max-w-28 truncate text-sm font-medium text-ink-800">{name}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="hidden items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100 lg:flex"
            >
              <LogIn size={16} />
              লগইন
            </Link>
          )}

          <Link
            href="/order"
            className="inline-flex shrink-0 rounded-full bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 sm:px-5 sm:py-2.5 sm:text-sm"
          >
            অর্ডার করুন
          </Link>
        </div>
      </div>
    </nav>
  );
}
