'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  CalendarRange,
  ChevronRight,
  LayoutDashboard,
  LogIn,
  Menu,
  ShoppingBag,
  UserRound,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { displayName, useSession } from '@/lib/useSession';
import logo from '../../../public/Images/logo.jpg';

const NAV_LINKS = [
  { name: 'হোম', href: '/', icon: UtensilsCrossed },
  { name: 'অর্ডার', href: '/order', icon: ShoppingBag },
  { name: 'গেস্ট মিল', href: '/guest-meal', icon: Users },
  { name: 'সাবস্ক্রিপশন', href: '/subscription', icon: CalendarRange },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const { user } = useSession();
  const name = displayName(user);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const accountHref = user ? '/dashboard/profile' : '/login';

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

        {/* Desktop links */}
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
              className="hidden items-center gap-2 rounded-full border border-ink-200 bg-white py-1.5 pr-4 pl-1.5 transition-colors hover:border-brand-300 sm:flex"
            >
              <span className="grid size-8 place-items-center rounded-full bg-brand-100 text-brand-700">
                <UserRound size={16} />
              </span>
              <span className="max-w-28 truncate text-sm font-medium text-ink-800">{name}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="hidden items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100 sm:flex"
            >
              <LogIn size={16} />
              লগইন
            </Link>
          )}

          <Link
            href="/order"
            className="hidden rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 md:inline-flex"
          >
            অর্ডার করুন
          </Link>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid size-10 place-items-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 lg:hidden"
            aria-label="মেনু খুলুন"
            aria-expanded={open}
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-[2px] transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-[19rem] max-w-[85vw] flex-col bg-cream shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4">
          <span className="text-lg font-bold text-ink-900">মেনু</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid size-9 place-items-center rounded-full text-ink-600 hover:bg-ink-100"
            aria-label="মেনু বন্ধ করুন"
            tabIndex={open ? 0 : -1}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              tabIndex={open ? 0 : -1}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium transition-colors ${
                isActive(link.href) ? 'bg-brand-600 text-white' : 'text-ink-700 hover:bg-ink-100'
              }`}
            >
              <link.icon size={19} />
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="space-y-3 border-t border-ink-200 p-4">
          <button
            type="button"
            tabIndex={open ? 0 : -1}
            onClick={() => {
              setOpen(false);
              router.push(accountHref);
            }}
            className="flex w-full items-center gap-3 rounded-xl border border-ink-200 bg-white p-3 text-left transition-colors hover:border-brand-300"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
              {user ? <LayoutDashboard size={18} /> : <LogIn size={18} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink-900">
                {user ? name : 'লগইন / সাইনআপ'}
              </span>
              <span className="block text-xs text-ink-500">
                {user ? 'ড্যাশবোর্ড ও প্রোফাইল' : 'অ্যাকাউন্টে প্রবেশ করুন'}
              </span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-ink-400" />
          </button>

          <Link
            href="/order"
            tabIndex={open ? 0 : -1}
            onClick={() => setOpen(false)}
            className="block rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-brand-700"
          >
            অর্ডার করুন
          </Link>
        </div>
      </aside>
    </nav>
  );
}
