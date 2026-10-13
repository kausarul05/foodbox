'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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
  X,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { manualOrderAPI, orderAPI } from '@/app/admin/lib/api';
import { EmptyState, LoadingBlock, Pill, type Tone } from '@/app/admin/components/ui/Shell';
import ManualOrderForm from '@/app/admin/components/admin/ManualOrderForm';
import Button from '@/components/ui/Button';
import { useDialog } from '@/components/ui/DialogProvider';
import { bengaliDate, bengaliDateNumeric, bengaliWeekday, bn, taka } from '@/lib/format';

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
  delivered: { label: 'ডেলিভারি হয়েছে', tone: 'success', icon: CheckCircle2 },
  cancelled: { label: 'বাতিল', tone: 'danger', icon: XCircle },
};

/**
 * The admin makes two moves: confirm, then deliver. Cancelling is left to the
 * customer, whose cancel route refunds the wallet — the admin status route
 * never did.
 */
type Step = 'confirmed' | 'delivered';

/** The one button an order shows next, if any. */
const NEXT_STEP: Record<string, { to: Step; label: string }> = {
  pending: { to: 'confirmed', label: 'কনফার্ম' },
  confirmed: { to: 'delivered', label: 'ডেলিভারি সম্পন্ন' },
};

/** Older rows may still say `preparing` / `out_for_delivery`; both mean confirmed now. */
function normalizeStatus(s: string) {
  return s === 'preparing' || s === 'out_for_delivery' ? 'confirmed' : s;
}

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
    status: normalizeStatus(String(o.status ?? 'pending')),
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

/** "2026-10-13" for a local calendar day. Not toISOString(): that is UTC, and
 * between midnight and 6am in Dhaka it returns yesterday. */
function localKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function keyToDate(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function shiftKey(key: string, days: number) {
  const d = keyToDate(key);
  d.setDate(d.getDate() + days);
  return localKey(d);
}

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'সব' },
  { key: 'pending', label: 'পেন্ডিং' },
  { key: 'confirmed', label: 'কনফার্মড' },
  { key: 'delivered', label: 'ডেলিভারি হয়েছে' },
  { key: 'cancelled', label: 'বাতিল' },
];

const SOURCE_FILTERS: { key: 'all' | Source; label: string }[] = [
  { key: 'all', label: 'সব ধরন' },
  { key: 'subscription', label: 'সাবস্ক্রিপশন' },
  { key: 'cod', label: 'ক্যাশ অন ডেলিভারি' },
  { key: 'manual', label: 'ম্যানুয়াল' },
];

