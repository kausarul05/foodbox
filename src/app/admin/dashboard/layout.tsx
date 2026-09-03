'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Header from '../components/admin/Header';
import Sidebar from '../components/admin/Sidebar';
import { QUICK_NAV } from '../components/admin/nav-items';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'সুপার অ্যাডমিন',
  manager: 'ম্যানেজার',
  support: 'সাপোর্ট',
};

export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [admin, setAdmin] = useState<{ fullName?: string; role?: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.replace('/admin/login');
      return;
    }
    try {
      setAdmin(JSON.parse(localStorage.getItem('adminData') ?? '{}'));
    } catch {
      setAdmin({});
    }
    setReady(true);
  }, [router]);

  // Any navigation closes the drawer; without this it stays open over the new page.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-50">
        <div className="size-10 animate-spin rounded-full border-2 border-ink-200 border-t-brand-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Desktop column. Fixed so the long page bodies scroll independently. */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block">
        <Sidebar />
      </div>

      {/*
        Phone drawer. Kept outside every blurred/transformed ancestor — those
        create a containing block for position:fixed and would collapse this
        panel into the header strip instead of the full viewport.
      */}
      <div
        onClick={() => setDrawerOpen(false)}
        aria-hidden
        className={`fixed inset-0 z-40 bg-ink-900/50 transition-opacity lg:hidden ${
          drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-out lg:hidden ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!drawerOpen}
      >
        <Sidebar onNavigate={() => setDrawerOpen(false)} />
      </div>

      <div className="lg:pl-72">
        <Header
          onMenuClick={() => setDrawerOpen(true)}
          adminName={admin?.fullName || 'অ্যাডমিন'}
          adminRole={ROLE_LABELS[admin?.role ?? ''] ?? 'অ্যাডমিন'}
        />

        {/* pb-24 clears the phone bottom bar so nothing hides behind it. */}
        <main className="px-4 py-5 pb-24 sm:px-6 sm:py-6 lg:pb-8">{children}</main>
      </div>

      {/* Bottom bar: the four daily screens, one thumb-reach away on a phone. */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white lg:hidden">
        <ul className="grid grid-cols-4">
          {QUICK_NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                    active ? 'text-brand-700' : 'text-ink-500'
                  }`}
                >
                  <item.icon size={19} />
                  <span className="max-w-full truncate px-1">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
