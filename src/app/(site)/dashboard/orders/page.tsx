'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  MapPin,
  Moon,
  Package,
  Search,
  ShoppingBag,
  Sun,
  Trash2,
  Truck,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { orderAPI, zoneAPI } from '@/lib/api';
import Button, { buttonClass } from '@/components/ui/Button';
import { Select, Textarea } from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import { useDialog } from '@/components/ui/DialogProvider';
import { bengaliDate, bengaliWeekday, bn, taka, zoneLabel } from '@/lib/format';

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

interface Order {
  _id: string;
  orderId: string;
  deliveryDate: string;
  deliveryTime: string;
  items: Array<{ name: string; price?: number }>;
  status: string;
  totalAmount: number;
  address: string;
  zone: string;
  paymentMethod: string;
}

const STATUS = {
  pending: { label: 'পেন্ডিং', icon: Clock, className: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'কনফার্মড', icon: CheckCircle2, className: 'bg-sky-100 text-sky-800' },
  preparing: { label: 'রান্না হচ্ছে', icon: Package, className: 'bg-violet-100 text-violet-800' },
  out_for_delivery: { label: 'ডেলিভারিতে', icon: Truck, className: 'bg-indigo-100 text-indigo-800' },
  delivered: { label: 'ডেলিভারি হয়েছে', icon: CheckCircle2, className: 'bg-leaf-100 text-leaf-700' },
  cancelled: { label: 'বাতিল', icon: XCircle, className: 'bg-red-100 text-red-700' },
  returned: { label: 'ফেরত এসেছে', icon: XCircle, className: 'bg-ink-100 text-ink-700' },
} as const;

const MEALS = {
  morning: { label: 'সকালের খাবার', short: 'সকাল', icon: Coffee, tint: 'text-amber-600' },
  lunch: { label: 'দুপুরের খাবার', short: 'দুপুর', icon: Sun, tint: 'text-brand-600' },
  dinner: { label: 'রাতের খাবার', short: 'রাত', icon: Moon, tint: 'text-indigo-600' },
} as const;

type MealKey = keyof typeof MEALS;

/** Serving order, not alphabetical — a day reads সকাল → দুপুর → রাত. */
const MEAL_ORDER = ['morning', 'lunch', 'dinner'] as const;

const STATUS_OPTIONS = [{ value: 'all', label: 'সব স্ট্যাটাস' }].concat(
  Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label }))
);


function statusOf(status: string) {
  return STATUS[status as keyof typeof STATUS] ?? STATUS.pending;
}
function mealOf(time: string) {
  return MEALS[time as keyof typeof MEALS] ?? MEALS.lunch;
}

/**
 * YYYY-MM-DD in local time.
 *
 * `toISOString().slice(0, 10)` converts to UTC first, which in Dhaka (UTC+6)
 * rolls any delivery stored at local midnight back to the previous day — so a
 * meal ordered for the 14th would file itself under the 13th.
 */
