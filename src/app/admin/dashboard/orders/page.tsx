'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Coffee,
  Moon,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Sun,
  Trash2,
  Truck,
  User,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { manualOrderAPI, orderAPI } from '@/app/admin/lib/api';
import StatsCard from '@/app/admin/components/admin/StatsCard';
import { EmptyState, LoadingBlock, Pill, type Tone } from '@/app/admin/components/ui/Shell';
import ManualOrderForm from '@/app/admin/components/admin/ManualOrderForm';
import Button from '@/components/ui/Button';
import { useDialog } from '@/components/ui/DialogProvider';
import { bengaliDate, bengaliDateNumeric, bn, taka } from '@/lib/format';

/* -------------------------------------------------------------------------- */

/**
 * Where a row came from. Subscription and COD are both `Order` documents told
 * apart by paymentMethod; manual orders live in their own collection.
 *
 * These used to be three separate screens, and manual orders appeared on none
 * of them — so no page in the admin panel ever showed a true order total.
 */
type Source = 'subscription' | 'cod' | 'manual';

/** Tabs are the three sources plus an "all" view and a cancelled bin. */
type TabKey = 'all' | Source | 'cancelled';

interface Row {
  _id: string;
  source: Source;
  orderId: string;
  customerName: string;
  phoneNumber: string;
  items: { name: string; price?: number; quantity?: number }[];
  totalAmount: number;
  deliveryCharge: number;
  status: string;
  paymentMethod: string;
  /** Package title for a subscriber, "Regular" otherwise, absent for manual. */
  package?: string;
  deliveryDate: string;
  deliveryTime: string;
  address: string;
  zone: string;
  specialInstructions?: string;
}

const SOURCE_META: Record<Source, { label: string; tone: Tone }> = {
  subscription: { label: 'সাবস্ক্রিপশন', tone: 'brand' },
  cod: { label: 'ক্যাশ অন ডেলিভারি', tone: 'success' },
  manual: { label: 'ম্যানুয়াল', tone: 'info' },
};

const STATUS: Record<string, { label: string; tone: Tone; icon: typeof Package }> = {
  pending: { label: 'পেন্ডিং', tone: 'warning', icon: ClipboardList },
  confirmed: { label: 'কনফার্মড', tone: 'info', icon: CheckCircle2 },
  preparing: { label: 'রান্না হচ্ছে', tone: 'brand', icon: Package },
  out_for_delivery: { label: 'ডেলিভারিতে', tone: 'info', icon: Truck },
  delivered: { label: 'ডেলিভারি হয়েছে', tone: 'success', icon: CheckCircle2 },
  cancelled: { label: 'বাতিল', tone: 'danger', icon: XCircle },
};

const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];

const BN_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

const MEALS: Record<string, { label: string; icon: typeof Coffee; tint: string }> = {
  morning: { label: 'সকাল', icon: Coffee, tint: 'text-amber-600' },
  lunch: { label: 'দুপুর', icon: Sun, tint: 'text-brand-600' },
  dinner: { label: 'রাত', icon: Moon, tint: 'text-indigo-600' },
};

function statusOf(s: string) {
  return STATUS[s] ?? { label: s, tone: 'neutral' as Tone, icon: Package };
}

/**
 * Which package an order was placed against.
 *
 * `Order.package` stores the package *title* ("বেসিক প্যাকেজ") for a
 * subscriber, and the literal "Regular" for anyone ordering without one — 108
 * of the 122 customer orders in the live database are "Regular". Manual orders
 * carry no package field at all. Rather than silently folding those two into a
 * package name, they get their own buckets so the kitchen sees the truth.
 */
function packageOf(row: Row): string {
  if (row.source === 'manual') return 'ম্যানুয়াল';
  const name = row.package?.trim();
  if (!name || name === 'Regular') return 'সাবস্ক্রিপশন ছাড়া';
  return name;
}

/**
 * Group key — the calendar day. Read in UTC because delivery dates are stored
 * as midnight UTC; local getters would shift the day for some viewers.
 */
function dayKey(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'unknown' : d.toISOString().slice(0, 10);
}

