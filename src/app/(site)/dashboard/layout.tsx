'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, ShoppingBag, User, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '@/lib/api';
import { clearSession, displayName, useSession } from '@/lib/useSession';

const NAV_ITEMS = [
  { name: 'প্রোফাইল', href: '/dashboard/profile', icon: User },
  { name: 'ওয়ালেট', href: '/dashboard/wallet', icon: Wallet },
  { name: 'আমার অর্ডার', href: '/dashboard/orders', icon: ShoppingBag },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hydrated } = useSession();

  /**
   * UX-only guard. The real boundary is the `requireUser` check inside every
   * /api route — the token lives in localStorage, so middleware cannot see it.
   * Waits for `hydrated` so a logged-in user is never bounced mid-hydration.
   */
  useEffect(() => {
    if (hydrated && !user) {
      toast.error('দয়া করে লগইন করুন');
      router.replace('/login');
    }
  }, [hydrated, user, router]);

  const handleLogout = () => {
    authAPI.logout();
    clearSession();
    toast.success('লগআউট সফল!');
    window.location.href = '/';
  };

  if (!user) {
    return (
      <div className="container-page py-24">
        <div className="mx-auto h-40 max-w-md animate-pulse rounded-3xl bg-ink-100" />
      </div>
    );
  }

  const packageLabel = user.package
    ? user.package === 'golden'
      ? 'গোল্ডেন প্যাকেজ'
      : 'ডায়মন্ড প্যাকেজ'
    : 'কোনো প্যাকেজ নেই';

  return (
    <div className="bg-ink-50/60">
      <div className="container-page py-8 md:py-12">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Sidebar */}
          <aside className="lg:w-72 lg:shrink-0">
            <div className="lg:sticky lg:top-32">
              <div className="overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-card">
                <div className="flex items-center gap-4 border-b border-ink-100 bg-brand-50 px-5 py-5">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-600 text-white">
                    <User size={22} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink-900">{displayName(user)}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-600">{packageLabel}</p>
                  </div>
                </div>

                {/* Scrolls sideways on phones, stacks from lg up. */}
                <nav className="no-scrollbar flex gap-1 overflow-x-auto p-3 lg:flex-col">
                  {NAV_ITEMS.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                          active ? 'bg-brand-600 text-white' : 'text-ink-700 hover:bg-ink-100'
                        }`}
                      >
                        <item.icon size={18} />
                        {item.name}
                      </Link>
                    );
                  })}
                </nav>

                <div className="border-t border-ink-100 p-3">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    <LogOut size={18} />
                    লগআউট
                  </button>
                </div>
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