function dayKey(value: string) {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Local calendar-day helpers for the date bar. */
function keyToDate(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function shiftKey(key: string, days: number) {
  const d = keyToDate(key);
  d.setDate(d.getDate() + days);
  return dayKey(d.toISOString());
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Whether the cancel button should be offered.
 *
 * Mirrors the cut-offs in src/server/deadlines.ts. The server re-checks on
 * every cancel request — this only decides whether to show the button, so a
 * drift here costs a rejected request, never a wrongly-cancelled order.
 */
function cancellability(order: Order): { canCancel: boolean; message: string } {
  if (order.status === 'delivered' || order.status === 'cancelled') {
    return { canCancel: false, message: 'এই অর্ডারটি আর বাতিল করা যাবে না' };
  }
  if (order.status !== 'pending' && order.status !== 'confirmed') {
    return { canCancel: false, message: 'অর্ডারটি প্রক্রিয়াধীন, বাতিল করা যাচ্ছে না' };
  }

  const now = new Date();
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const delivery = new Date(order.deliveryDate);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  if (delivery.toDateString() === now.toDateString()) {
    if (order.deliveryTime === 'lunch') {
      return minutesNow > 8 * 60 + 30
        ? { canCancel: false, message: 'দুপুরের খাবার বাতিলের সময় শেষ (সকাল ৮:৩০ পর্যন্ত)' }
        : { canCancel: true, message: '' };
    }
    if (order.deliveryTime === 'dinner') {
      return minutesNow > 13 * 60
        ? { canCancel: false, message: 'রাতের খাবার বাতিলের সময় শেষ (দুপুর ১টা পর্যন্ত)' }
        : { canCancel: true, message: '' };
    }
    if (order.deliveryTime === 'morning') {
      return { canCancel: false, message: 'সকালের খাবার আগের দিন রাত ১০টার মধ্যে বাতিল করতে হয়' };
    }
  }

  if (delivery.toDateString() === tomorrow.toDateString() && order.deliveryTime === 'morning') {
    return minutesNow > 22 * 60
      ? { canCancel: false, message: 'সকালের খাবার বাতিলের সময় শেষ (রাত ১০টা পর্যন্ত)' }
      : { canCancel: true, message: '' };
  }

  return { canCancel: true, message: '' };
}

export default function OrdersPage() {
  const { confirm } = useDialog();
  const [orders, setOrders] = useState<Order[]>([]);
  /** Zone id -> Bengali label. Orders store the zone as a raw id. */
  const [zoneNames, setZoneNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mealFilter, setMealFilter] = useState<'all' | MealKey>('all');
  const [search, setSearch] = useState('');
  const todayKey = useMemo(() => dayKey(new Date().toISOString()), []);
  /** The day being looked at — today when the page opens. */
  const [day, setDay] = useState(todayKey);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await orderAPI.getMyOrders();
      if (res.success && res.data) {
        setOrders(
          [...res.data].sort(
            (a: Order, b: Order) => new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime()
          )
        );
      }
    } catch {
      toast.error('অর্ডার লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await zoneAPI.getAllZones();
        if (cancelled || !res.success) return;
        const map: Record<string, string> = {};
        for (const zone of res.data ?? []) map[zone._id] = zoneLabel(zone);
        setZoneNames(map);
      } catch {
        /* falls back to hiding the id, below */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Orders written before zones were normalised may hold a plain name. */
  const zoneOf = (value: string) => zoneNames[value] ?? (OBJECT_ID.test(value) ? '' : value);

  /** Every order on the chosen day, whatever the filters say. */
  const dayOrders = useMemo(() => orders.filter((o) => dayKey(o.deliveryDate) === day), [orders, day]);

  /** Live (not cancelled) orders per day, for the counts on the date strip. */
  const perDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      if (o.status === 'cancelled') continue;
      const k = dayKey(o.deliveryDate);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [orders]);

  /** Yesterday to five days on. */
  const strip = useMemo(() => Array.from({ length: 7 }, (_, i) => shiftKey(todayKey, i - 1)), [todayKey]);

  /** The first later day that has a live order — offered when the chosen day is empty. */
  const nextDay = useMemo(() => [...perDay.keys()].filter((k) => k > day).sort()[0] ?? null, [perDay, day]);

  /** The chosen day's orders, filtered, split into সকাল / দুপুর / রাত. */
  const byMeal = useMemo(() => {
    const term = search.trim().toLowerCase();
    const out: Record<MealKey, Order[]> = { morning: [], lunch: [], dinner: [] };
    for (const order of dayOrders) {
      if (statusFilter !== 'all' && order.status !== statusFilter) continue;
      // Anything with an unrecognised slot is counted as lunch, matching mealOf.
      const meal: MealKey = order.deliveryTime in MEALS ? (order.deliveryTime as MealKey) : 'lunch';
      if (mealFilter !== 'all' && meal !== mealFilter) continue;
      if (
        term &&
        !order.orderId?.toLowerCase().includes(term) &&
        !order.items?.some((item) => item.name.toLowerCase().includes(term))
      ) {
        continue;
      }
      out[meal].push(order);
    }
    return out;
  }, [dayOrders, statusFilter, mealFilter, search]);

  const visibleCount = MEAL_ORDER.reduce((n, m) => n + byMeal[m].length, 0);

  /**
   * "মোট অর্ডার" counts live orders only.
   *
   * It used to be `orders.length`, so cancelling both of two orders still read
   * "২" — the figure meant "rows ever created", which is not how anyone reads
   * it. Cancelled ones get their own count instead.
   */
  const stats = useMemo(() => {
    const today = startOfToday();
    const cancelled = orders.filter((o) => o.status === 'cancelled').length;
    return {
      total: orders.length - cancelled,
      upcoming: orders.filter(
        (o) => new Date(o.deliveryDate) >= today && !['cancelled', 'delivered', 'returned'].includes(o.status)
      ).length,
      delivered: orders.filter((o) => o.status === 'delivered').length,
      cancelled,
    };
  }, [orders]);

  const openCancel = (order: Order) => {
    const { canCancel, message } = cancellability(order);
    if (!canCancel) {
      toast.error(message);
      return;
    }
    setSelected(order);
    setCancelReason('');
  };

  const handleCancel = async () => {
    if (!selected) return;
    try {
      setCancelling(true);
      const res = await orderAPI.cancelOrder(selected._id, cancelReason);
      if (res.success) {
        toast.success('অর্ডার বাতিল করা হয়েছে');
        setSelected(null);
        await fetchOrders();
      } else {
        toast.error(res.message || 'অর্ডার বাতিল করতে ব্যর্থ হয়েছে');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'অর্ডার বাতিল করতে ব্যর্থ হয়েছে');
    } finally {
      setCancelling(false);
    }
  };

  /**
   * Removes a cancelled order from the customer's own history.
   *
   * The API only allows this on a cancelled order — a pending or delivered one
   * is a record of real food and money, so it cannot be deleted from here.
   */
  const removeOrder = async (order: Order) => {
    const ok = await confirm({
      title: 'অর্ডারটি মুছে ফেলবেন?',
      message: `${mealOf(order.deliveryTime).label} · ${bengaliDate(order.deliveryDate)} — বাতিল হওয়া এই অর্ডারটি আপনার তালিকা থেকে একেবারে মুছে যাবে।`,
      confirmLabel: 'মুছে ফেলুন',
      tone: 'danger',
    });
    if (!ok) return;

    try {
      setDeletingId(order._id);
      const res = await orderAPI.deleteOrder(order._id);
      if (res.success) {
        toast.success('অর্ডার মুছে ফেলা হয়েছে');
        setOrders((prev) => prev.filter((o) => o._id !== order._id));
      } else {
        toast.error(res.message || 'মুছে ফেলা যায়নি');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'মুছে ফেলা যায়নি');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-28 animate-pulse rounded-3xl bg-ink-100" />
        <div className="h-16 animate-pulse rounded-3xl bg-ink-100" />
        <div className="h-72 animate-pulse rounded-3xl bg-ink-100" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header + counts */}
      <header className="rounded-3xl border border-ink-200 bg-white p-6 shadow-card">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">আমার অর্ডার</h1>
        <p className="mt-1 text-sm text-ink-500">আপনার সব অর্ডারের ইতিহাস</p>

        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'মোট অর্ডার', value: stats.total },
            { label: 'আসন্ন', value: stats.upcoming },
            { label: 'ডেলিভারি হয়েছে', value: stats.delivered },
            { label: 'বাতিল', value: stats.cancelled },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-ink-50 px-4 py-3 text-center">
              <dt className="text-[11px] text-ink-500">{stat.label}</dt>
              <dd className="mt-0.5 text-xl font-bold text-ink-900">{bn(stat.value)}</dd>
            </div>
          ))}
        </dl>
      </header>

      {orders.length === 0 ? (
        <div className="rounded-3xl border border-ink-200 bg-white p-12 text-center shadow-card">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-ink-100 text-ink-400">
            <ShoppingBag size={28} />
          </div>
          <h2 className="mt-5 text-lg font-bold text-ink-900">এখনো কোনো অর্ডার নেই</h2>
          <p className="mt-1.5 text-sm text-ink-500">প্রথম অর্ডারটা করে ফেলুন — কালকের খাবার আজই ঠিক করে রাখুন।</p>
          <Link href="/order" className={buttonClass('primary', 'lg', 'mt-6')}>
            অর্ডার করুন
          </Link>
        </div>
      ) : (
        <>
          {/* ── Date ─────────────────────────────────────────────────────── */}
          <section className="rounded-3xl border border-ink-200 bg-white p-4 shadow-card sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDay((d) => shiftKey(d, -1))}
                  aria-label="আগের দিন"
                  className="grid size-10 place-items-center rounded-xl border border-ink-200 text-ink-600 hover:bg-ink-50"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="min-w-0 px-1">
                  <p className="text-xs font-medium text-ink-500">
                    {day === todayKey ? 'আজ' : day === shiftKey(todayKey, 1) ? 'আগামীকাল' : 'তারিখ'}
                  </p>
                  <h2 className="text-lg font-bold text-ink-900">
                    {bengaliWeekday(keyToDate(day))}, {bengaliDate(day)}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDay((d) => shiftKey(d, 1))}
                  aria-label="পরের দিন"
                  className="grid size-10 place-items-center rounded-xl border border-ink-200 text-ink-600 hover:bg-ink-50"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {day !== todayKey && (
                  <button
                    type="button"
                    onClick={() => setDay(todayKey)}
                    className="rounded-xl border border-ink-200 px-3.5 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
                  >
                    আজকে যান
                  </button>
                )}
                <label className="relative flex cursor-pointer items-center gap-2 rounded-xl border border-ink-200 px-3.5 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50">
                  <CalendarDays size={16} className="text-brand-600" />
                  তারিখ বাছুন
                  <input
                    type="date"
                    value={day}
                    onChange={(e) => e.target.value && setDay(e.target.value)}
                    aria-label="তারিখ বাছুন"
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
              </div>
            </div>

            {/* A week at a glance, with how many meals each day holds. */}
            <div className="no-scrollbar mt-4 -mx-1 flex gap-2 overflow-x-auto px-1">
              {strip.map((k) => {
                const active = k === day;
                const count = perDay.get(k) ?? 0;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setDay(k)}
                    aria-pressed={active}
                    className={`flex min-w-[4.25rem] shrink-0 flex-col items-center rounded-xl border px-3 py-2 transition-colors ${
                      active
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-ink-200 text-ink-700 hover:border-brand-300 hover:bg-brand-50'
                    }`}
                  >
                    <span className={`text-[11px] ${active ? 'text-white/80' : 'text-ink-500'}`}>
                      {k === todayKey ? 'আজ' : bengaliWeekday(keyToDate(k))}
                    </span>
                    <span className="text-base font-bold">{bn(keyToDate(k).getDate())}</span>
                    <span
                      className={`text-[11px] ${active ? 'text-white/90' : count ? 'text-brand-700' : 'text-ink-400'}`}
                    >
                      {count ? `${bn(count)}টি` : '—'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* The day's three meals at a glance — tap one to show only it. */}
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-ink-100 pt-4">
              {MEAL_ORDER.map((meal) => {
                const live = dayOrders.filter((o) => o.deliveryTime === meal && o.status !== 'cancelled').length;
                const { short, icon: MealIcon, tint } = MEALS[meal];
                const active = mealFilter === meal;
                return (
                  <button
                    key={meal}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setMealFilter(active ? 'all' : meal)}
                    className={`rounded-2xl border px-3 py-2.5 text-center transition-colors ${
                      active ? 'border-brand-500 bg-brand-50' : 'border-ink-100 bg-ink-50 hover:bg-ink-100'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-1.5 text-xs text-ink-600">
                      <MealIcon size={14} className={live ? tint : 'text-ink-300'} />
                      {short}
                    </span>
                    <span className={`mt-0.5 block text-xl font-bold ${live ? 'text-ink-900' : 'text-ink-300'}`}>
                      {bn(live)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Filters ──────────────────────────────────────────────────── */}
          <div className="grid gap-3 rounded-3xl border border-ink-200 bg-white p-4 shadow-card sm:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="অর্ডার আইডি বা খাবারের নাম..."
                aria-label="অর্ডার খুঁজুন"
                className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pr-4 pl-11 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/25 focus:outline-none"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="স্ট্যাটাস ফিল্টার"
              className="py-2.5 text-sm"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>

          {/* ── The day's orders ─────────────────────────────────────────── */}
          {visibleCount === 0 ? (
            <div className="rounded-3xl border border-ink-200 bg-white p-10 text-center shadow-card">
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-ink-100 text-ink-400">
                <ShoppingBag size={24} />
              </div>
              <p className="mt-4 font-semibold text-ink-800">
                {dayOrders.length === 0 ? 'এই দিনে কোনো অর্ডার নেই' : 'এই ফিল্টারে কোনো অর্ডার নেই'}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {nextDay && (
                  <button
                    type="button"
                    onClick={() => setDay(nextDay)}
                    className={buttonClass('secondary', 'md')}
                  >
                    পরের অর্ডার: {bengaliDate(nextDay)}
                  </button>
                )}
                <Link href="/order" className={buttonClass('primary', 'md')}>
                  অর্ডার করুন
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {MEAL_ORDER.filter((meal) => byMeal[meal].length > 0).map((meal) => {
                const MealIcon = MEALS[meal].icon;
                return (
                  <section key={meal} className="overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-card">
                    <h3 className="flex items-center gap-2 bg-ink-50 px-5 py-3 text-sm font-semibold text-ink-800">
                      <MealIcon size={16} className={MEALS[meal].tint} />
                      {MEALS[meal].label}
                      <span className="font-normal text-ink-400">· {bn(byMeal[meal].length)}টি</span>
                    </h3>
                    <ul className="divide-y divide-ink-100">
                      {byMeal[meal].map((order) => {
                        const status = statusOf(order.status);
                        const StatusIcon = status.icon;
                        const { canCancel } = cancellability(order);

                        return (
                          <li key={order._id} className="flex flex-wrap gap-4 p-5 transition-colors hover:bg-ink-50/60">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded bg-ink-100 px-2 py-0.5 font-mono text-[11px] text-ink-600">
                                  #{order.orderId?.slice(-8)}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.className}`}
                                >
                                  <StatusIcon size={12} />
                                  {status.label}
                                </span>
                              </div>

                              <p className="mt-2 text-sm text-ink-700">
                                {order.items?.map((i) => i.name).join(', ') || '—'}
                              </p>

                              <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-500">
                                <MapPin size={12} className="shrink-0" />
                                <span className="truncate">
                                  {[zoneOf(order.zone), order.address].filter(Boolean).join(' · ') || '—'}
                                </span>
                              </p>
                            </div>

                            <div className="shrink-0 text-right">
                              <p className="text-lg font-bold text-ink-900">
                                {order.totalAmount === 0 ? 'ফ্রি' : taka(order.totalAmount)}
                              </p>
                              {canCancel ? (
                                <button
                                  type="button"
                                  onClick={() => openCancel(order)}
                                  className="mt-2 ml-auto flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 hover:underline"
                                >
                                  <Trash2 size={12} />
                                  বাতিল করুন
                                </button>
                              ) : (
                                order.status === 'cancelled' && (
                                  <>
                                    <span className="mt-2 block text-xs text-red-600">বাতিল করা হয়েছে</span>
                                    {/* Only a cancelled order can be removed from the history. */}
                                    <button
                                      type="button"
                                      disabled={deletingId === order._id}
                                      onClick={() => removeOrder(order)}
                                      className="mt-1.5 ml-auto flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-red-600 hover:underline disabled:opacity-50"
                                    >
                                      <Trash2 size={12} />
                                      মুছে ফেলুন
                                    </button>
                                  </>
                                )
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}

      {selected && (
        <Modal
          title="অর্ডার বাতিল করুন"
          description={`${mealOf(selected.deliveryTime).label} · ${bengaliDate(selected.deliveryDate)}`}
          icon={
            <span className="grid size-9 place-items-center rounded-xl bg-red-100 text-red-600">
              <AlertCircle size={18} />
            </span>
          }
          busy={cancelling}
          onClose={() => setSelected(null)}
          footer={
            <div className="flex gap-3">
              <Button variant="secondary" size="lg" fullWidth onClick={() => setSelected(null)} disabled={cancelling}>
                ফিরে যান
              </Button>
              <Button variant="danger" size="lg" fullWidth loading={cancelling} onClick={handleCancel}>
                {cancelling ? 'বাতিল হচ্ছে...' : 'বাতিল করুন'}
              </Button>
            </div>
          }
        >
          <p className="text-sm text-ink-600">
            অর্ডার আইডি <span className="font-mono text-ink-800">#{selected.orderId?.slice(-8)}</span>
          </p>

          <div className="mt-4">
            <label htmlFor="reason" className="mb-1.5 block text-sm font-medium text-ink-700">
              বাতিলের কারণ <span className="text-ink-400">(ঐচ্ছিক)</span>
            </label>
            <Textarea
              id="reason"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="কেন বাতিল করছেন?"
            />
          </div>

          <p className="mt-4 rounded-xl bg-brand-50 p-3.5 text-xs leading-relaxed text-brand-900">
            ওয়ালেটের অর্ডারে টাকা কাটে ডেলিভারির দিন — বাতিল করলে আটকানো টাকা আবার নতুন অর্ডারে ব্যবহার করা যাবে।
          </p>
        </Modal>
      )}
    </div>
  );
}
