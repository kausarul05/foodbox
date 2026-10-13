import Link from 'next/link';
import { ArrowRight, BadgeCheck, CalendarDays, Check, HandCoins, Wallet } from 'lucide-react';
import { buttonClass } from '@/components/ui/Button';

/**
 * "You do not need a subscription to eat here."
 *
 * The packages section was the only thing on the page that looked like a way
 * in, so a visitor who did not want a monthly commitment had no reason to
 * believe they could order at all — even though cash on delivery is how most
 * orders in the database were actually placed. This sits right after the
 * packages and says so plainly.
 */
const COD_POINTS = [
  'যেদিন ইচ্ছা, সেদিন অর্ডার',
  'ডেলিভারির সময় টাকা দিন',
  'কোনো মাসিক চুক্তি নেই',
];

const SUBSCRIPTION_POINTS = [
  'ডেলিভারি চার্জ ফ্রি',
  'ওয়ালেট থেকে পেমেন্ট',
  'প্রতি বেলার খরচ কম',
];

export default function OrderWithoutPackage() {
  return (
    <section className="pb-16 md:pb-24">
      <div className="container-page">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Cash on delivery */}
          <article className="relative overflow-hidden rounded-3xl border-2 border-leaf-200 bg-white p-7 shadow-card">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf-100 px-3 py-1 text-xs font-semibold text-leaf-700">
              <HandCoins size={13} />
              প্যাকেজ ছাড়াই
            </span>

            <h3 className="mt-4 text-2xl font-bold tracking-tight text-ink-900">
              ক্যাশ অন ডেলিভারি
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
              সাবস্ক্রিপশন না নিলেও খাবার অর্ডার করতে পারবেন। মেনু থেকে বেছে নিন, খাবার হাতে
              পেয়ে টাকা দিন।
            </p>

            <ul className="mt-6 space-y-2.5">
              {COD_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-ink-700">
                  <Check size={17} className="mt-0.5 shrink-0 text-leaf-600" />
                  {point}
                </li>
              ))}
            </ul>

            <p className="mt-5 flex items-start gap-2 rounded-xl bg-leaf-50 p-3 text-xs leading-relaxed text-leaf-700">
              <CalendarDays size={14} className="mt-0.5 shrink-0" />
              শুধু প্রতি ডেলিভারিতে সামান্য ডেলিভারি চার্জ যোগ হবে।
            </p>

            <Link href="/order" className={buttonClass('primary', 'lg', 'mt-6 w-full sm:w-auto')}>
              এখনই অর্ডার করুন
              <ArrowRight size={17} />
            </Link>
          </article>

          {/* Subscription, for contrast */}
          <article className="rounded-3xl border border-ink-200 bg-ink-50/60 p-7">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
              <BadgeCheck size={13} />
              নিয়মিত খেলে
            </span>

            <h3 className="mt-4 text-2xl font-bold tracking-tight text-ink-900">সাবস্ক্রিপশন নিলে</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
              প্রতিদিন খেতে চাইলে প্যাকেজ নিলে খরচ কমে আর পেমেন্টের ঝামেলা থাকে না।
            </p>

            <ul className="mt-6 space-y-2.5">
              {SUBSCRIPTION_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-ink-700">
                  <Wallet size={16} className="mt-0.5 shrink-0 text-brand-600" />
                  {point}
                </li>
              ))}
            </ul>

            <Link href="#packages" className={buttonClass('secondary', 'lg', 'mt-6 w-full sm:w-auto')}>
              প্যাকেজ দেখুন
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}
