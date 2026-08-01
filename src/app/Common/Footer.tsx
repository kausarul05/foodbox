import Link from 'next/link';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { MEAL_SLOTS } from '@/lib/format';

const LINK_GROUPS = [
  {
    title: 'সার্ভিস',
    links: [
      { label: 'অর্ডার করুন', href: '/order' },
      { label: 'সাবস্ক্রিপশন', href: '/subscription' },
      { label: 'গেস্ট মিল', href: '/guest-meal' },
      { label: 'সাপ্তাহিক মেনু', href: '/#weekly-menu' },
    ],
  },
  {
    title: 'অ্যাকাউন্ট',
    links: [
      { label: 'লগইন', href: '/login' },
      { label: 'রেজিস্ট্রেশন', href: '/signup' },
      { label: 'আমার অর্ডার', href: '/dashboard/orders' },
      { label: 'ওয়ালেট', href: '/dashboard/wallet' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-ink-900 text-ink-300">
      <div className="container-page py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-4">
            <span className="text-2xl font-bold text-white">FoodBox</span>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-400">
              ময়মনসিংহে ঘরের মতো রান্না করা খাবারের সাবস্ক্রিপশন সার্ভিস। তাজা রান্না,
              সাশ্রয়ী দাম, সময়মতো ডেলিভারি।
            </p>
            <div className="mt-6 space-y-3 text-sm">
              <a href="tel:+8801868703130" className="flex items-center gap-3 transition-colors hover:text-brand-400">
                <Phone size={16} className="shrink-0 text-brand-500" />
                +8801868703130
              </a>
              <a
                href="mailto:foodbox947@gmail.com"
                className="flex items-center gap-3 break-all transition-colors hover:text-brand-400"
              >
                <Mail size={16} className="shrink-0 text-brand-500" />
                foodbox947@gmail.com
              </a>
              <p className="flex items-start gap-3 text-ink-400">
                <MapPin size={16} className="mt-0.5 shrink-0 text-brand-500" />
                Mile Quarter, Academic Road, Mymensingh Sadar
              </p>
            </div>
          </div>

          {/* Link groups */}
          {LINK_GROUPS.map((group) => (
            <div key={group.title} className="lg:col-span-2">
              <h3 className="text-sm font-semibold tracking-wide text-white uppercase">{group.title}</h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-ink-400 transition-colors hover:text-brand-400">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Ordering cut-offs — the single most-asked question, so it lives in
              the footer of every page rather than only on the home page. */}
          <div className="lg:col-span-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-white uppercase">
              <Clock size={15} className="text-brand-500" />
              অর্ডারের শেষ সময়
            </h3>
            <ul className="mt-4 space-y-2.5">
              {MEAL_SLOTS.map((slot) => (
                <li
                  key={slot.key}
                  className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3.5 py-2.5 text-sm"
                >
                  <span className="text-ink-300">{slot.label}</span>
                  <span className="text-right text-xs font-medium text-brand-400">{slot.cutoff}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-500">
              প্রতি মাসের ২য় ও শেষ শুক্রবার রান্নাঘর বন্ধ থাকে।
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} FoodBox. সর্বস্বত্ব সংরক্ষিত।</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="transition-colors hover:text-ink-300">
              প্রাইভেসি পলিসি
            </Link>
            <Link href="/terms" className="transition-colors hover:text-ink-300">
              টার্মস ও কন্ডিশনস
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
