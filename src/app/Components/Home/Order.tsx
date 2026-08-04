'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Coffee,
  Crown,
  Home,
  LogIn,
  Moon,
  Phone,
  ShoppingBag,
  Sun,
  Users,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { menuAPI, orderAPI, subscriptionAPI } from '@/lib/api';
import Button, { buttonClass } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import ZoneSelect from '@/components/ui/ZoneSelect';
import { bengaliDate, bn, taka } from '@/lib/format';
import { displayName, useHydrated, useSession } from '@/lib/useSession';

/* -------------------------------------------------------------------------- */
/* Types and constants                                                        */
/* -------------------------------------------------------------------------- */

interface MenuItem {
  day: string;
  morning: string;
  lunch: string;
  dinner: string;
  morningPrice?: number;
  lunchPrice?: number;
  dinnerPrice?: number;
}

type MealKey = 'morning' | 'lunch' | 'dinner';
type MealSelection = Record<MealKey, boolean>;

const MEALS = [
  { key: 'morning', label: 'সকাল', full: 'সকালের খাবার', icon: Coffee, tint: 'text-amber-600' },
  { key: 'lunch', label: 'দুপুর', full: 'দুপুরের খাবার', icon: Sun, tint: 'text-brand-600' },
  { key: 'dinner', label: 'রাত', full: 'রাতের খাবার', icon: Moon, tint: 'text-indigo-600' },
] as const satisfies readonly { key: MealKey; label: string; full: string; icon: typeof Coffee; tint: string }[];

/** Used only when the menu row carries no price of its own. */
const FALLBACK_PRICE: Record<MealKey, number> = { morning: 50, lunch: 80, dinner: 100 };

const DELIVERY_CHARGE_PER_DAY = 15;

/** JS getDay() is Sunday-first. */
const WEEKDAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

const NONE: MealSelection = { morning: false, lunch: false, dinner: false };

/**
 * Local YYYY-MM-DD.
 *
 * `toISOString().slice(0,10)` was returning the *previous* day between midnight
 * and 6am in Dhaka (UTC+6), because it converts to UTC first.
 */