/** Segmented control — one look for every filter on the page. */
function Segmented<K extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { key: K; label: string; count?: number }[];
  value: K;
  onChange: (k: K) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-ink-100 p-1">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.key)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
              active ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={`ml-1.5 text-xs ${active ? 'text-brand-700' : 'text-ink-400'}`}>{bn(o.count)}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function OrdersView() {
  const { confirm } = useDialog();
  const searchParams = useSearchParams();
  const todayKey = useMemo(() => localKey(new Date()), []);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [day, setDay] = useState(todayKey);
  const [mealFilter, setMealFilter] = useState<'all' | keyof typeof MEALS>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  // ?tab=cod is still honoured: the old COD page redirects here with it.
  const [sourceFilter, setSourceFilter] = useState<'all' | Source>(() => {
    const t = searchParams.get('tab');
    return t === 'subscription' || t === 'cod' || t === 'manual' ? t : 'all';
  });
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Row | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);

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

    setRows(out);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Every order on the chosen day, whatever the filters say. */
  const dayRows = useMemo(() => rows.filter((r) => dayKey(r.deliveryDate) === day), [rows, day]);

  /** Live (not cancelled) orders per day, for the counts on the date strip. */
  const perDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      if (r.status === 'cancelled') continue;
      const k = dayKey(r.deliveryDate);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [rows]);

  /** Yesterday to five days on — the window a kitchen actually works in. */
  const strip = useMemo(() => Array.from({ length: 7 }, (_, i) => shiftKey(todayKey, i - 1)), [todayKey]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return dayRows.filter((r) => {
      if (mealFilter !== 'all' && r.deliveryTime !== mealFilter) return false;
      if (sourceFilter !== 'all' && r.source !== sourceFilter) return false;
      if (statusFilter === 'all') {
        // Cancelled orders stay out of the working list unless asked for.
        if (r.status === 'cancelled') return false;
      } else if (r.status !== statusFilter) {
        return false;
      }
      if (!term) return true;
      return (
        r.orderId.toLowerCase().includes(term) ||
        r.customerName.toLowerCase().includes(term) ||
        r.phoneNumber.includes(term) ||
        r.items.some((i) => i.name?.toLowerCase().includes(term))
      );
    });
  }, [dayRows, mealFilter, sourceFilter, statusFilter, search]);

  /**
   * Orders on the chosen day and meal waiting for `to`, from every source.
   * Reads `dayRows`, not the filtered list — a filter or a search should never
   * leave half a meal unconfirmed.
   */
  const slotRows = (meal: string, to: Step) =>
    dayRows.filter((r) => r.deliveryTime === meal && NEXT_STEP[r.status]?.to === to);

  /**
   * Moves orders one step on — a single row, or a whole meal. Goes through the
   * batch route either way, which only moves pending → confirmed and
   * confirmed → delivered, so nothing can skip a step or undo a delivery.
   */
  const advance = async (targets: Row[], to: Step, busyKey: string) => {
    if (targets.length === 0) return;
    try {
      setUpdating(busyKey);
      const res = await orderAPI.batchStatus(
        targets.filter((r) => r.source !== 'manual').map((r) => r._id),
        targets.filter((r) => r.source === 'manual').map((r) => r._id),
        to
      );
      if (!res.success) {
        toast.error(res.message || 'আপডেট করা যায়নি');
        return;
      }
      const n = res.data?.updated ?? 0;
      toast.success(to === 'confirmed' ? `${bn(n)}টি অর্ডার কনফার্ম হয়েছে` : `${bn(n)}টি অর্ডার ডেলিভারি সম্পন্ন`);
      // Reload rather than patch: the server skips anything that changed since
      // this page loaded, so only a fresh read shows what really moved.
      await load();
      setDetail(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'আপডেট করা যায়নি');
    } finally {
      setUpdating(null);
    }
  };

  const advanceMeal = async (meal: string, to: Step) => {
    const targets = slotRows(meal, to);
    const ok = await confirm({
      title:
        to === 'confirmed'
          ? `${MEALS[meal]?.label}ের সব অর্ডার কনফার্ম করবেন?`
          : `${MEALS[meal]?.label}ের সব অর্ডার ডেলিভারি সম্পন্ন?`,
      message: `${bengaliWeekday(keyToDate(day))}, ${bengaliDate(day)} — ${bn(targets.length)}টি অর্ডার ${
        to === 'confirmed' ? 'কনফার্ম' : 'ডেলিভারি সম্পন্ন'
      } হবে।`,
      confirmLabel: to === 'confirmed' ? 'হ্যাঁ, কনফার্ম করুন' : 'হ্যাঁ, ডেলিভারি সম্পন্ন',
    });
    if (ok) await advance(targets, to, `meal|${meal}|${to}`);
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
        row.source === 'manual' ? await manualOrderAPI.deleteOrder(row._id) : await orderAPI.deleteOrder(row._id);

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

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-24 animate-pulse rounded-2xl bg-ink-100" />
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-ink-100" />
          ))}
        </div>
        <LoadingBlock rows={4} />
      </div>
    );
  }

  const live = dayRows.filter((r) => r.status !== 'cancelled');
  const dayTotal = live.reduce((sum, r) => sum + r.totalAmount, 0);
  const cancelledCount = dayRows.length - live.length;

  return (
    <div className="space-y-5">
      {/* ── Date ─────────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-ink-200 bg-white p-4 shadow-card sm:p-5">
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
                {day === todayKey ? 'আজ' : day === shiftKey(todayKey, 1) ? 'আগামীকাল' : bengaliWeekday(keyToDate(day))}
              </p>
              <h1 className="text-lg font-bold text-ink-900 sm:text-xl">
                {day === todayKey || day === shiftKey(todayKey, 1) ? `${bengaliWeekday(keyToDate(day))}, ` : ''}
                {bengaliDate(day)}
              </h1>
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
            <button
              type="button"
              onClick={() => {
                setRefreshing(true);
                void load();
              }}
              aria-label="রিফ্রেশ"
              className="grid size-10 place-items-center rounded-xl border border-ink-200 text-ink-600 hover:bg-ink-50"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <Button icon={<Plus size={16} />} onClick={() => setShowManualForm(true)}>
              ম্যানুয়াল অর্ডার
            </Button>
          </div>
        </div>

        {/* A week at a glance, with how many orders each day holds. */}
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
                className={`flex min-w-[4.5rem] shrink-0 flex-col items-center rounded-xl border px-3 py-2 transition-colors ${
                  active
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-ink-200 text-ink-700 hover:border-brand-300 hover:bg-brand-50'
                }`}
              >
                <span className={`text-[11px] ${active ? 'text-white/80' : 'text-ink-500'}`}>
                  {k === todayKey ? 'আজ' : bengaliWeekday(keyToDate(k))}
                </span>
                <span className="text-base font-bold">{bn(keyToDate(k).getDate())}</span>
                <span className={`text-[11px] ${active ? 'text-white/90' : count ? 'text-brand-700' : 'text-ink-400'}`}>
                  {count ? `${bn(count)}টি` : '—'}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-ink-100 pt-3 text-sm text-ink-600">
          <span>
            মোট অর্ডার <b className="text-ink-900">{bn(live.length)}টি</b>
          </span>
          <span>
            মোট মূল্য <b className="text-ink-900">{taka(dayTotal)}</b>
          </span>
          {cancelledCount > 0 && (
            <span>
              বাতিল <b className="text-red-600">{bn(cancelledCount)}টি</b>
            </span>
          )}
        </p>
      </section>

      {/* ── One card per meal: counts, kitchen breakdown, one action ──────── */}
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(MEALS).map(([mealKey, meal]) => {
          const mealRows = live.filter((r) => r.deliveryTime === mealKey);
          const pending = slotRows(mealKey, 'confirmed').length;
          const confirmed = slotRows(mealKey, 'delivered').length;
          const delivered = mealRows.filter((r) => r.status === 'delivered').length;
          const total = mealRows.length;
          const MealIcon = meal.icon;

          const byPackage = new Map<string, number>();
          for (const r of mealRows) byPackage.set(packageOf(r), (byPackage.get(packageOf(r)) ?? 0) + 1);
          const packages = [...byPackage.entries()].sort((a, b) => b[1] - a[1]);

          return (
            <section
              key={mealKey}
              className="flex flex-col rounded-2xl border border-ink-200 bg-white p-5 shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-10 place-items-center rounded-xl bg-ink-50">
                    <MealIcon size={20} className={meal.tint} />
                  </span>
                  <div>
                    <h2 className="font-bold text-ink-900">{meal.label}</h2>
                    <p className="text-xs text-ink-500">{bn(total)}টি অর্ডার</p>
                  </div>
                </div>
                <span className="text-3xl font-bold text-ink-900">{bn(total)}</span>
              </div>

              {/* Progress: pending / confirmed / delivered */}
              {total > 0 && (
                <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-ink-100">
                  <div className="bg-leaf-500" style={{ width: `${(delivered / total) * 100}%` }} />
                  <div className="bg-sky-500" style={{ width: `${(confirmed / total) * 100}%` }} />
                  <div className="bg-amber-400" style={{ width: `${(pending / total) * 100}%` }} />
                </div>
              )}
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-amber-50 py-1.5">
                  <dt className="text-[11px] text-amber-800">পেন্ডিং</dt>
                  <dd className="font-bold text-amber-900">{bn(pending)}</dd>
                </div>
                <div className="rounded-lg bg-sky-50 py-1.5">
                  <dt className="text-[11px] text-sky-800">কনফার্মড</dt>
                  <dd className="font-bold text-sky-900">{bn(confirmed)}</dd>
                </div>
                <div className="rounded-lg bg-leaf-50 py-1.5">
                  <dt className="text-[11px] text-leaf-700">ডেলিভারি</dt>
                  <dd className="font-bold text-leaf-700">{bn(delivered)}</dd>
                </div>
              </dl>

              {packages.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {packages.map(([pkg, n]) => (
                    <li key={pkg} className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs text-ink-700">
                      {pkg} <b className="text-ink-900">{bn(n)}</b>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-auto pt-4">
                {pending > 0 ? (
                  <button
                    type="button"
                    disabled={updating !== null}
                    onClick={() => void advanceMeal(mealKey, 'confirmed')}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
                  >
                    <CheckCircle2 size={17} />
                    {updating === `meal|${mealKey}|confirmed`
                      ? 'কনফার্ম হচ্ছে…'
                      : `${meal.label}ের ${bn(pending)}টি অর্ডার কনফার্ম করুন`}
                  </button>
                ) : confirmed > 0 ? (
                  <button
                    type="button"
                    disabled={updating !== null}
                    onClick={() => void advanceMeal(mealKey, 'delivered')}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-leaf-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-leaf-700 disabled:opacity-60"
                  >
                    <Truck size={17} />
                    {updating === `meal|${mealKey}|delivered`
                      ? 'আপডেট হচ্ছে…'
                      : `${bn(confirmed)}টি অর্ডার ডেলিভারি সম্পন্ন`}
                  </button>
                ) : (
                  <p className="flex items-center justify-center gap-1.5 rounded-xl bg-ink-50 px-4 py-2.5 text-sm text-ink-500">
                    {total > 0 ? (
                      <>
                        <CheckCircle2 size={16} className="text-leaf-600" />
                        সব ডেলিভারি হয়ে গেছে
                      </>
                    ) : (
                      'এই বেলায় কোনো অর্ডার নেই'
                    )}
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* ── Order list ───────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card">
        <div className="space-y-3 border-b border-ink-100 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              label="বেলা"
              value={mealFilter}
              onChange={setMealFilter}
              options={[
                { key: 'all' as const, label: 'সব বেলা', count: live.length },
                ...Object.entries(MEALS).map(([k, m]) => ({
                  key: k as keyof typeof MEALS,
                  label: m.label,
                  count: live.filter((r) => r.deliveryTime === k).length,
                })),
              ]}
            />
            <Segmented label="স্ট্যাটাস" value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTERS} />
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="অর্ডার আইডি, নাম, ফোন বা খাবার..."
                aria-label="অর্ডার খুঁজুন"
                className="w-full rounded-xl border border-ink-200 py-2.5 pr-4 pl-10 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/25 focus:outline-none"
              />
            </div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as 'all' | Source)}
              aria-label="অর্ডারের ধরন"
              className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm text-ink-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/25 focus:outline-none"
            >
              {SOURCE_FILTERS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={ShoppingBag}
              title="কোনো অর্ডার নেই"
              hint={dayRows.length === 0 ? 'এই দিনে কোনো অর্ডার আসেনি।' : 'এই ফিল্টারে কিছু পাওয়া যায়নি।'}
            />
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {visible.map((row) => {
              const st = statusOf(row.status);
              const StIcon = st.icon;
              const meal = MEALS[row.deliveryTime];
              const MealIcon = meal?.icon ?? Package;
              const src = SOURCE_META[row.source];
              const next = NEXT_STEP[row.status];

              return (
                <li key={`${row.source}-${row._id}`} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 hover:bg-ink-50/60">
                  <button type="button" onClick={() => setDetail(row)} className="min-w-0 flex-1 text-left">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink-900">{row.customerName}</span>
                      <span className="font-mono text-[11px] text-ink-400">#{row.orderId?.slice(-8) || '—'}</span>
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-600">
                      <span className="inline-flex items-center gap-1">
                        <MealIcon size={13} className={meal?.tint ?? 'text-ink-400'} />
                        {meal?.label ?? row.deliveryTime}
                      </span>
                      {row.phoneNumber && (
                        <span className="inline-flex items-center gap-1">
                          <Phone size={12} className="text-ink-400" />
                          {row.phoneNumber}
                        </span>
                      )}
                      <span className="truncate">{row.items.map((i) => i.name).join(', ') || '—'}</span>
                    </p>
                  </button>

                  <div className="flex items-center gap-2">
                    <Pill tone={src.tone}>{src.label}</Pill>
                    <Pill tone={st.tone}>
                      <StIcon size={12} />
                      {st.label}
                    </Pill>
                  </div>

                  <span className="w-20 text-right font-bold text-ink-900">{taka(row.totalAmount)}</span>

                  <div className="flex w-36 justify-end">
                    {next ? (
                      <button
                        type="button"
                        disabled={updating !== null}
                        onClick={() => void advance([row], next.to, row._id)}
                        className={`w-full rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
                          next.to === 'confirmed' ? 'bg-brand-600 hover:bg-brand-700' : 'bg-leaf-600 hover:bg-leaf-700'
                        }`}
                      >
                        {updating === row._id ? '…' : next.label}
                      </button>
                    ) : row.status === 'cancelled' ? (
                      <button
                        type="button"
                        disabled={updating !== null}
                        onClick={() => void deleteOrder(row)}
                        className="flex items-center gap-1 text-sm font-semibold text-red-600 hover:underline disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                        মুছে ফেলুন
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {showManualForm && (
        <ManualOrderForm
          onClose={() => setShowManualForm(false)}
          onCreated={() => {
            setSourceFilter('manual');
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
                  {SOURCE_META[detail.source].label} · {bengaliDateNumeric(detail.deliveryDate)} ·{' '}
                  {MEALS[detail.deliveryTime]?.label ?? detail.deliveryTime}
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
                <p className="text-xs font-semibold tracking-wide text-ink-500">গ্রাহক</p>
                <p className="mt-1.5 flex items-center gap-1.5 font-semibold text-ink-900">
                  <User size={14} className="text-ink-400" />
                  {detail.customerName}
                </p>
                {detail.phoneNumber && (
                  <a href={`tel:${detail.phoneNumber}`} className="text-sm text-brand-700 hover:underline">
                    {detail.phoneNumber}
                  </a>
                )}
                <p className="mt-1 text-sm text-ink-600">{detail.address || '—'}</p>
              </div>

              <div>
                <p className="text-xs font-semibold tracking-wide text-ink-500">খাবার</p>
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
                  <p className="text-xs font-semibold tracking-wide text-ink-500">নোট</p>
                  <p className="mt-1.5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{detail.specialInstructions}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-ink-100 px-6 py-4">
              <Pill tone={statusOf(detail.status).tone}>{statusOf(detail.status).label}</Pill>
              {NEXT_STEP[detail.status] && (
                <button
                  type="button"
                  disabled={updating !== null}
                  onClick={() => void advance([detail], NEXT_STEP[detail.status].to, detail._id)}
                  className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
                    detail.status === 'pending' ? 'bg-brand-600 hover:bg-brand-700' : 'bg-leaf-600 hover:bg-leaf-700'
                  }`}
                >
                  {NEXT_STEP[detail.status].label}
                </button>
              )}
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
