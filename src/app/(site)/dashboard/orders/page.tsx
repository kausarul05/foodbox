'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
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
import { bengaliDate, bn, taka, zoneLabel } from '@/lib/format';

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

const MEAL_OPTIONS = [{ value: 'all', label: 'সব বেলা' }].concat(
  Object.entries(MEALS).map(([value, m]) => ({ value, label: m.label }))
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
  const [mealFilter, setMealFilter] = useState('all');
  const [search, setSearch] = useState('');
  /** Explicit open/closed overrides; anything not listed follows the default. */
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

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

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      if (mealFilter !== 'all' && order.deliveryTime !== mealFilter) return false;
      if (!term) return true;
      return (
        order.orderId?.toLowerCase().includes(term) ||
        order.items?.some((item) => item.name.toLowerCase().includes(term))
      );
    });
  }, [orders, statusFilter, mealFilter, search]);

  /**
   * [isoDate, { byMeal, count }] pairs, newest first — the sort above already
   * ordered them.
   *
   * Each date is split into সকাল / দুপুর / রাত rather than one flat list. A day
   * with all three meals used to be three near-identical rows you had to read
   * the small meal line on to tell apart; now the day's shape is visible from
   * the header and each meal is its own block.
   */
  const grouped = useMemo(() => {
    const map = new Map<string, Record<MealKey, Order[]>>();
    for (const order of filtered) {
      const key = dayKey(order.deliveryDate);
      let bucket = map.get(key);
      if (!bucket) {
        bucket = { morning: [], lunch: [], dinner: [] };
        map.set(key, bucket);
      }
      // Anything with an unrecognised slot is counted as lunch, matching mealOf.
      const meal: MealKey = order.deliveryTime in MEALS ? (order.deliveryTime as MealKey) : 'lunch';
      bucket[meal].push(order);
    }

    return [...map.entries()].map(([isoDate, byMeal]) => ({
      isoDate,
      byMeal,
      all: MEAL_ORDER.flatMap((meal) => byMeal[meal]),
    }));
  }, [filtered]);

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
        (o) => new Date(o.deliveryDate) >= today && o.status !== 'cancelled' && o.status !== 'delivered'
      ).length,
      delivered: orders.filter((o) => o.status === 'delivered').length,
      cancelled,
    };
  }, [orders]);

  /** Today and later start open; older dates start collapsed. */
  const isOpen = (isoDate: string) => toggled[isoDate] ?? new Date(isoDate) >= startOfToday();

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
          {/* Filters */}
          <div className="grid gap-3 rounded-3xl border border-ink-200 bg-white p-4 shadow-card sm:grid-cols-[1fr_auto_auto]">
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
            <Select
              value={mealFilter}
              onChange={(e) => setMealFilter(e.target.value)}
              aria-label="বেলা ফিল্টার"
              className="py-2.5 text-sm"
            >
              {MEAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>

          {grouped.length === 0 ? (
            <div className="rounded-3xl border border-ink-200 bg-white p-12 text-center shadow-card">
              <p className="font-semibold text-ink-800">এই ফিল্টারে কোনো অর্ডার নেই</p>
              <p className="mt-1 text-sm text-ink-500">অন্য স্ট্যাটাস বা বেলা বেছে দেখুন।</p>
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(({ isoDate, byMeal, all: dateOrders }) => {
                const open = isOpen(isoDate);
                const cancellable = dateOrders.filter((o) => cancellability(o).canCancel).length;

                return (
                  <section key={isoDate} className="overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-card">
                    <button
                      type="button"
                      onClick={() => setToggled((prev) => ({ ...prev, [isoDate]: !open }))}
                      aria-expanded={open}
                      className="flex w-full items-center justify-between gap-3 bg-ink-50 px-5 py-4 text-left transition-colors hover:bg-ink-100"
                    >
                      <span className="flex items-center gap-3">
                        <CalendarDays size={18} className="shrink-0 text-brand-600" />
                        <span>
                          <span className="block font-semibold text-ink-900">{bengaliDate(isoDate)}</span>
                          <span className="mt-0.5 block text-xs text-ink-500">
                            {bn(dateOrders.length)}টি অর্ডার
                            {cancellable > 0 && ` · ${bn(cancellable)}টি বাতিল করা যাবে`}
                          </span>
                        </span>
                      </span>
                      <ChevronDown
                        size={18}
                        className={`shrink-0 text-ink-500 transition-transform ${open ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {/*
                      The day's three meals at a glance, so you can see what is
                      coming without expanding anything. A meal with nothing
                      ordered is greyed rather than hidden — the gap is the
                      information.
                    */}
                    <dl className="grid grid-cols-3 divide-x divide-ink-100 border-t border-ink-100 bg-white">
                      {MEAL_ORDER.map((meal) => {
                        const count = byMeal[meal].length;
                        const { short, icon: MealIcon, tint } = MEALS[meal];
                        return (
                          <div key={meal} className="px-3 py-2.5 text-center">
                            <dt className="flex items-center justify-center gap-1.5 text-[11px] text-ink-500">
                              <MealIcon size={13} className={count ? tint : 'text-ink-300'} />
                              {short}
                            </dt>
                            <dd className={`mt-0.5 font-bold ${count ? 'text-ink-900' : 'text-ink-300'}`}>
                              {bn(count)}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>

                    {open &&
                      MEAL_ORDER.filter((meal) => byMeal[meal].length > 0).map((meal) => (
                        <div key={meal} className="border-t border-ink-100">
                          <p className="flex items-center gap-2 bg-ink-50/50 px-5 py-2 text-xs font-semibold text-ink-700">
                            {(() => {
                              const MealIcon = MEALS[meal].icon;
                              return <MealIcon size={14} className={MEALS[meal].tint} />;
                            })()}
                            {MEALS[meal].label}
                            <span className="text-ink-400">· {bn(byMeal[meal].length)}টি</span>
                          </p>
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

                                    {/* The meal is the group heading above, not repeated here. */}
                                    <p className="mt-2 text-sm text-ink-600">
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
                        </div>
                      ))}
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
            ওয়ালেট থেকে পেমেন্ট করা হলে টাকা আপনার ওয়ালেটে ফেরত যোগ হবে।
          </p>
        </Modal>
      )}
    </div>
  );
}
