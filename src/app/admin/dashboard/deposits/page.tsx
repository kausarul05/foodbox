'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { History, Loader2, PackageCheck, PackageX, Phone, RefreshCw, RotateCcw, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { depositAPI } from '@/app/admin/lib/api';
import { EmptyState, LoadingBlock, Pill, type Tone } from '@/app/admin/components/ui/Shell';
import { useDialog } from '@/components/ui/DialogProvider';
import { bengaliDateTime, bn, taka } from '@/lib/format';
import { BOX_DEPOSIT } from '@/lib/rules';

/**
 * Food-box security deposits.
 *
 * Every subscriber's box holds BOX_DEPOSIT of their wallet. From here an admin sees
 * who holds what, who still owes part of it, and acts when a box comes back
 * (refund), goes missing or breaks (deduct), or was handed to someone who
 * subscribed before deposits existed (hold). Every action is in the history
 * at the bottom. Money rules: src/server/deposit.ts.
 */

type DepositStatus = 'none' | 'active' | 'deducted' | 'refunded';

interface Row {
  userId: string;
  fullName: string;
  phoneNumber: string;
  balance: number;
  reserved: number;
  deposit: { status: DepositStatus; required: number; frozen: number; due: number };
  subscription: { status: string; packageName?: string } | null;
}

interface DepositEvent {
  _id: string;
  userId: string;
  userName: string;
  phoneNumber?: string;
  type: 'hold' | 'deduct' | 'refund';
  amount: number;
  reason?: string;
  byAdminName: string;
  createdAt: string;
}

const STATUS_META: Record<DepositStatus, { label: string; tone: Tone }> = {
  active: { label: 'বক্স গ্রাহকের কাছে', tone: 'info' },
  none: { label: 'ডিপোজিট নেওয়া হয়নি', tone: 'neutral' },
  refunded: { label: 'বক্স ফেরত, টাকা ছাড়া হয়েছে', tone: 'success' },
  deducted: { label: 'বক্স হারানো/ভাঙা, টাকা কাটা', tone: 'danger' },
};

const EVENT_META: Record<DepositEvent['type'], { label: string; tone: Tone }> = {
  hold: { label: 'আটকানো', tone: 'info' },
  refund: { label: 'ফেরত', tone: 'success' },
  deduct: { label: 'কাটা', tone: 'danger' },
};

const SUB_LABEL: Record<string, string> = {
  active: 'সক্রিয়',
  pending: 'পেন্ডিং',
  expired: 'মেয়াদ শেষ',
  cancelled: 'বাতিল',
  rejected: 'বাতিল',
};

type Filter = 'all' | 'active' | 'due' | 'none' | 'refunded' | 'deducted';