function toISODate(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function fromISODate(value: string) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Tomorrow through the following six days — one delivery week. */
function defaultRange() {
  const start = addDays(new Date(), 1);
  return { start: toISODate(start), end: toISODate(addDays(start, 6)) };
}

/* -------------------------------------------------------------------------- */

export default function Order() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { user } = useSession();

  const [range, setRange] = useState(defaultRange);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [address, setAddress] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<{ packageName?: string } | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);

  /** The three global toggles at the top of the form. */
  const [defaultMeals, setDefaultMeals] = useState<MealSelection>({ morning: true, lunch: true, dinner: true });
  /** Per-day departures from `defaultMeals`, keyed by ISO date. */
  const [selfOverrides, setSelfOverrides] = useState<Record<string, MealSelection>>({});
  const [guestOverrides, setGuestOverrides] = useState<Record<string, MealSelection>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [enableGuestMeal, setEnableGuestMeal] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [shortfall, setShortfall] = useState<number | null>(null);

  const isLoggedIn = Boolean(user);

  /* ---------------------------------------------------------------------- */
  /* Load subscription + menu                                               */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      let active: { packageName?: string; package?: string } | null = null;
      let balance = Number(user.walletBalance ?? 0);

      try {
        const res = await subscriptionAPI.getMySubscriptions();
        if (res.success && res.data) {
          active = res.data.find((s: { status: string }) => s.status === 'active') ?? null;
          balance = res.walletBalance ?? balance;
        }
      } catch {
        /* treated as "no subscription" below */
      }

      let rows: MenuItem[] = [];
      try {
        const res = await menuAPI.getMenuByPackage(active?.package ?? 'basic');
        if (res.success && res.data) rows = res.data;
      } catch {
        if (!cancelled) toast.error('মেনু লোড করতে ব্যর্থ হয়েছে');
      }

      if (cancelled) return;
      setHasActiveSubscription(Boolean(active));
      setSubscriptionData(active);
      setWalletBalance(balance);
      setMenu(rows);
      setPhoneNumber(user.phoneNumber ?? '');
      setSelectedZone(user.zone ?? '');
      setAddress(user.address ?? '');
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, user]);

  /* ---------------------------------------------------------------------- */
  /* Derived data                                                           */
  /* ---------------------------------------------------------------------- */

  const priceOf = useCallback(
    (dayName: string, meal: MealKey) => {
      const row = menu.find((m) => m.day === dayName);
      const priceKey = `${meal}Price` as const;
      return row?.[priceKey] ?? FALLBACK_PRICE[meal];
    },
    [menu]
  );

  const nameOf = useCallback(
    (dayName: string, meal: MealKey) => menu.find((m) => m.day === dayName)?.[meal] ?? '',
    [menu]
  );

  /** One entry per delivery date in the chosen range. */
  const days = useMemo(() => {
    const out: { date: string; dayName: string }[] = [];
    const end = fromISODate(range.end);
    for (let cursor = fromISODate(range.start); cursor <= end; cursor = addDays(cursor, 1)) {
      out.push({ date: toISODate(cursor), dayName: WEEKDAYS[cursor.getDay()] });
    }
    return out;
  }, [range]);

  const selfMealsFor = useCallback(
    (date: string) => selfOverrides[date] ?? defaultMeals,
    [selfOverrides, defaultMeals]
  );
  const guestMealsFor = useCallback((date: string) => guestOverrides[date] ?? NONE, [guestOverrides]);

  const totals = useMemo(() => {
    let selfMealPrice = 0;
    let guestMealPrice = 0;
    let selfDays = 0;
    let guestDays = 0;

    for (const { date, dayName } of days) {
      const self = selfMealsFor(date);
      const guest = guestMealsFor(date);
      let hasSelf = false;
      let hasGuest = false;

      for (const meal of MEALS) {
        // A meal that is not on the menu for that day cannot be ordered.
        if (!nameOf(dayName, meal.key)) continue;
        if (self[meal.key]) {
          selfMealPrice += priceOf(dayName, meal.key);
          hasSelf = true;
        }
        if (enableGuestMeal && guest[meal.key]) {
          guestMealPrice += priceOf(dayName, meal.key);
          hasGuest = true;
        }
      }

      if (hasSelf) selfDays++;
      if (hasGuest) guestDays++;
    }

    // A subscription covers delivery for the subscriber, never for guests.
    const selfDelivery = hasActiveSubscription ? 0 : selfDays * DELIVERY_CHARGE_PER_DAY;
    const guestDelivery = guestDays * DELIVERY_CHARGE_PER_DAY;

    return {
      selfMealPrice,
      guestMealPrice,
      selfDelivery,
      guestDelivery,
      selfDays,
      guestDays,
      selfTotal: selfMealPrice + selfDelivery,
      guestTotal: guestMealPrice + guestDelivery,
      total: selfMealPrice + selfDelivery + guestMealPrice + guestDelivery,
    };
  }, [days, selfMealsFor, guestMealsFor, nameOf, priceOf, enableGuestMeal, hasActiveSubscription]);

  /* ---------------------------------------------------------------------- */
  /* Handlers                                                               */
  /* ---------------------------------------------------------------------- */

  /** Changing a global toggle drops per-day tweaks, so the result is predictable. */
  const toggleDefaultMeal = (meal: MealKey) => {
    setDefaultMeals((prev) => ({ ...prev, [meal]: !prev[meal] }));
    setSelfOverrides({});
  };

  const toggleSelfMeal = (date: string, meal: MealKey) => {
    setSelfOverrides((prev) => {
      const current = prev[date] ?? defaultMeals;
      return { ...prev, [date]: { ...current, [meal]: !current[meal] } };
    });
  };

  const toggleGuestMeal = (date: string, meal: MealKey) => {
    setGuestOverrides((prev) => {
      const current = prev[date] ?? NONE;
      return { ...prev, [date]: { ...current, [meal]: !current[meal] } };
    });
  };

  const openConfirm = () => {
    if (totals.total === 0) {
      toast.error('দয়া করে কমপক্ষে একটি খাবার নির্বাচন করুন');
      return;
    }
    if (!selectedZone) {
      toast.error('দয়া করে জোন সিলেক্ট করুন');
      return;
    }
    if (!address.trim()) {
      toast.error('দয়া করে ডেলিভারি ঠিকানা দিন');
      return;
    }
    // Only the subscriber's own meals come out of the wallet; guest meals are cash.
    if (hasActiveSubscription && totals.selfMealPrice > walletBalance) {
      setShortfall(totals.selfMealPrice - walletBalance);
      return;
    }
    setShowConfirm(true);
  };

  const handleSubmit = async () => {
    setShowConfirm(false);
    setSubmitting(true);

    try {
      for (const { date } of days) {
        const res = await orderAPI.checkDateBlocked(date);
        if (res.success && res.isBlocked) {
          toast.error(`${bengaliDate(date)} তারিখে ডেলিভারি বন্ধ আছে`);
          return;
        }
      }

      let placed = 0;
      let latestBalance = walletBalance;

      for (const { date, dayName } of days) {
        const self = selfMealsFor(date);
        const guest = guestMealsFor(date);

        for (const meal of MEALS) {
          const itemName = nameOf(dayName, meal.key);
          if (!itemName) continue;
          const price = priceOf(dayName, meal.key);

          const base = {
            deliveryDate: date,
            deliveryTime: meal.key,
            address,
            zone: selectedZone,
            items: [{ name: itemName, price, quantity: 1 }],
            totalAmount: price,
          };

          if (self[meal.key]) {
            const res = await orderAPI.createOrder({
              ...base,
              deliveryCharge: hasActiveSubscription ? 0 : DELIVERY_CHARGE_PER_DAY,
              paymentMethod: hasActiveSubscription ? 'wallet' : 'cash',
              specialInstructions: '',
              package: subscriptionData?.packageName || 'Regular',
              orderType: 'self',
            });
            if (res.success) {
              placed++;
              if (typeof res.walletBalance === 'number') latestBalance = res.walletBalance;
            }
          }

          if (enableGuestMeal && guest[meal.key]) {
            const res = await orderAPI.createOrder({
              ...base,
              deliveryCharge: DELIVERY_CHARGE_PER_DAY,
              paymentMethod: 'cash',
              specialInstructions: 'Guest Meal Order',
              package: 'Guest',
              orderType: 'guest',
            });
            if (res.success) placed++;
          }
        }
      }

      if (placed === 0) {
        toast.error('কোনো অর্ডার করা যায়নি');
        return;
      }

      setWalletBalance(latestBalance);
      toast.success(`${bn(placed)}টি অর্ডার সফলভাবে সম্পন্ন হয়েছে!`);

      // Roll the form forward to the week after the one just ordered.
      const nextStart = addDays(fromISODate(range.end), 1);
      setRange({ start: toISODate(nextStart), end: toISODate(addDays(nextStart, 6)) });
      setSelfOverrides({});
      setGuestOverrides({});
      setEnableGuestMeal(false);
      router.push('/dashboard/orders');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'অর্ডার করতে ব্যর্থ হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  if (!hydrated || loading) {
    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-5xl space-y-5">
          <div className="h-32 animate-pulse rounded-3xl bg-ink-100" />
          <div className="h-96 animate-pulse rounded-3xl bg-ink-100" />
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="container-page py-16 md:py-24">
        <div className="mx-auto max-w-md rounded-3xl border border-ink-200 bg-white p-10 text-center shadow-card">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-100 text-brand-700">
            <LogIn size={28} />
          </div>
          <h2 className="mt-5 text-xl font-bold text-ink-900">অর্ডার করতে লগইন করুন</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            আপনার ঠিকানা আর ওয়ালেট অ্যাকাউন্টের সাথে যুক্ত, তাই অর্ডার করার আগে লগইন করা দরকার।
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/login" className={buttonClass('primary', 'lg')}>
              <LogIn size={18} />
              লগইন করুন
            </Link>
            <Link href="/signup" className={buttonClass('secondary', 'lg')}>
              অ্যাকাউন্ট খুলুন
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="container-page py-10 md:py-14">
      <div className="mx-auto max-w-6xl">
        {/* Account strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-ink-200 bg-white p-5 shadow-card">
          <div>
            <p className="text-xs text-ink-500">স্বাগতম</p>
            <p className="text-lg font-bold text-ink-900">{displayName(user)}</p>
          </div>
          {hasActiveSubscription && (
            <div className="text-right">
              <p className="flex items-center justify-end gap-1.5 text-xs text-ink-500">
                <Wallet size={13} />
                ওয়ালেট ব্যালেন্স
              </p>
              <p className="text-2xl font-bold text-ink-900">{taka(walletBalance)}</p>
            </div>
          )}
        </div>

        {!hasActiveSubscription && (
          <div className="mt-5 flex flex-wrap items-center gap-4 rounded-3xl border border-brand-200 bg-brand-50 p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-600 text-white">
              <Crown size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink-900">সাবস্ক্রিপশন ছাড়াই অর্ডার করতে পারবেন</p>
              <p className="mt-0.5 text-sm leading-relaxed text-ink-600">
                তবে সাবস্ক্রাইব করলে ডেলিভারি ফ্রি আর পেমেন্ট ওয়ালেট থেকেই কেটে যাবে।
              </p>
            </div>
            <Link href="/subscription" className={buttonClass('primary', 'md')}>
              প্যাকেজ দেখুন
            </Link>
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          {/* ------------------------------------------------ configuration */}
          <div className="space-y-6">
            {/* Which meals */}
            <section className="rounded-3xl border border-ink-200 bg-white p-6 shadow-card">
              <h2 className="text-base font-bold text-ink-900">কোন বেলার খাবার নেবেন?</h2>
              <p className="mt-1 text-sm text-ink-500">এখানে যা বাছবেন সেটাই প্রতিদিনের ডিফল্ট হবে।</p>

              <div className="mt-4 grid grid-cols-3 gap-2.5">
                {MEALS.map((meal) => {
                  const on = defaultMeals[meal.key];
                  return (
                    <button
                      key={meal.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleDefaultMeal(meal.key)}
                      className={`flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-4 text-sm font-semibold transition ${
                        on
                          ? 'border-brand-500 bg-brand-50 text-brand-800'
                          : 'border-ink-200 text-ink-600 hover:border-ink-300'
                      }`}
                    >
                      <meal.icon size={20} className={on ? 'text-brand-600' : 'text-ink-400'} />
                      {meal.label}
                    </button>
                  );
                })}
              </div>

              <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-ink-50 p-4">
                <span className="flex items-center gap-3">
                  <Users size={19} className="shrink-0 text-leaf-600" />
                  <span>
                    <span className="block text-sm font-semibold text-ink-900">গেস্ট মিল</span>
                    <span className="mt-0.5 block text-xs text-ink-500">অন্য কারো জন্যও খাবার নিতে চান?</span>
                  </span>
                </span>
                <span className="relative shrink-0">
                  <input
                    type="checkbox"
                    checked={enableGuestMeal}
                    onChange={(e) => setEnableGuestMeal(e.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="block h-6 w-11 rounded-full bg-ink-300 transition peer-checked:bg-leaf-600" />
                  <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition peer-checked:translate-x-5" />
                </span>
              </label>
            </section>

            {/* Dates */}
            <section className="rounded-3xl border border-ink-200 bg-white p-6 shadow-card">
              <h2 className="text-base font-bold text-ink-900">কোন দিনগুলোর জন্য?</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="শুরুর তারিখ" htmlFor="startDate" required>
                  <Input
                    id="startDate"
                    icon={Calendar}
                    type="date"
                    value={range.start}
                    min={toISODate(new Date())}
                    onChange={(e) =>
                      setRange((prev) => ({
                        start: e.target.value,
                        end: prev.end < e.target.value ? e.target.value : prev.end,
                      }))
                    }
                  />
                </Field>
                <Field label="শেষ তারিখ" htmlFor="endDate" required>
                  <Input
                    id="endDate"
                    icon={Calendar}
                    type="date"
                    value={range.end}
                    min={range.start}
                    onChange={(e) => setRange((prev) => ({ ...prev, end: e.target.value }))}
                  />
                </Field>
              </div>
              <p className="mt-3 text-xs text-ink-500">
                {bn(days.length)} দিনের খাবার নির্বাচন করা হয়েছে।
              </p>
            </section>

            {/* Per-day list */}
            <section className="rounded-3xl border border-ink-200 bg-white p-6 shadow-card">
              <h2 className="text-base font-bold text-ink-900">দৈনিক খাবার</h2>
              <p className="mt-1 text-sm text-ink-500">কোনো দিন আলাদা কিছু চাইলে সেই দিনটা খুলে বদলে নিন।</p>

              {days.length === 0 ? (
                <p className="mt-6 rounded-2xl bg-ink-50 p-6 text-center text-sm text-ink-500">
                  তারিখ নির্বাচন করুন।
                </p>
              ) : (
                <ul className="mt-4 space-y-2.5">
                  {days.map(({ date, dayName }) => {
                    const self = selfMealsFor(date);
                    const guest = guestMealsFor(date);
                    const open = expanded[date] ?? false;
                    const chosen = MEALS.filter((m) => self[m.key] && nameOf(dayName, m.key));
                    const guestChosen = enableGuestMeal
                      ? MEALS.filter((m) => guest[m.key] && nameOf(dayName, m.key))
                      : [];

                    return (
                      <li key={date} className="overflow-hidden rounded-2xl border border-ink-200">
                        <button
                          type="button"
                          aria-expanded={open}
                          onClick={() => setExpanded((prev) => ({ ...prev, [date]: !open }))}
                          className="flex w-full items-center justify-between gap-3 bg-ink-50 px-4 py-3.5 text-left transition-colors hover:bg-ink-100"
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-ink-900">
                              {dayName} · {bengaliDate(date)}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-ink-500">
                              {chosen.length === 0 && guestChosen.length === 0
                                ? 'কোনো খাবার নির্বাচিত হয়নি'
                                : [
                                    chosen.map((m) => m.label).join(', '),
                                    guestChosen.length > 0 && `গেস্ট: ${guestChosen.map((m) => m.label).join(', ')}`,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                            </span>
                          </span>
                          <ChevronDown
                            size={17}
                            className={`shrink-0 text-ink-500 transition-transform ${open ? 'rotate-180' : ''}`}
                          />
                        </button>

                        {open && (
                          <div className="space-y-4 border-t border-ink-200 p-4">
                            <MealPicker
                              legend={hasActiveSubscription ? 'আমার খাবার (ওয়ালেট থেকে)' : 'আমার খাবার (ক্যাশ অন ডেলিভারি)'}
                              icon={<Wallet size={15} className="text-brand-600" />}
                              dayName={dayName}
                              selection={self}
                              nameOf={nameOf}
                              priceOf={priceOf}
                              onToggle={(meal) => toggleSelfMeal(date, meal)}
                              accent="brand"
                            />

                            {enableGuestMeal && (
                              <MealPicker
                                legend="গেস্ট খাবার (ক্যাশ অন ডেলিভারি)"
                                icon={<Users size={15} className="text-leaf-600" />}
                                dayName={dayName}
                                selection={guest}
                                nameOf={nameOf}
                                priceOf={priceOf}
                                onToggle={(meal) => toggleGuestMeal(date, meal)}
                                accent="leaf"
                              />
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Delivery details */}
            <section className="rounded-3xl border border-ink-200 bg-white p-6 shadow-card">
              <h2 className="text-base font-bold text-ink-900">কোথায় পৌঁছে দেব?</h2>
              <div className="mt-4 space-y-4">
                <Field label="ফোন নাম্বার" htmlFor="orderPhone" required>
                  <Input
                    id="orderPhone"
                    icon={Phone}
                    type="tel"
                    inputMode="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="01XXXXXXXXX"
                  />
                </Field>
                <Field label="জোন / এলাকা" htmlFor="orderZone" required>
                  <ZoneSelect id="orderZone" value={selectedZone} onChange={setSelectedZone} required />
                </Field>
                <Field label="ডেলিভারি ঠিকানা" htmlFor="orderAddress" required>
                  <Textarea
                    id="orderAddress"
                    icon={Home}
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="বাসা / রোড / এলাকা"
                  />
                </Field>
              </div>
            </section>
          </div>

          {/* ------------------------------------------------------ summary */}
          <aside className="lg:sticky lg:top-32 lg:self-start">
            <div className="rounded-3xl border border-ink-200 bg-white p-6 shadow-card">
              <h2 className="text-base font-bold text-ink-900">অর্ডার সামারি</h2>

              <dl className="mt-4 space-y-2.5 text-sm">
                <Line label="আমার খাবার" value={taka(totals.selfMealPrice)} />
                <Line
                  label={
                    hasActiveSubscription
                      ? 'ডেলিভারি চার্জ (সাবস্ক্রিপশন)'
                      : `ডেলিভারি (${bn(totals.selfDays)} দিন × ${taka(DELIVERY_CHARGE_PER_DAY)})`
                  }
                  value={hasActiveSubscription ? 'ফ্রি' : taka(totals.selfDelivery)}
                  muted={hasActiveSubscription}
                />

                {enableGuestMeal && totals.guestMealPrice > 0 && (
                  <>
                    <Line label="গেস্ট খাবার" value={taka(totals.guestMealPrice)} />
                    <Line label="গেস্ট ডেলিভারি" value={taka(totals.guestDelivery)} />
                  </>
                )}

                <div className="flex items-baseline justify-between border-t border-ink-200 pt-3">
                  <dt className="font-semibold text-ink-900">সর্বমোট</dt>
                  <dd className="text-2xl font-bold text-ink-900">{taka(totals.total)}</dd>
                </div>
              </dl>

              {hasActiveSubscription && (
                <p className="mt-4 rounded-xl bg-brand-50 p-3 text-xs leading-relaxed text-brand-900">
                  ওয়ালেট থেকে কাটা হবে {taka(totals.selfMealPrice)} — বর্তমান ব্যালেন্স {taka(walletBalance)}।
                </p>
              )}
              {enableGuestMeal && totals.guestTotal > 0 && (
                <p className="mt-2 rounded-xl bg-leaf-50 p-3 text-xs leading-relaxed text-leaf-700">
                  গেস্ট খাবারের {taka(totals.guestTotal)} ডেলিভারির সময় দিতে হবে।
                </p>
              )}

              <Button
                size="lg"
                fullWidth
                className="mt-5 hidden lg:inline-flex"
                icon={<ShoppingBag size={18} />}
                loading={submitting}
                onClick={openConfirm}
              >
                অর্ডার করুন
              </Button>

              <ul className="mt-5 space-y-1.5 border-t border-ink-100 pt-4 text-xs leading-relaxed text-ink-500">
                <li>সকাল ৭টা–৯টা · দুপুর ১২টা–২টা · রাত ৮টা–১০টা</li>
                <li>মাসের ২য় ও শেষ শুক্রবার রান্নাঘর বন্ধ থাকে।</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile action bar */}
      <div className="sticky bottom-0 z-30 -mx-4 mt-6 border-t border-ink-200 bg-cream/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-4">
          <div className="min-w-0">
            <p className="text-[11px] text-ink-500">সর্বমোট</p>
            <p className="text-lg font-bold text-ink-900">{taka(totals.total)}</p>
          </div>
          <Button size="lg" className="flex-1" loading={submitting} onClick={openConfirm}>
            অর্ডার করুন
          </Button>
        </div>
      </div>

      {/* Insufficient balance */}
      {shortfall !== null && (
        <Modal
          title="ওয়ালেটে টাকা কম পড়েছে"
          icon={
            <span className="grid size-9 place-items-center rounded-xl bg-red-100 text-red-600">
              <AlertCircle size={18} />
            </span>
          }
          onClose={() => setShortfall(null)}
          footer={
            <div className="flex gap-3">
              <Button variant="secondary" size="lg" fullWidth onClick={() => setShortfall(null)}>
                বাতিল
              </Button>
              <Link href="/dashboard/wallet" className={buttonClass('primary', 'lg', 'flex-1')}>
                রিচার্জ করুন
              </Link>
            </div>
          }
        >
          <dl className="space-y-2.5 rounded-2xl bg-ink-50 p-4 text-sm">
            <Line label="প্রয়োজন" value={taka(totals.selfMealPrice)} />
            <Line label="বর্তমান ব্যালেন্স" value={taka(walletBalance)} />
            <div className="flex justify-between border-t border-ink-200 pt-2.5">
              <dt className="font-semibold text-ink-900">ঘাটতি</dt>
              <dd className="font-bold text-red-600">{taka(shortfall)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-ink-500">
            ওয়ালেট রিচার্জ অ্যাডমিন অনুমোদনের পর যোগ হয়, তাই একটু আগেভাগে করে রাখলে ভালো।
          </p>
        </Modal>
      )}

      {/* Confirmation */}
      {showConfirm && (
        <Modal
          title="অর্ডার নিশ্চিত করুন"
          description={`${bn(days.length)} দিনের খাবার`}
          busy={submitting}
          onClose={() => setShowConfirm(false)}
          footer={
            <div className="flex gap-3">
              <Button variant="secondary" size="lg" fullWidth onClick={() => setShowConfirm(false)} disabled={submitting}>
                বাতিল
              </Button>
              <Button size="lg" fullWidth loading={submitting} icon={<CheckCircle2 size={18} />} onClick={handleSubmit}>
                {submitting ? 'হচ্ছে...' : 'কনফার্ম'}
              </Button>
            </div>
          }
        >
          <dl className="space-y-2.5 rounded-2xl bg-ink-50 p-4 text-sm">
            <Line label="আমার খাবার" value={taka(totals.selfMealPrice)} />
            <Line
              label="ডেলিভারি চার্জ"
              value={hasActiveSubscription ? 'ফ্রি' : taka(totals.selfDelivery)}
              muted={hasActiveSubscription}
            />
            {enableGuestMeal && totals.guestTotal > 0 && <Line label="গেস্ট খাবার" value={taka(totals.guestTotal)} />}
            <div className="flex justify-between border-t border-ink-200 pt-2.5">
              <dt className="font-semibold text-ink-900">সর্বমোট</dt>
              <dd className="text-lg font-bold text-ink-900">{taka(totals.total)}</dd>
            </div>
          </dl>

          <div className="mt-4 space-y-1.5 text-sm text-ink-600">
            <p>
              <span className="text-ink-500">ফোন:</span> {phoneNumber || '—'}
            </p>
            <p>
              <span className="text-ink-500">ঠিকানা:</span> {address || '—'}
            </p>
          </div>

          <p className="mt-4 rounded-xl bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900">
            {hasActiveSubscription
              ? 'আমার খাবারের টাকা ওয়ালেট থেকে কেটে নেওয়া হবে।'
              : 'ডেলিভারির সময় ক্যাশে পেমেন্ট করবেন।'}
          </p>
        </Modal>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Small pieces                                                               */
/* -------------------------------------------------------------------------- */

function Line({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-600">{label}</dt>
      <dd className={`font-semibold ${muted ? 'text-leaf-700' : 'text-ink-900'}`}>{value}</dd>
    </div>
  );
}

/** The three checkboxes for one day, for either the subscriber or a guest. */
function MealPicker({
  legend,
  icon,
  dayName,
  selection,
  nameOf,
  priceOf,
  onToggle,
  accent,
}: {
  legend: string;
  icon: ReactNode;
  dayName: string;
  selection: MealSelection;
  nameOf: (day: string, meal: MealKey) => string;
  priceOf: (day: string, meal: MealKey) => number;
  onToggle: (meal: MealKey) => void;
  accent: 'brand' | 'leaf';
}) {
  const ring = accent === 'brand' ? 'text-brand-600' : 'text-leaf-600';

  return (
    <fieldset className={`rounded-2xl p-3.5 ${accent === 'brand' ? 'bg-brand-50/70' : 'bg-leaf-50'}`}>
      <legend className="flex items-center gap-2 px-1 text-xs font-semibold text-ink-700">
        {icon}
        {legend}
      </legend>

      <div className="mt-2 space-y-1">
        {MEALS.map((meal) => {
          const itemName = nameOf(dayName, meal.key);
          const available = Boolean(itemName);

          return (
            <label
              key={meal.key}
              className={`flex items-center justify-between gap-3 rounded-xl px-2.5 py-2 transition-colors ${
                available ? 'cursor-pointer hover:bg-white' : 'cursor-not-allowed opacity-55'
              }`}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={available && selection[meal.key]}
                  disabled={!available}
                  onChange={() => onToggle(meal.key)}
                  className={`size-4.5 shrink-0 rounded border-ink-300 ${ring} focus:ring-brand-500`}
                />
                <meal.icon size={16} className={`shrink-0 ${meal.tint}`} />
                <span className="min-w-0">
                  <span className="block text-sm text-ink-800">{meal.full}</span>
                  <span className="block truncate text-xs text-ink-500">{itemName || 'এখনো ঠিক হয়নি'}</span>
                </span>
              </span>
              {available && (
                <span className="shrink-0 text-sm font-semibold text-ink-900">{taka(priceOf(dayName, meal.key))}</span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
