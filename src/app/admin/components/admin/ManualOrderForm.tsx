'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, ChevronDown, Coffee, Moon, ShoppingBag, Sun, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { manualOrderAPI, menuAPI, packageAPI } from '@/app/admin/lib/api';
import ZoneSelect from '@/app/admin/components/ui/ZoneSelect';
import Button from '@/components/ui/Button';
import { DateInput, Field, Input, Select, Textarea } from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import { bengaliDate, bn, taka } from '@/lib/format';

/**
 * Phone / walk-in order entry, mirroring the customer form on /order.
 *
 * It used to take a single date and a single meal with the item name and price
 * typed by hand — so a week of three-meal orders meant twenty-one trips through
 * the dialog, and a mistyped price silently broke the day's revenue. Now it
 * takes a date range and the meals wanted, and fills each item and price from
 * the weekly menu for that weekday, exactly as a customer's own order does.
 *
 * One ManualOrder document is created per meal per day, because
 * `ManualOrder.deliveryTime` holds a single slot — same shape the customer
 * ordering flow produces.
 */

type MealKey = 'morning' | 'lunch' | 'dinner';
type MealSelection = Record<MealKey, boolean>;

const MEALS = [
  { key: 'morning', label: 'সকাল', full: 'সকালের খাবার', icon: Coffee, tint: 'text-amber-600' },
  { key: 'lunch', label: 'দুপুর', full: 'দুপুরের খাবার', icon: Sun, tint: 'text-brand-600' },
  { key: 'dinner', label: 'রাত', full: 'রাতের খাবার', icon: Moon, tint: 'text-indigo-600' },
] as const satisfies readonly { key: MealKey; label: string; full: string; icon: typeof Coffee; tint: string }[];

/** JS getDay() is Sunday-first; menu rows are keyed by these Bengali names. */
const WEEKDAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

/** Fallback only when a menu row carries no price of its own. */
const FALLBACK_PRICE: Record<MealKey, number> = { morning: 50, lunch: 80, dinner: 100 };

interface MenuRow {
  day: string;
  morning: string;
  lunch: string;
  dinner: string;
  morningPrice?: number;
  lunchPrice?: number;
  dinnerPrice?: number;
}

interface PackageRow {
  _id: string;
  name: string;
  title: string;
  isActive: boolean;
}