interface ApiOrder {
  _id?: unknown;
  orderId?: unknown;
  userName?: unknown;
  customerName?: unknown;
  phoneNumber?: unknown;
  items?: unknown;
  totalAmount?: unknown;
  deliveryCharge?: unknown;
  status?: unknown;
  paymentMethod?: unknown;
  package?: unknown;
  deliveryDate?: unknown;
  deliveryTime?: unknown;
  address?: unknown;
  zone?: unknown;
  specialInstructions?: unknown;
}

/** Customer orders carry `userName`, manual ones `customerName`. */
function toRow(o: ApiOrder, source: Source): Row {
  return {
    _id: String(o._id ?? ''),
    source,
    orderId: String(o.orderId ?? ''),
    customerName: String(o.userName ?? o.customerName ?? '—'),
    phoneNumber: String(o.phoneNumber ?? ''),
    items: Array.isArray(o.items) ? (o.items as Row['items']) : [],
    totalAmount: Number(o.totalAmount ?? 0),
    deliveryCharge: Number(o.deliveryCharge ?? 0),
    status: String(o.status ?? 'pending'),
    paymentMethod: String(o.paymentMethod ?? ''),
    package: o.package ? String(o.package) : undefined,
    deliveryDate: String(o.deliveryDate ?? ''),
    deliveryTime: String(o.deliveryTime ?? ''),
    address: String(o.address ?? ''),
    zone: String(o.zone ?? ''),
    specialInstructions: o.specialInstructions ? String(o.specialInstructions) : '',
  };
}

/* -------------------------------------------------------------------------- */

