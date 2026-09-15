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
  RefreshCw,
  Search,
  ShoppingBag,
  Sun,
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

const MEALS: Record<string, { label: string; icon: typeof Coffee; tint: string }> = {
  morning: { label: 'সকাল', icon: Coffee, tint: 'text-amber-600' },
  lunch: { label: 'দুপুর', icon: Sun, tint: 'text-brand-600' },
  dinner: { label: 'রাত', icon: Moon, tint: 'text-indigo-600' },
};

function statusOf(s: string) {
  return STATUS[s] ?? { label: s, tone: 'neutral' as Tone, icon: Package };
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
    deliveryDate: String(o.deliveryDate ?? ''),
    deliveryTime: String(o.deliveryTime ?? ''),
    address: String(o.address ?? ''),
    zone: String(o.zone ?? ''),
    specialInstructions: o.specialInstructions ? String(o.specialInstructions) : '',
  };
}

/* -------------------------------------------------------------------------- */

function OrdersView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Tab lives in the URL so /orders?tab=cod is linkable and survives a reload.
  const tabParam = searchParams.get('tab');
  const tab: 'all' | Source =
    tabParam === 'subscription' || tabParam === 'cod' || tabParam === 'manual' ? tabParam : 'all';
  const setTab = (next: 'all' | Source) =>
    router.replace(next === 'all' ? '/admin/dashboard/orders' : `/admin/dashboard/orders?tab=${next}`, {
      scroll: false,
    });
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});
  const [detail, setDetail] = useState<Row | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

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

  const counts = useMemo(
    () => ({
      all: rows.length,
      subscription: rows.filter((r) => r.source === 'subscription').length,
      cod: rows.filter((r) => r.source === 'cod').length,
      manual: rows.filter((r) => r.source === 'manual').length,
    }),
    [rows]
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab !== 'all' && r.source !== tab) return false;
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

  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const row of visible) {
      const key = dayKey(row.deliveryDate);
      const bucket = map.get(key);
      if (bucket) bucket.push(row);
      else map.set(key, [row]);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [visible]);

  const revenue = useMemo(
    () => visible.filter((r) => r.status === 'delivered').reduce((sum, r) => sum + r.totalAmount, 0),
    [visible]
  );

  const todayKey = new Date().toISOString().slice(0, 10);
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

  const TABS: { key: 'all' | Source; label: string; count: number }[] = [
    { key: 'all', label: 'মোট অর্ডার', count: counts.all },
    { key: 'subscription', label: 'সাবস্ক্রিপশন', count: counts.subscription },
    { key: 'cod', label: 'ক্যাশ অন ডেলিভারি', count: counts.cod },
    { key: 'manual', label: 'ম্যানুয়াল', count: counts.manual },
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="মোট অর্ডার"
          value={bn(counts.all)}
          icon={ShoppingBag}
          tone="brand"
          hint="সাবস্ক্রিপশন + COD + ম্যানুয়াল"
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

      {visible.length > 0 && (
        <p className="text-sm text-ink-600">
          {bn(visible.length)}টি অর্ডার · ডেলিভারি হওয়া থেকে আয়{' '}
          <span className="font-semibold text-ink-900">{taka(revenue)}</span>
        </p>
      )}

      {/* Grouped list */}
      {grouped.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="কোনো অর্ডার নেই"
          hint={tab === 'all' ? 'নতুন অর্ডার এলে এখানে দেখা যাবে।' : 'এই ফিল্টারে কিছু পাওয়া যায়নি।'}
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
                      <span className="mt-0.5 block text-xs text-ink-500">{bn(dayRows.length)}টি অর্ডার</span>
                    </span>
                  </span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-ink-500 transition-transform ${open ? 'rotate-180' : ''}`}
                  />
                </button>

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