/** Local YYYY-MM-DD — toISOString() would shift the day in Dhaka. */
function toISODate(date: Date) {
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
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

export default function ManualOrderForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  /** Called after a successful create so the caller can refresh its list. */
  onCreated: () => void;
}) {
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [zone, setZone] = useState('');
  const [address, setAddress] = useState('');
  const [orderType, setOrderType] = useState<'cod' | 'subscription'>('cod');
  const [note, setNote] = useState('');

  const [range, setRange] = useState(() => {
    const today = new Date();
    return { start: toISODate(today), end: toISODate(today) };
  });

  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [packageName, setPackageName] = useState('');
  const [menu, setMenu] = useState<MenuRow[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);

  /** The meals wanted on every day, unless a day overrides it. */
  const [defaultMeals, setDefaultMeals] = useState<MealSelection>({
    morning: false,
    lunch: true,
    dinner: false,
  });
  const [overrides, setOverrides] = useState<Record<string, MealSelection>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await packageAPI.getAllPackages();
        if (cancelled || !res.success) return;
        const active = (res.data ?? []).filter((p: PackageRow) => p.isActive);
        setPackages(active);
        if (active[0]) setPackageName(active[0].name);
      } catch {
        toast.error('প্যাকেজ লোড করা যায়নি');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The menu is what fills in item names and prices, so it reloads whenever
  // the admin switches package.
  useEffect(() => {
    if (!packageName) return;
    let cancelled = false;
    setMenuLoading(true);
    (async () => {
      try {
        const res = await menuAPI.getMenuByPackage(packageName);
        if (!cancelled && res.success) setMenu(res.data ?? []);
      } catch {
        if (!cancelled) toast.error('মেনু লোড করা যায়নি');
      } finally {
        if (!cancelled) setMenuLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [packageName]);

  const nameOf = useCallback(
    (dayName: string, meal: MealKey) => menu.find((m) => m.day === dayName)?.[meal] ?? '',
    [menu]
  );

  const priceOf = useCallback(
    (dayName: string, meal: MealKey) => {
      const row = menu.find((m) => m.day === dayName);
      return row?.[`${meal}Price` as const] ?? FALLBACK_PRICE[meal];
    },
    [menu]
  );

  /** Every date in the chosen range, with its Bengali weekday. */
  const days = useMemo(() => {
    const out: { date: string; dayName: string }[] = [];
    const start = fromISODate(range.start);
    const end = fromISODate(range.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return out;
    // A guard against a typo'd year generating thousands of rows.
    for (let cursor = start, i = 0; cursor <= end && i < 90; cursor = addDays(cursor, 1), i++) {
      out.push({ date: toISODate(cursor), dayName: WEEKDAYS[cursor.getDay()] });
    }
    return out;
  }, [range]);

  const mealsFor = useCallback(
    (date: string) => overrides[date] ?? defaultMeals,
    [overrides, defaultMeals]
  );

  /** Lines that will actually be created, one per meal per day. */
  const lines = useMemo(() => {
    const out: { date: string; dayName: string; meal: MealKey; name: string; price: number }[] = [];
    for (const { date, dayName } of days) {
      const selected = mealsFor(date);
      for (const meal of MEALS) {
        if (!selected[meal.key]) continue;
        const name = nameOf(dayName, meal.key);
        if (!name) continue; // not on the menu that day, so not orderable
        out.push({ date, dayName, meal: meal.key, name, price: priceOf(dayName, meal.key) });
      }
    }
    return out;
  }, [days, mealsFor, nameOf, priceOf]);

  const total = lines.reduce((sum, line) => sum + line.price, 0);

  /* ---------------------------------------------------------------------- */

  /** Changing a global toggle drops per-day tweaks, so the result is predictable. */
  const toggleDefaultMeal = (meal: MealKey) => {
    setDefaultMeals((prev) => ({ ...prev, [meal]: !prev[meal] }));
    setOverrides({});
  };

  const toggleDayMeal = (date: string, meal: MealKey) => {
    setOverrides((prev) => {
      const current = prev[date] ?? defaultMeals;
      return { ...prev, [date]: { ...current, [meal]: !current[meal] } };
    });
  };

  const submit = async () => {
    if (!customerName.trim()) return toast.error('গ্রাহকের নাম দিন');
    if (!phoneNumber.trim()) return toast.error('ফোন নাম্বার দিন');
    if (!zone) return toast.error('জোন সিলেক্ট করুন');
    if (!address.trim()) return toast.error('ঠিকানা দিন');
    if (lines.length === 0) return toast.error('কমপক্ষে একটি দিনের একটি বেলা নির্বাচন করুন');

    const paymentMethod = orderType === 'subscription' ? 'wallet' : 'cash';

    try {
      setSubmitting(true);
      let created = 0;

      // Sequential on purpose: each call mints an orderId server-side.
      for (const line of lines) {
        const res = await manualOrderAPI.createOrder({
          customerName: customerName.trim(),
          phoneNumber: phoneNumber.trim(),
          address: address.trim(),
          zone,
          items: [{ name: line.name, price: line.price, quantity: 1 }],
          totalAmount: line.price,
          deliveryDate: line.date,
          deliveryTime: line.meal,
          paymentMethod,
          specialInstructions: note.trim(),
        });
        if (res.success) created++;
      }

      if (created === 0) {
        toast.error('অর্ডার তৈরি করা যায়নি');
        return;
      }

      toast.success(`${bn(created)}টি ম্যানুয়াল অর্ডার তৈরি হয়েছে`);
      onCreated();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'অর্ডার তৈরি করা যায়নি');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------------------------------------------------------------- */

  /** The same অর্ডার সামারি panel the customer sees, reused in both places. */
  const summary = (
    <>
      <h3 className="text-base font-bold text-ink-900">অর্ডার সামারি</h3>
      <dl className="mt-4 space-y-2.5 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-600">খাবার ({bn(lines.length)}টি)</dt>
          <dd className="font-semibold text-ink-900">{taka(total)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-600">দিন</dt>
          <dd className="font-semibold text-ink-900">{bn(days.length)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-600">পেমেন্ট</dt>
          <dd className="font-semibold text-ink-900">
            {orderType === 'subscription' ? 'ওয়ালেট' : 'ক্যাশ অন ডেলিভারি'}
          </dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-ink-200 pt-3">
          <dt className="font-semibold text-ink-900">সর্বমোট</dt>
          <dd className="text-2xl font-bold text-ink-900">{taka(total)}</dd>
        </div>
      </dl>

      <Button
        fullWidth
        size="lg"
        className="mt-5"
        loading={submitting}
        icon={<ShoppingBag size={17} />}
        onClick={submit}
      >
        {submitting ? 'তৈরি হচ্ছে...' : 'অর্ডার তৈরি করুন'}
      </Button>

      {/* The same delivery windows the customer sees — handy to read out on a call. */}
      <ul className="mt-4 space-y-1.5 border-t border-ink-100 pt-4 text-xs leading-relaxed text-ink-500">
        <li>সকাল ৭টা–৯টা · দুপুর ১২টা–২টা · রাত ৮টা–১০টা</li>
        <li>মাসের ২য় ও শেষ শুক্রবার রান্নাঘর বন্ধ থাকে।</li>
        <li>প্রতি বেলার জন্য আলাদা অর্ডার তৈরি হবে।</li>
      </ul>
    </>
  );

  return (
    <Modal
      size="xl"
      title="নতুন ম্যানুয়াল অর্ডার"
      description="ফোনে বা সরাসরি আসা অর্ডার এখানে তুলুন"
      busy={submitting}
      onClose={onClose}
      // Phones get the total and action as a sticky bar; desktop shows the
      // summary panel instead, so the bar is dropped entirely rather than left
      // as an empty bordered strip.
      footer={
        <div className="flex items-center gap-3 lg:hidden">
          <div className="min-w-0 shrink-0">
            <p className="text-[11px] whitespace-nowrap text-ink-500">
              {bn(lines.length)}টি খাবার · {bn(days.length)} দিন
            </p>
            <p className="text-lg font-bold text-ink-900">{taka(total)}</p>
          </div>
          <Button size="lg" className="min-w-0 flex-1" loading={submitting} onClick={submit}>
            {submitting ? 'হচ্ছে...' : 'অর্ডার তৈরি করুন'}
          </Button>
        </div>
      }
      hideFooterOnDesktop
    >
      {/* Two columns from lg, exactly like /order: form left, summary right. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/*
          min-w-0 is load-bearing. A grid item defaults to min-width:auto, so it
          refuses to shrink below its content's min-content width — on a phone
          that pushed this column 136px past the dialog and gave the whole sheet
          a horizontal scrollbar.
        */}
        <div className="min-w-0 space-y-5">
        {/* Customer */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="গ্রাহকের নাম" htmlFor="mo-name" required>
            <Input
              id="mo-name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="গ্রাহকের নাম"
            />
          </Field>
          <Field label="ফোন নাম্বার" htmlFor="mo-phone" required>
            <Input
              id="mo-phone"
              type="tel"
              inputMode="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="01XXXXXXXXX"
            />
          </Field>
        </div>

        {/* Zone — the component carries its own "নতুন" button for a new area. */}
        <Field label="জোন / এলাকা" htmlFor="mo-zone" required>
          <ZoneSelect value={zone} onChange={setZone} required />
        </Field>

        <Field label="ঠিকানা" htmlFor="mo-address" required>
          <Textarea
            id="mo-address"
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="বাসা / রোড / এলাকা"
          />
        </Field>

        {/* Order type + which package's menu to price against */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="অর্ডার টাইপ" htmlFor="mo-type" required>
            <Select
              id="mo-type"
              value={orderType}
              onChange={(e) => setOrderType(e.target.value as 'cod' | 'subscription')}
            >
              <option value="cod">ক্যাশ অন ডেলিভারি</option>
              <option value="subscription">সাবস্ক্রিপশন (ওয়ালেট)</option>
            </Select>
          </Field>
          <Field label="প্যাকেজ" htmlFor="mo-package" required hint="এই প্যাকেজের মেনু থেকে দাম নেওয়া হবে।">
            <Select id="mo-package" value={packageName} onChange={(e) => setPackageName(e.target.value)}>
              {packages.length === 0 && <option value="">লোড হচ্ছে...</option>}
              {packages.map((pkg) => (
                <option key={pkg._id} value={pkg.name}>
                  {pkg.title}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {/* Date range */}
        <div className="rounded-2xl border border-ink-200 p-4">
          <p className="text-sm font-semibold text-ink-900">কোন দিনগুলোর জন্য?</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="শুরুর তারিখ" htmlFor="mo-start" required>
              <DateInput
                id="mo-start"
                value={range.start}
                onChange={(start) => setRange((prev) => ({ start, end: prev.end < start ? start : prev.end }))}
              />
            </Field>
            <Field label="শেষ তারিখ" htmlFor="mo-end" required>
              <DateInput
                id="mo-end"
                value={range.end}
                min={range.start}
                onChange={(end) => setRange((prev) => ({ ...prev, end }))}
              />
            </Field>
          </div>
          <p className="mt-2 text-xs text-ink-500">
            একদিনের জন্য হলে দুই তারিখ একই রাখুন। {bn(days.length)} দিন নির্বাচিত।
          </p>
        </div>

        {/* Meals */}
        <div className="rounded-2xl border border-ink-200 p-4">
          <p className="text-sm font-semibold text-ink-900">কোন বেলার খাবার?</p>
          <p className="mt-0.5 text-xs text-ink-500">এখানে যা বাছবেন সেটাই প্রতিদিনের ডিফল্ট হবে।</p>
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {MEALS.map((meal) => {
              const on = defaultMeals[meal.key];
              return (
                <button
                  key={meal.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleDefaultMeal(meal.key)}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-3.5 text-sm font-semibold transition ${
                    on ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-ink-200 text-ink-600 hover:border-ink-300'
                  }`}
                >
                  <meal.icon size={19} className={on ? 'text-brand-600' : 'text-ink-400'} />
                  {meal.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Per-day list, auto-filled from the weekly menu */}
        <div>
          <p className="text-sm font-semibold text-ink-900">দৈনিক খাবার</p>
          <p className="mt-0.5 text-xs text-ink-500">
            মেনু অনুযায়ী নাম ও দাম নিজে বসে যাবে। কোনো দিন আলাদা কিছু চাইলে সেই দিনটা খুলে বদলে নিন।
          </p>

          {menuLoading ? (
            <div className="mt-3 h-24 animate-pulse rounded-2xl bg-ink-100" />
          ) : days.length === 0 ? (
            <p className="mt-3 rounded-2xl bg-ink-50 p-5 text-center text-sm text-ink-500">
              সঠিক তারিখ নির্বাচন করুন।
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {days.map(({ date, dayName }) => {
                const selected = mealsFor(date);
                const open = expanded[date] ?? false;
                const picked = MEALS.filter((m) => selected[m.key] && nameOf(dayName, m.key));
                const dayTotal = picked.reduce((sum, m) => sum + priceOf(dayName, m.key), 0);

                return (
                  <li key={date} className="overflow-hidden rounded-2xl border border-ink-200">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setExpanded((prev) => ({ ...prev, [date]: !open }))}
                      className="flex w-full items-center justify-between gap-3 bg-ink-50 px-4 py-3 text-left transition-colors hover:bg-ink-100"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink-900">
                          {dayName} · {bengaliDate(date)}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-ink-500">
                          {picked.length === 0
                            ? 'কোনো খাবার নির্বাচিত হয়নি'
                            : `${picked.map((m) => m.label).join(', ')} · ${taka(dayTotal)}`}
                        </span>
                      </span>
                      <ChevronDown
                        size={17}
                        className={`shrink-0 text-ink-500 transition-transform ${open ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {open && (
                      <div className="border-t border-ink-200 p-3">
                        {/* Tinted panel with a legend, matching /order's day detail. */}
                        <fieldset className="rounded-2xl bg-brand-50/70 p-3">
                          <legend className="flex items-center gap-2 px-1 text-xs font-semibold text-ink-700">
                            {orderType === 'subscription' ? (
                              <>
                                <Wallet size={14} className="text-brand-600" />
                                খাবার (ওয়ালেট থেকে)
                              </>
                            ) : (
                              <>
                                <Banknote size={14} className="text-leaf-600" />
                                খাবার (ক্যাশ অন ডেলিভারি)
                              </>
                            )}
                          </legend>
                          <div className="mt-1 space-y-1">
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
                                  checked={available && selected[meal.key]}
                                  disabled={!available}
                                  onChange={() => toggleDayMeal(date, meal.key)}
                                  className="size-4.5 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                                />
                                <meal.icon size={16} className={`shrink-0 ${meal.tint}`} />
                                <span className="min-w-0">
                                  <span className="block text-sm text-ink-800">{meal.full}</span>
                                  <span className="block truncate text-xs text-ink-500">
                                    {itemName || 'মেনুতে নেই'}
                                  </span>
                                </span>
                              </span>
                              {available && (
                                <span className="shrink-0 text-sm font-semibold text-ink-900">
                                  {taka(priceOf(dayName, meal.key))}
                                </span>
                              )}
                            </label>
                          );
                        })}
                          </div>
                        </fieldset>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

          <Field label="বিশেষ নির্দেশনা" htmlFor="mo-note" hint="না থাকলে ফাঁকা রাখুন।">
            <Textarea
              id="mo-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="যেমন: ঝাল কম দিতে হবে"
            />
          </Field>
        </div>

        {/* Summary column — sticky, like the customer form's. */}
        <aside className="hidden lg:block">
          <div className="sticky top-0 rounded-2xl border border-ink-200 bg-white p-5 shadow-card">{summary}</div>
        </aside>
      </div>
    </Modal>
  );
}