export default function DepositsPage() {
  const { confirm, promptText } = useDialog();
  const [rows, setRows] = useState<Row[]>([]);
  const [events, setEvents] = useState<DepositEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [historyFor, setHistoryFor] = useState<Row | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await depositAPI.getAll();
      if (res.success) {
        setRows(res.data.rows ?? []);
        setEvents(res.data.events ?? []);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ডিপোজিট লোড করা যায়নি');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.deposit.status === 'active');
    return {
      active: active.length,
      frozen: active.reduce((n, r) => n + r.deposit.frozen, 0),
      due: active.reduce((n, r) => n + r.deposit.due, 0),
      dueCount: active.filter((r) => r.deposit.due > 0).length,
      deducted: events.filter((e) => e.type === 'deduct').reduce((n, e) => n + e.amount, 0),
      refunded: events.filter((e) => e.type === 'refund').reduce((n, e) => n + e.amount, 0),
    };
  }, [rows, events]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (filter === 'due') return r.deposit.status === 'active' && r.deposit.due > 0;
        if (filter !== 'all' && r.deposit.status !== filter) return false;
        return true;
      })
      .filter((r) => !term || r.fullName.toLowerCase().includes(term) || r.phoneNumber.includes(term))
      // Something to do first: owing, then holding a box, then the rest.
      .sort((a, b) => {
        const rank = (r: Row) => (r.deposit.due > 0 ? 0 : r.deposit.status === 'active' ? 1 : 2);
        return rank(a) - rank(b) || a.fullName.localeCompare(b.fullName);
      });
  }, [rows, filter, search]);

  const act = async (row: Row, action: 'hold' | 'refund' | 'deduct') => {
    let reason: string | undefined;
    let amount: number | undefined;

    if (action === 'hold') {
      const ok = await confirm({
        title: 'বক্সের ডিপোজিট নেবেন?',
        message: `${row.fullName}-এর ওয়ালেট থেকে ${taka(BOX_DEPOSIT)} আটকে রাখা হবে। টাকা ওয়ালেটেই থাকবে, কিন্তু অর্ডারে খরচ করা যাবে না।${
          row.balance - row.reserved < BOX_DEPOSIT ? ' ওয়ালেটে যথেষ্ট টাকা নেই — বাকিটা পরের রিচার্জ থেকে পূরণ হবে।' : ''
        }`,
        confirmLabel: 'ডিপোজিট নিন',
      });
      if (!ok) return;
    }

    if (action === 'refund') {
      const ok = await confirm({
        title: 'বক্স ঠিকমতো ফেরত পেয়েছেন?',
        message: `${row.fullName}-এর আটকানো ${taka(row.deposit.required)} ছেড়ে দেওয়া হবে। টাকাটা ওয়ালেটেই আছে, এখন থেকে অর্ডারে খরচ করা যাবে।`,
        confirmLabel: 'হ্যাঁ, ফেরত দিন',
      });
      if (!ok) return;
    }

    if (action === 'deduct') {
      const raw = await promptText({
        title: 'বক্স হারিয়েছে বা ভেঙেছে?',
        message: `${row.fullName}-এর ওয়ালেট থেকে টাকা কাটা হবে। পুরো ডিপোজিট না কাটতে চাইলে পরিমাণ বদলে দিন।`,
        label: 'কাটার পরিমাণ (টাকা)',
        input: 'number',
        defaultValue: String(row.deposit.required),
        required: true,
        confirmLabel: 'পরের ধাপ',
        tone: 'danger',
      });
      if (raw === null) return;
      amount = Number(raw);
      if (!Number.isFinite(amount) || amount <= 0 || amount > row.deposit.required) {
        toast.error(`১ থেকে ${bn(row.deposit.required)} টাকার মধ্যে দিন`);
        return;
      }
      const why = await promptText({
        title: `${taka(amount)} কাটবেন?`,
        message: 'কারণটি ইতিহাসে থাকবে।',
        label: 'কারণ',
        placeholder: 'যেমন: বক্স হারিয়ে গেছে / ঢাকনা ভাঙা',
        input: 'textarea',
        required: true,
        confirmLabel: 'টাকা কাটুন',
        tone: 'danger',
      });
      if (why === null) return;
      reason = why;
    }

    try {
      setBusy(row.userId);
      const res = await depositAPI.act(row.userId, action, { reason, amount });
      if (res.success) {
        toast.success(
          action === 'hold'
            ? 'ডিপোজিট আটকানো হয়েছে'
            : action === 'refund'
              ? 'ডিপোজিট ফেরত দেওয়া হয়েছে'
              : `${taka(res.data?.amount ?? amount ?? 0)} কাটা হয়েছে`
        );
        await load();
      } else {
        toast.error(res.message || 'করা যায়নি');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'করা যায়নি');
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <LoadingBlock rows={5} />;

  const FILTERS: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'সব', count: rows.length },
    { key: 'active', label: 'বক্স গ্রাহকের কাছে', count: stats.active },
    { key: 'due', label: 'ডিপোজিট বাকি', count: stats.dueCount },
    { key: 'none', label: 'নেওয়া হয়নি', count: rows.filter((r) => r.deposit.status === 'none').length },
    { key: 'refunded', label: 'ফেরত', count: rows.filter((r) => r.deposit.status === 'refunded').length },
    { key: 'deducted', label: 'কাটা', count: rows.filter((r) => r.deposit.status === 'deducted').length },
  ];

  const historyRows = historyFor ? events.filter((e) => e.userId === historyFor.userId) : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">বক্স ডিপোজিট</h1>
          <p className="text-ink-500">প্রতি সাবস্ক্রাইবারের খাবারের বক্সের জন্য {taka(BOX_DEPOSIT)} সিকিউরিটি ডিপোজিট</p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            void load();
          }}
          className="flex items-center gap-2 rounded-lg bg-ink-100 px-4 py-2 hover:bg-ink-200"
        >
          <RefreshCw size={18} />
          রিফ্রেশ
        </button>
      </div>

      {/* Totals */}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: 'বক্স গ্রাহকের কাছে', value: `${bn(stats.active)}টি`, tone: 'text-ink-900' },
          { label: 'মোট আটকানো টাকা', value: taka(stats.frozen), tone: 'text-sky-800' },
          { label: 'ডিপোজিট বাকি', value: taka(stats.due), tone: stats.due ? 'text-amber-700' : 'text-ink-900' },
          { label: 'মোট কাটা হয়েছে', value: taka(stats.deducted), tone: 'text-red-700' },
          { label: 'মোট ফেরত দেওয়া', value: taka(stats.refunded), tone: 'text-leaf-700' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-ink-200 bg-white p-4 shadow-card">
            <dt className="text-xs text-ink-500">{s.label}</dt>
            <dd className={`mt-1 text-xl font-bold ${s.tone}`}>{s.value}</dd>
          </div>
        ))}
      </dl>

      {/* Filters */}
      <div className="space-y-3 rounded-2xl border border-ink-200 bg-white p-4 shadow-card">
        <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-ink-100 p-1">
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(f.key)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  active ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-600 hover:text-ink-900'
                }`}
              >
                {f.label}
                <span className={`ml-1.5 text-xs ${active ? 'text-brand-700' : 'text-ink-400'}`}>{bn(f.count)}</span>
              </button>
            );
          })}
        </div>
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="নাম বা ফোন নাম্বার..."
            aria-label="গ্রাহক খুঁজুন"
            className="w-full rounded-xl border border-ink-200 py-2.5 pr-4 pl-10 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/25 focus:outline-none"
          />
        </div>
      </div>

      {/*
        Nobody's deposit is held until it is taken: new subscribers get it on
        approval, everyone who subscribed earlier needs the button. Said up
        front, because a page of ৳০ looks broken rather than "not started".
      */}
      {stats.active === 0 && rows.some((r) => r.deposit.status === 'none') && (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <PackageCheck size={20} className="mt-0.5 shrink-0 text-amber-700" />
          <p>
            এখনো কারো ডিপোজিট নেওয়া হয়নি, তাই আটকানো ও বাকি দেখাচ্ছে না। নতুন সাবস্ক্রিপশন অনুমোদন করলে ডিপোজিট নিজে থেকে
            আটকে যায়। আগের সাবস্ক্রাইবারদের মধ্যে যার কাছে বক্স আছে, তার পাশে <b>“ডিপোজিট নিন”</b> চাপুন — তখন তার
            ওয়ালেটের {taka(BOX_DEPOSIT)} আটকানো দেখাবে।
          </p>
        </div>
      )}

      {/* Subscribers */}
      {visible.length === 0 ? (
        <EmptyState icon={PackageCheck} title="কেউ নেই" hint="এই ফিল্টারে কোনো গ্রাহক পাওয়া যায়নি।" />
      ) : (
        <ul className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card">
          {visible.map((row) => {
            const meta = STATUS_META[row.deposit.status];
            const isBusy = busy === row.userId;
            const holding = row.deposit.status === 'active';

            return (
              <li key={row.userId} className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink-900">{row.fullName}</span>
                    {row.subscription && (
                      <span className="text-xs text-ink-500">
                        {row.subscription.packageName} · {SUB_LABEL[row.subscription.status] ?? row.subscription.status}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-600">
                    <span className="inline-flex items-center gap-1">
                      <Phone size={12} className="text-ink-400" />
                      {row.phoneNumber}
                    </span>
                    <Pill tone={meta.tone}>{meta.label}</Pill>
                  </p>
                </div>

                <dl className="grid grid-cols-3 gap-4 text-sm">
                  {/* Only meaningful while a deposit is held; a "৳০" here read as a bug. */}
                  <div>
                    <dt className="text-[11px] text-ink-500">আটকানো</dt>
                    <dd className={`font-bold ${holding ? 'text-sky-800' : 'text-ink-300'}`}>
                      {holding ? taka(row.deposit.frozen) : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-ink-500">বাকি</dt>
                    <dd className={`font-bold ${row.deposit.due ? 'text-amber-700' : 'text-ink-300'}`}>
                      {holding ? taka(row.deposit.due) : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-ink-500">ওয়ালেট</dt>
                    <dd className={`font-bold ${row.balance < 0 ? 'text-red-700' : 'text-ink-900'}`}>
                      {taka(row.balance)}
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-wrap items-center gap-2">
                  {holding ? (
                    <>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void act(row, 'refund')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-leaf-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-leaf-700 disabled:opacity-60"
                      >
                        <RotateCcw size={14} />
                        বক্স ফেরত
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void act(row, 'deduct')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        <PackageX size={14} />
                        হারানো/ভাঙা
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void act(row, 'hold')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                    >
                      <PackageCheck size={14} />
                      ডিপোজিট নিন
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setHistoryFor(row)}
                    aria-label={`${row.fullName}-এর ইতিহাস`}
                    className="grid size-8 place-items-center rounded-lg border border-ink-200 text-ink-600 hover:bg-ink-50"
                  >
                    {isBusy ? <Loader2 size={15} className="animate-spin" /> : <History size={15} />}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Full history */}
      <section className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card">
        <h2 className="flex items-center gap-2 border-b border-ink-100 px-4 py-3 font-bold text-ink-900">
          <History size={17} className="text-brand-600" />
          ডিপোজিটের ইতিহাস
        </h2>
        {events.length === 0 ? (
          <p className="p-6 text-center text-sm text-ink-500">এখনো কোনো ডিপোজিট নেওয়া, কাটা বা ফেরত দেওয়া হয়নি।</p>
        ) : (
          <EventList events={events} showName />
        )}
      </section>

      {/* One subscriber's history */}
      {historyFor && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/50 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="ডিপোজিটের ইতিহাস"
          onClick={() => setHistoryFor(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-ink-900">{historyFor.fullName}</h2>
                <p className="text-sm text-ink-500">
                  {STATUS_META[historyFor.deposit.status].label} · আটকানো {taka(historyFor.deposit.frozen)}
                  {historyFor.deposit.due > 0 && ` · বাকি ${taka(historyFor.deposit.due)}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryFor(null)}
                aria-label="বন্ধ করুন"
                className="grid size-8 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-ink-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto">
              {historyRows.length === 0 ? (
                <p className="p-6 text-center text-sm text-ink-500">এই গ্রাহকের কোনো ইতিহাস নেই।</p>
              ) : (
                <EventList events={historyRows} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EventList({ events, showName = false }: { events: DepositEvent[]; showName?: boolean }) {
  return (
    <ul className="divide-y divide-ink-100">
      {events.map((e) => {
        const meta = EVENT_META[e.type];
        return (
          <li key={e._id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2">
                <Pill tone={meta.tone}>{meta.label}</Pill>
                {showName && <span className="font-semibold text-ink-900">{e.userName}</span>}
                {showName && e.phoneNumber && <span className="text-xs text-ink-500">{e.phoneNumber}</span>}
              </p>
              {e.reason && <p className="mt-1 text-sm text-ink-700">{e.reason}</p>}
              <p className="mt-1 text-xs text-ink-500">
                {bengaliDateTime(e.createdAt)} · {e.byAdminName}
              </p>
            </div>
            <span
              className={`shrink-0 font-bold ${
                e.type === 'deduct' ? 'text-red-700' : e.type === 'refund' ? 'text-leaf-700' : 'text-ink-900'
              }`}
            >
              {e.type === 'deduct' ? '−' : ''}
              {taka(e.amount)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