function OrdersView() {
  const { confirm } = useDialog();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Tab lives in the URL so /orders?tab=cod is linkable and survives a reload.
  const tabParam = searchParams.get('tab');
  const tab: TabKey =
    tabParam === 'subscription' || tabParam === 'cod' || tabParam === 'manual' || tabParam === 'cancelled'
      ? tabParam
      : 'all';
  const setTab = (next: TabKey) =>
    router.replace(next === 'all' ? '/admin/dashboard/orders' : `/admin/dashboard/orders?tab=${next}`, {
      scroll: false,
    });
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});
  const [detail, setDetail] = useState<Row | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  /** Which half of the calendar to show — upcoming by default. */
  const [period, setPeriod] = useState<'upcoming' | 'past'>('upcoming');
  /** `${isoDate}|${meal}` of the breakdown currently expanded, if any. */
  const [openBreakdown, setOpenBreakdown] = useState<string | null>(null);

  const load = useCallback(async () => {
    // Three independent sources. allSettled so one failing endpoint does not
    // blank out the other two.
    const [wallet, cash, manual] = await Promise.allSettled([
      orderAPI.getAllOrders({ paymentMethod: 'wallet' }),
      orderAPI.getAllOrders({ paymentMethod: 'cash' }),
      manualOrderAPI.getAllOrders(),
    ]);

    const out: Row[] = [];
    const collect = (res: PromiseSettledResult<{ data?: ApiOrder[] }>, source: Source) => {
      if (res.status !== 'fulfilled') return;
      for (const raw of res.value?.data ?? []) out.push(toRow(raw, source));
    };

    collect(wallet, 'subscription');
    collect(cash, 'cod');
    collect(manual, 'manual');

    if ([wallet, cash, manual].some((r) => r.status === 'rejected')) {
      toast.error('কিছু অর্ডার লোড করা যায়নি');
    }

    out.sort((a, b) => new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime());
    setRows(out);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Counts ignore cancelled orders.
   *
   * They used to include them, so cancelling both of two orders still read
   * "২ অর্ডার" — the number meant "rows ever created", which is not what anyone
   * reads it as. Cancelled rows live in their own tab instead of inflating
   * every other figure.
   */
  const live = useMemo(() => rows.filter((r) => r.status !== 'cancelled'), [rows]);

  const counts = useMemo(
    () => ({
      all: live.length,
      subscription: live.filter((r) => r.source === 'subscription').length,
      cod: live.filter((r) => r.source === 'cod').length,
      manual: live.filter((r) => r.source === 'manual').length,
      cancelled: rows.length - live.length,
    }),
    [rows, live]
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      // The cancelled tab is the only place cancelled rows appear.
      if (tab === 'cancelled') {
        if (r.status !== 'cancelled') return false;
      } else {
        if (r.status === 'cancelled') return false;
        if (tab !== 'all' && r.source !== tab) return false;
      }
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!term) return true;
      return (
        r.orderId.toLowerCase().includes(term) ||
        r.customerName.toLowerCase().includes(term) ||
        r.phoneNumber.includes(term) ||
        r.items.some((i) => i.name?.toLowerCase().includes(term))
      );
    });
  }, [rows, tab, statusFilter, search]);

  /**
   * Today, in local time. `toISOString()` converts to UTC first, so between
   * midnight and 6am in Dhaka it returns yesterday — which would file today's
   * orders under "past".
   */
  const todayKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  /**
   * Upcoming days run forwards (today, tomorrow, the day after) because that is
   * the order the kitchen cooks in. Past days run backwards, newest first,
   * because that is the order you look things up in. They used to share one
   * newest-first list, which put next week above tomorrow.
   */
  const { upcoming, past } = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const row of visible) {
      const key = dayKey(row.deliveryDate);
      const bucket = map.get(key);
      if (bucket) bucket.push(row);
      else map.set(key, [row]);
    }
    const entries = [...map.entries()];
    return {
      upcoming: entries.filter(([k]) => k >= todayKey).sort((a, b) => a[0].localeCompare(b[0])),
      past: entries.filter(([k]) => k < todayKey).sort((a, b) => b[0].localeCompare(a[0])),
    };
  }, [visible, todayKey]);

  const grouped = period === 'upcoming' ? upcoming : past;

  /** Orders delivered in the current calendar month — the unit the books use. */
  const monthCount = useMemo(() => {
    const prefix = todayKey.slice(0, 7);
    return live.filter((r) => dayKey(r.deliveryDate).startsWith(prefix)).length;
  }, [live, todayKey]);

  const currentMonthLabel = useMemo(() => {
    const d = new Date();
    return `${BN_MONTHS[d.getMonth()]} ${bn(d.getFullYear())}`;
  }, []);

  const revenue = useMemo(
    () => visible.filter((r) => r.status === 'delivered').reduce((sum, r) => sum + r.totalAmount, 0),
    [visible]
  );

  // Upcoming days start open (that is the day's cooking list); past days start
  // closed so the history does not bury what matters.
  const isOpen = (key: string) => openDays[key] ?? key >= todayKey;

  const updateStatus = async (row: Row, status: string) => {
    try {
      setUpdating(row._id);
      const res =
        row.source === 'manual'
          ? await manualOrderAPI.updateOrderStatus(row._id, status)
          : await orderAPI.updateOrderStatus(row._id, status);

      if (res.success) {
        toast.success('স্ট্যাটাস আপডেট হয়েছে');
        setRows((prev) => prev.map((r) => (r._id === row._id ? { ...r, status } : r)));
        setDetail((d) => (d && d._id === row._id ? { ...d, status } : d));
      } else {
        toast.error(res.message || 'আপডেট করা যায়নি');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'আপডেট করা যায়নি');
    } finally {
      setUpdating(null);
    }
  };

  /** Permanently removes a cancelled order. The API refuses any other status. */
  const deleteOrder = async (row: Row) => {
    const ok = await confirm({
      title: 'বাতিল অর্ডার মুছে ফেলবেন?',
      message: `#${row.orderId?.slice(-8) || ''} — ${row.customerName}। এটি একেবারে মুছে যাবে, ফেরানো যাবে না।`,
      confirmLabel: 'মুছে ফেলুন',
      tone: 'danger',
    });
    if (!ok) return;

    try {
      setUpdating(row._id);
      const res =
        row.source === 'manual'
          ? await manualOrderAPI.deleteOrder(row._id)
          : await orderAPI.deleteOrder(row._id);

      if (res.success) {
        toast.success('অর্ডার মুছে ফেলা হয়েছে');
        setRows((prev) => prev.filter((r) => !(r._id === row._id && r.source === row.source)));
        setDetail((d) => (d && d._id === row._id ? null : d));
      } else {
        toast.error(res.message || 'মুছে ফেলা যায়নি');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'মুছে ফেলা যায়নি');
    } finally {
      setUpdating(null);
    }
  };

  const TABS: { key: TabKey; label: string; count: number }[] = [
    { key: 'all', label: 'মোট অর্ডার', count: counts.all },
    { key: 'subscription', label: 'সাবস্ক্রিপশন', count: counts.subscription },
    { key: 'cod', label: 'ক্যাশ অন ডেলিভারি', count: counts.cod },
    { key: 'manual', label: 'ম্যানুয়াল', count: counts.manual },
    { key: 'cancelled', label: 'বাতিল', count: counts.cancelled },
  ];

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-ink-100" />
          ))}
        </div>
        <LoadingBlock rows={4} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Totals across every source */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatsCard
          title="মোট অর্ডার"
          value={bn(counts.all)}
          icon={ShoppingBag}
          tone="brand"
          hint="সাবস্ক্রিপশন + COD + ম্যানুয়াল"
        />
        {/* The month is the unit the books use — profit, loss and the cook's pay. */}
        <StatsCard
          title="এই মাসের অর্ডার"
          value={bn(monthCount)}
          icon={CalendarDays}
          tone="brand"
          hint={currentMonthLabel}
        />
        <StatsCard title="সাবস্ক্রিপশন" value={bn(counts.subscription)} icon={Wallet} tone="sky" />
        <StatsCard title="ক্যাশ অন ডেলিভারি" value={bn(counts.cod)} icon={Truck} tone="leaf" />
        <StatsCard title="ম্যানুয়াল" value={bn(counts.manual)} icon={ClipboardList} tone="amber" />
      </div>

      {/* Source tabs */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={active}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                active
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300'
              }`}
            >
              {t.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${active ? 'bg-white/25' : 'bg-ink-100 text-ink-600'}`}>
                {bn(t.count)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="grid gap-3 rounded-2xl border border-ink-200 bg-white p-4 shadow-card sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="অর্ডার আইডি, নাম, ফোন বা খাবার..."
            aria-label="অর্ডার খুঁজুন"
            className="w-full rounded-xl border border-ink-200 py-2.5 pr-4 pl-11 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/25 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="স্ট্যাটাস ফিল্টার"
          className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm text-ink-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/25 focus:outline-none"
        >
          <option value="all">সব স্ট্যাটাস</option>
          {STATUS_FLOW.map((s) => (
            <option key={s} value={s}>
              {statusOf(s).label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setRefreshing(true);
            void load();
          }}
          className="flex items-center justify-center gap-2 rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          রিফ্রেশ
        </button>
      </div>

      {/* Taking an order belongs with the order list, not with Finance. */}
      <Button
        fullWidth
        size="lg"
        icon={<Plus size={18} />}
        onClick={() => setShowManualForm(true)}
        className="sm:w-auto"
      >
        ম্যানুয়াল অর্ডার নিন
      </Button>

      {/*
        Upcoming and past are separate lists, not one stream, because they are
        read for different reasons and in opposite directions.
      */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-ink-200 bg-white p-1">
          {(
            [
              { key: 'upcoming', label: 'আজ ও আসন্ন', count: upcoming.length },
              { key: 'past', label: 'পূর্বের অর্ডার', count: past.length },
            ] as const
          ).map((option) => {
            const active = period === option.key;
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={active}
                onClick={() => setPeriod(option.key)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  active ? 'bg-brand-600 text-white' : 'text-ink-600 hover:text-ink-900'
                }`}
              >
                {option.label}
                <span className={`ml-1.5 text-xs ${active ? 'text-white/75' : 'text-ink-400'}`}>
                  {bn(option.count)}
                </span>
              </button>
            );
          })}
        </div>

        {visible.length > 0 && (
          <p className="text-sm text-ink-600">
            ডেলিভারি হওয়া থেকে আয় <span className="font-semibold text-ink-900">{taka(revenue)}</span>
          </p>
        )}
      </div>

      {/* Grouped list */}
      {grouped.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="কোনো অর্ডার নেই"
          hint={
            period === 'past'
              ? 'আগের কোনো অর্ডার নেই।'
              : tab === 'all'
                ? 'আজ বা আগামী দিনের কোনো অর্ডার নেই।'
                : 'এই ফিল্টারে কিছু পাওয়া যায়নি।'
          }
        />
      ) : (
        <div className="space-y-4">
          {grouped.map(([key, dayRows]) => {
            const open = isOpen(key);
            return (
              <section key={key} className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card">
                <button
                  type="button"
                  onClick={() => setOpenDays((p) => ({ ...p, [key]: !open }))}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-3 bg-ink-50 px-4 py-3.5 text-left transition-colors hover:bg-ink-100"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <CalendarDays size={18} className="shrink-0 text-brand-600" />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink-900">
                        {key === 'unknown' ? 'তারিখ নেই' : bengaliDate(key)}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-500">
                        মোট {bn(dayRows.length)}টি অর্ডার
                      </span>
                    </span>
                  </span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-ink-500 transition-transform ${open ? 'rotate-180' : ''}`}
                  />
                </button>

                {/*
                  Per-meal counts for the day, so the cook can see how many of
                  each sitting to prepare without opening every order. Tapping
                  one breaks it down by package, which is the thing that was
                  impossible to find anywhere before.
                */}
                <div className="grid grid-cols-3 divide-x divide-ink-100 border-t border-ink-100">
                  {Object.entries(MEALS).map(([mealKey, meal]) => {
                    const mealRows = dayRows.filter((r) => r.deliveryTime === mealKey);
                    const breakdownKey = `${key}|${mealKey}`;
                    const showing = openBreakdown === breakdownKey;
                    const MealIcon = meal.icon;

                    return (
                      <button
                        key={mealKey}
                        type="button"
                        disabled={mealRows.length === 0}
                        aria-expanded={showing}
                        onClick={() => setOpenBreakdown(showing ? null : breakdownKey)}
                        className={`px-3 py-2.5 text-center transition-colors disabled:cursor-default disabled:opacity-45 ${
                          showing ? 'bg-brand-50' : 'enabled:hover:bg-ink-50'
                        }`}
                      >
                        <span className="flex items-center justify-center gap-1.5 text-xs text-ink-600">
                          <MealIcon size={13} className={meal.tint} />
                          {meal.label}
                        </span>
                        <span className="mt-0.5 block text-lg font-bold text-ink-900">
                          {bn(mealRows.length)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {openBreakdown?.startsWith(`${key}|`) && (
                  <div className="border-t border-ink-100 bg-brand-50/60 px-4 py-3">
                    {(() => {
                      const mealKey = openBreakdown.split('|')[1];
                      const mealRows = dayRows.filter((r) => r.deliveryTime === mealKey);
                      const byPackage = new Map<string, number>();
                      for (const r of mealRows) {
                        byPackage.set(packageOf(r), (byPackage.get(packageOf(r)) ?? 0) + 1);
                      }
                      const entries = [...byPackage.entries()].sort((a, b) => b[1] - a[1]);

                      return (
                        <>
                          <p className="text-xs font-semibold text-ink-700">
                            {MEALS[mealKey]?.label} — প্যাকেজ অনুযায়ী
                          </p>
                          <ul className="mt-2 flex flex-wrap gap-2">
                            {entries.map(([pkg, n]) => (
                              <li
                                key={pkg}
                                className="rounded-full border border-brand-200 bg-white px-3 py-1 text-xs"
                              >
                                <span className="text-ink-700">{pkg}</span>{' '}
                                <span className="font-bold text-ink-900">{bn(n)}টি</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      );
                    })()}
                  </div>
                )}

                {open && (
                  <ul className="divide-y divide-ink-100">
                    {dayRows.map((row) => {
                      const st = statusOf(row.status);
                      const StIcon = st.icon;
                      const meal = MEALS[row.deliveryTime];
                      const MealIcon = meal?.icon ?? Package;
                      const src = SOURCE_META[row.source];

                      return (
                        <li key={`${row.source}-${row._id}`} className="flex flex-wrap gap-4 p-4 hover:bg-ink-50/60">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded bg-ink-100 px-2 py-0.5 font-mono text-[11px] text-ink-600">
                                #{row.orderId?.slice(-8) || '—'}
                              </span>
                              <Pill tone={src.tone}>{src.label}</Pill>
                              <Pill tone={st.tone}>
                                <StIcon size={12} />
                                {st.label}
                              </Pill>
                            </div>

                            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-900">
                              <User size={14} className="shrink-0 text-ink-400" />
                              {row.customerName}
                              {row.phoneNumber && (
                                <a
                                  href={`tel:${row.phoneNumber}`}
                                  className="inline-flex items-center gap-1 text-xs font-normal text-ink-500 hover:text-brand-700"
                                >
                                  <Phone size={11} />
                                  {row.phoneNumber}
                                </a>
                              )}
                            </p>

                            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-600">
                              <MealIcon size={14} className={`shrink-0 ${meal?.tint ?? 'text-ink-400'}`} />
                              {meal?.label ?? row.deliveryTime} · {row.items.map((i) => i.name).join(', ') || '—'}
                            </p>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <span className="text-lg font-bold text-ink-900">{taka(row.totalAmount)}</span>
                            <button
                              type="button"
                              onClick={() => setDetail(row)}
                              className="text-xs font-semibold text-brand-700 hover:underline"
                            >
                              বিস্তারিত
                            </button>
                            {/* Deleting is offered only once an order is cancelled. */}
                            {row.status === 'cancelled' && (
                              <button
                                type="button"
                                disabled={updating === row._id}
                                onClick={() => deleteOrder(row)}
                                className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                              >
                                <Trash2 size={12} />
                                মুছে ফেলুন
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {showManualForm && (
        <ManualOrderForm
          onClose={() => setShowManualForm(false)}
          onCreated={() => {
            // The new row belongs to the Manual tab, so land the admin there.
            setTab('manual');
            void load();
          }}
        />
      )}

      {/* Detail sheet */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/50 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="অর্ডারের বিস্তারিত"
          onClick={() => setDetail(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-ink-900">অর্ডার #{detail.orderId?.slice(-8) || '—'}</h2>
                <p className="mt-1 text-sm text-ink-500">
                  {SOURCE_META[detail.source].label} · {bengaliDateNumeric(detail.deliveryDate)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                aria-label="বন্ধ করুন"
                className="grid size-8 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-ink-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <div>
                <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">গ্রাহক</p>
                <p className="mt-1.5 font-semibold text-ink-900">{detail.customerName}</p>
                {detail.phoneNumber && (
                  <a href={`tel:${detail.phoneNumber}`} className="text-sm text-brand-700 hover:underline">
                    {detail.phoneNumber}
                  </a>
                )}
                <p className="mt-1 text-sm text-ink-600">{detail.address || '—'}</p>
              </div>

              <div>
                <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">খাবার</p>
                <ul className="mt-2 divide-y divide-ink-100 rounded-xl border border-ink-200">
                  {detail.items.map((item, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                      <span className="text-ink-800">
                        {item.name}
                        {item.quantity && item.quantity > 1 ? ` × ${bn(item.quantity)}` : ''}
                      </span>
                      {typeof item.price === 'number' && (
                        <span className="font-semibold text-ink-900">{taka(item.price)}</span>
                      )}
                    </li>
                  ))}
                </ul>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-ink-600">ডেলিভারি চার্জ</dt>
                    <dd className="text-ink-800">{taka(detail.deliveryCharge)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-ink-200 pt-1.5">
                    <dt className="font-semibold text-ink-900">মোট</dt>
                    <dd className="text-lg font-bold text-ink-900">{taka(detail.totalAmount)}</dd>
                  </div>
                </dl>
              </div>

              {detail.specialInstructions && (
                <div>
                  <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">নোট</p>
                  <p className="mt-1.5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                    {detail.specialInstructions}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">স্ট্যাটাস বদলান</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {STATUS_FLOW.map((s) => {
                    const meta = statusOf(s);
                    const active = detail.status === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={active || updating === detail._id}
                        onClick={() => updateStatus(detail, s)}
                        className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                          active
                            ? 'border-brand-600 bg-brand-600 text-white'
                            : 'border-ink-200 text-ink-700 hover:border-brand-400 hover:text-brand-700'
                        }`}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** useSearchParams needs a Suspense boundary during prerender. */
export default function OrdersPage() {
  return (
    <Suspense fallback={<LoadingBlock rows={4} />}>
      <OrdersView />
    </Suspense>
  );
}
