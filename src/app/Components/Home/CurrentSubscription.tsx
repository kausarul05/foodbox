'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarCheck, Clock, PackageX, Utensils, Wallet } from 'lucide-react';
import { buttonClass } from '@/components/ui/Button';
import { bengaliDate, bn, taka } from '@/lib/format';
import { paymentLabel } from '@/lib/payment';
import { useMySubscription, type MySubscription } from '@/lib/useMySubscription';

const DAY_MS = 24 * 60 * 60 * 1000;

function Fact({ label, value, tone = 'text-ink-900' }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className={`mt-0.5 font-bold ${tone}`}>{value}</dd>
    </div>
  );
}

/**
 * "Your subscription", at the top of /subscription.
 *
 * The page used to show only the list of packages, so a customer who was
 * already subscribed saw the same "subscribe" cards as anyone else and had no
 * way to tell what they had, until when, or whether a request was still waiting
 * for approval. Renders nothing for a visitor who is not logged in or who has
 * never subscribed.
 */
export default function CurrentSubscription() {
  const { subscription: sub, loading } = useMySubscription();

  if (loading) {
    return (
      <div className="container-page pt-10">
        <div className="h-44 animate-pulse rounded-3xl bg-ink-100" />
      </div>
    );
  }
  if (!sub) return null;

  const name = sub.packageName || sub.package;

  return (
    <div className="container-page pt-10">
      {sub.status === 'active' ? (
        <ActiveCard sub={sub} name={name} />
      ) : sub.status === 'pending' ? (
        <PendingCard sub={sub} name={name} />
      ) : (
        <EndedCard sub={sub} name={name} />
      )}
    </div>
  );
}

function ActiveCard({ sub, name }: { sub: MySubscription; name: string }) {
  const start = new Date(sub.startDate).getTime();
  const end = new Date(sub.endDate).getTime();
  // "Now" is read once, as the initial state, rather than on every render.
  const [now] = useState(() => Date.now());
  const total = Math.max(end - start, DAY_MS);
  const left = Math.ceil((end - now) / DAY_MS);
  const over = left < 0;
  const used = Math.min(Math.max((now - start) / total, 0), 1);

  return (
    <section className="rounded-3xl border border-leaf-200 bg-leaf-50 p-6 shadow-card sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-leaf-600 text-white">
            <CalendarCheck size={22} />
          </span>
          <div>
            <p className="text-xs font-semibold tracking-wide text-leaf-700">আপনার বর্তমান সাবস্ক্রিপশন</p>
            <h2 className="text-xl font-bold text-ink-900">{name}</h2>
          </div>
        </div>
        <span className="rounded-full bg-leaf-600 px-3 py-1 text-xs font-semibold text-white">চালু আছে</span>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
        <Fact label="শুরু" value={bengaliDate(sub.startDate)} />
        <Fact label="শেষ" value={bengaliDate(sub.endDate)} />
        <Fact
          label="বাকি আছে"
          value={over ? 'মেয়াদ পেরিয়ে গেছে' : left === 0 ? 'আজই শেষ' : `${bn(left)} দিন`}
          tone={over || left <= 3 ? 'text-amber-700' : 'text-leaf-700'}
        />
        <Fact label="প্যাকেজের মূল্য" value={taka(sub.amount)} />
      </dl>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-leaf-500" style={{ width: `${Math.round(used * 100)}%` }} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/order" className={buttonClass('primary', 'md')}>
          <Utensils size={16} />
          অর্ডার করুন
        </Link>
        <Link href="/dashboard/wallet" className={buttonClass('secondary', 'md')}>
          <Wallet size={16} />
          ওয়ালেট দেখুন
        </Link>
      </div>
    </section>
  );
}

function PendingCard({ sub, name }: { sub: MySubscription; name: string }) {
  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-card sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-amber-500 text-white">
            <Clock size={22} />
          </span>
          <div>
            <p className="text-xs font-semibold tracking-wide text-amber-800">আপনার সাবস্ক্রিপশন রিকোয়েস্ট</p>
            <h2 className="text-xl font-bold text-ink-900">{name}</h2>
          </div>
        </div>
        <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white">
          অনুমোদনের অপেক্ষায়
        </span>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
        <Fact label="প্যাকেজের মূল্য" value={taka(sub.amount)} />
        <Fact label="পেমেন্টের মাধ্যম" value={paymentLabel(sub.paymentMethod)} />
        {sub.createdAt && <Fact label="রিকোয়েস্টের তারিখ" value={bengaliDate(sub.createdAt)} />}
      </dl>

      <p className="mt-5 text-sm leading-relaxed text-amber-900">
        অ্যাডমিন পেমেন্ট যাচাই করে অনুমোদন দিলে সাবস্ক্রিপশন চালু হবে। ততক্ষণ নতুন রিকোয়েস্ট পাঠানো যাবে না।
      </p>
    </section>
  );
}

function EndedCard({ sub, name }: { sub: MySubscription; name: string }) {
  const cancelled = sub.status === 'cancelled';
  return (
    <section className="rounded-3xl border border-ink-200 bg-white p-6 shadow-card sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-ink-100 text-ink-500">
            <PackageX size={22} />
          </span>
          <div>
            <p className="text-xs font-semibold tracking-wide text-ink-500">আপনার আগের সাবস্ক্রিপশন</p>
            <h2 className="text-xl font-bold text-ink-900">{name}</h2>
          </div>
        </div>
        <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700">
          {cancelled ? 'বাতিল হয়েছে' : 'মেয়াদ শেষ'}
        </span>
      </div>

      {cancelled && sub.cancellationReason && (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">কারণ: {sub.cancellationReason}</p>
      )}
      {!cancelled && sub.endDate && (
        <p className="mt-4 text-sm text-ink-600">{bengaliDate(sub.endDate)} তারিখে মেয়াদ শেষ হয়েছে।</p>
      )}
      <p className="mt-3 text-sm text-ink-600">নতুন করে সাবস্ক্রাইব করতে নিচ থেকে একটি প্যাকেজ বেছে নিন।</p>
    </section>
  );
}
