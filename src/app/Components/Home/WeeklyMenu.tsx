'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Coffee, Moon, RefreshCw, Sun, UtensilsCrossed } from 'lucide-react';
import { menuAPI, packageAPI, subscriptionAPI } from '@/lib/api';
import { useSession } from '@/lib/useSession';
import SectionHeading from '@/components/ui/SectionHeading';
import { sortByMenuDay, taka, todayAndTomorrow } from '@/lib/format';
import { COD_MEAL_SURCHARGE, mealPrice } from '@/lib/rules';

/** How the viewer would pay: a subscriber from the wallet, everyone else cash. */
type Pay = 'cash' | 'wallet';

interface MenuDay {
  _id?: string;
  day: string;
  morning?: string;
  lunch?: string;
  dinner?: string;
  morningPrice?: number;
  lunchPrice?: number;
  dinnerPrice?: number;
}

interface PackageType {
  _id: string;
  name: string;
  title: string;
  isActive: boolean;
}

/** The three meal slots, in the order they are eaten. */
const SLOTS = [
  { key: 'morning', priceKey: 'morningPrice', label: 'সকাল', icon: Coffee, tint: 'text-amber-600 bg-amber-50' },
  { key: 'lunch', priceKey: 'lunchPrice', label: 'দুপুর', icon: Sun, tint: 'text-brand-600 bg-brand-50' },
  { key: 'dinner', priceKey: 'dinnerPrice', label: 'রাত', icon: Moon, tint: 'text-indigo-600 bg-indigo-50' },
] as const;

function mealOf(row: MenuDay | undefined, slot: (typeof SLOTS)[number], pay: Pay) {
  return {
    name: (row?.[slot.key] as string) || 'এখনো ঠিক হয়নি',
    // The menu price is the wallet price; cash on delivery costs more per meal.
    price: mealPrice((row?.[slot.priceKey] as number) ?? 0, pay),
    available: Boolean(row?.[slot.key]),
  };
}

/** One meal row inside a spotlight card. */
function MealRow({ row, slot, pay }: { row: MenuDay | undefined; slot: (typeof SLOTS)[number]; pay: Pay }) {
  const meal = mealOf(row, slot, pay);
  return (
    <div className="flex items-start gap-3 py-3">
      <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${slot.tint}`}>
        <slot.icon size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-ink-500">{slot.label}</p>
        <p className={`mt-0.5 text-sm leading-snug ${meal.available ? 'text-ink-900' : 'text-ink-400 italic'}`}>
          {meal.name}
        </p>
      </div>
      {meal.available && (
        <span className="shrink-0 text-sm font-semibold text-ink-900">{taka(meal.price)}</span>
      )}
    </div>
  );
}

function SpotlightCard({
  title,
  day,
  row,
  pay,
  highlight,
}: {
  title: string;
  day: string;
  row: MenuDay | undefined;
  pay: Pay;
  highlight?: boolean;
}) {
  return (
    <article
      className={`rounded-2xl border bg-white p-5 shadow-card ${
        highlight ? 'border-brand-300 ring-1 ring-brand-200' : 'border-ink-200'
      }`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-ink-100 pb-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-brand-600 uppercase">{title}</p>
          <p className="mt-0.5 text-lg font-bold text-ink-900">{day}</p>
        </div>
        {highlight && (
          <span className="rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">আজ</span>
        )}
      </header>
      <div className="divide-y divide-ink-100">
        {SLOTS.map((slot) => (
          <MealRow key={slot.key} row={row} slot={slot} pay={pay} />
        ))}
      </div>
    </article>
  );
}

function Skeleton() {
  return (
    <div className="mt-12 animate-pulse space-y-6">
      <div className="flex justify-center gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-11 w-36 rounded-full bg-ink-200" />
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="h-64 rounded-2xl bg-ink-200" />
        <div className="h-64 rounded-2xl bg-ink-200" />
      </div>
      <div className="h-72 rounded-2xl bg-ink-200" />
    </div>
  );
}

/**
 * `compact` is for the order page, where this sits directly above the form.
 *
 * There it is a reference panel, not a landing-page section: no full-bleed
 * white band, no "scroll down to order" call to action, and the heading points
 * at the form below instead of inviting a click. The default keeps the home
 * page exactly as it was.
 *
 * A subscriber is tied to the package they bought, so on the order page (where
 * `compact` is set) they see only that package's menu — no tabs, and no way to
 * browse, and so order from, another package. Everyone else, and the home
 * page, still sees every package.
 */
export default function WeeklyMenu({ compact = false }: { compact?: boolean }) {
  const { user, hydrated } = useSession();
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [activeId, setActiveId] = useState('');
  const [menus, setMenus] = useState<Record<string, MenuDay[]>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [menuLoading, setMenuLoading] = useState(false);
  const [openDay, setOpenDay] = useState('');

  const { today, tomorrow } = todayAndTomorrow();

  const loadMenu = useCallback(async (pkg: PackageType) => {
    setMenuLoading(true);
    setErrors((prev) => ({ ...prev, [pkg._id]: null }));
    try {
      const res = await menuAPI.getMenuByPackage(pkg.name);
      if (res.success && res.data?.length) {
        setMenus((prev) => ({ ...prev, [pkg._id]: sortByMenuDay(res.data as MenuDay[]) }));
      } else {
        setMenus((prev) => ({ ...prev, [pkg._id]: [] }));
        setErrors((prev) => ({ ...prev, [pkg._id]: 'এই প্যাকেজের মেনু এখনো যোগ করা হয়নি' }));
      }
    } catch (err) {
      setMenus((prev) => ({ ...prev, [pkg._id]: [] }));
      setErrors((prev) => ({
        ...prev,
        [pkg._id]: err instanceof Error ? err.message : 'মেনু লোড করা যায়নি',
      }));
    } finally {
      setMenuLoading(false);
    }
  }, []);

  /** The subscriber's package name, once known — null for everyone else. */
  const [ownPackage, setOwnPackage] = useState<{ name: string; title?: string } | null>(null);
  /**
   * Whether the viewer has an active subscription, which decides which price
   * the menu quotes. Unlike `ownPackage` this is wanted everywhere, not only on
   * the order page: a visitor on the home page pays cash, so they must be
   * quoted the cash price there too.
   */
  const [subscribed, setSubscribed] = useState(false);
  const pay: Pay = subscribed ? 'wallet' : 'cash';

  useEffect(() => {
    // The session is unknown until hydration; deciding early would show a
    // subscriber the full list for a moment.
    if (!hydrated) return;
    let cancelled = false;
    (async () => {
      try {
        let mine: { name: string; title?: string } | null = null;
        let isSubscribed = false;
        if (user) {
          try {
            const subs = await subscriptionAPI.getMySubscriptions();
            const mySub = (subs.data ?? []).find((x: { status: string }) => x.status === 'active');
            isSubscribed = Boolean(mySub);
            // Only the order page narrows the list down to their own package.
            if (compact && mySub?.package) mine = { name: mySub.package, title: mySub.packageName };
          } catch {
            // Not fatal: they see every package and the cash price, as a
            // visitor would.
          }
        }

        const res = await packageAPI.getAllPackages();
        let active: PackageType[] = (res.data ?? []).filter((p: PackageType) => p.isActive);
        if (mine) {
          const own = active.filter((p) => p.name === mine!.name);
          // Their package may have been switched off since they subscribed; it
          // still has to be the only one shown, so stand one in by name.
          active = own.length
            ? own
            : [{ _id: mine.name, name: mine.name, title: mine.title || mine.name, isActive: true }];
        }
        if (cancelled) return;
        setSubscribed(isSubscribed);
        setOwnPackage(mine);
        setPackages(active);
        if (active.length) {
          setActiveId(active[0]._id);
          await loadMenu(active[0]);
        }
      } catch {
        if (!cancelled) setPackages([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMenu, compact, user, hydrated]);

  const selectPackage = (pkg: PackageType) => {
    setActiveId(pkg._id);
    if (!menus[pkg._id]) loadMenu(pkg);
  };

  const rows = menus[activeId] ?? [];
  const error = errors[activeId];
  const activePackage = packages.find((p) => p._id === activeId);

  // Mobile shows one day at a time; default to today when the week includes it.
  const days = rows.map((r) => r.day);
  const mobileDay = openDay && days.includes(openDay) ? openDay : days.includes(today) ? today : days[0];
  const mobileRow = rows.find((r) => r.day === mobileDay);

  return (
    <section
      id={compact ? undefined : 'weekly-menu'}
      className={
        compact
          ? 'pt-10 pb-2'
          : 'scroll-mt-32 border-y border-ink-200/70 bg-white py-16 md:py-24'
      }
    >
      <div className="container-page">
        <SectionHeading
          eyebrow="সাপ্তাহিক মেনু"
          title={compact ? 'আগে মেনুটা দেখে নিন' : 'এই সপ্তাহে কী কী থাকছে'}
          subtitle={
            compact
              ? ownPackage
                ? 'আপনার সাবস্ক্রাইব করা প্যাকেজের খাবার আর দাম দেখুন, তারপর নিচের ফর্মে দিন ও বেলা ঠিক করুন।'
                : 'প্যাকেজ বেছে নিয়ে সপ্তাহের খাবার আর দাম দেখুন, তারপর নিচের ফর্মে দিন ও বেলা ঠিক করুন।'
              : 'প্যাকেজ বেছে নিয়ে পুরো সপ্তাহের মেনু আর দাম দেখে নিন।'
          }
        />

        {loading ? (
          <Skeleton />
        ) : packages.length === 0 ? (
          <div className="mx-auto mt-12 max-w-md rounded-2xl border border-ink-200 bg-ink-50 p-10 text-center">
            <AlertCircle className="mx-auto size-10 text-ink-400" />
            <p className="mt-4 font-semibold text-ink-800">এখন কোনো প্যাকেজ চালু নেই</p>
            <p className="mt-1 text-sm text-ink-500">শীঘ্রই নতুন প্যাকেজ যোগ করা হবে।</p>
          </div>
        ) : (
          <>
            {/* A subscriber has one package: name it instead of offering tabs. */}
            {ownPackage && (
              <p className="mt-10 text-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md">
                  আপনার প্যাকেজ: {activePackage?.title ?? ownPackage.title ?? ownPackage.name}
                </span>
              </p>
            )}

            {/* Package tabs */}
            <div
              hidden={Boolean(ownPackage)}
              role="tablist"
              aria-label="প্যাকেজ"
              className="mt-10 flex gap-2.5 overflow-x-auto pb-2 no-scrollbar md:justify-center"
            >
              {packages.map((pkg) => {
                const selected = pkg._id === activeId;
                return (
                  <button
                    key={pkg._id}
                    role="tab"
                    aria-selected={selected}
                    onClick={() => selectPackage(pkg)}
                    className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                      selected
                        ? 'bg-ink-900 text-white shadow-md'
                        : 'border border-brand-300 bg-white text-ink-600 hover:border-brand-300 hover:text-ink-900'
                    }`}
                  >
                    {pkg.title}
                  </button>
                );
              })}
            </div>

            {/* The price quoted depends on who is reading it, so say which one. */}
            {!subscribed && (
              <p className="mx-auto mt-6 max-w-xl text-center text-xs leading-relaxed text-ink-500">
                দামগুলো ক্যাশ অন ডেলিভারির — প্রতি বেলায় {taka(COD_MEAL_SURCHARGE)} যোগ করা আছে। সাবস্ক্রাইব করলে মেনুর
                মূল দামে, ওয়ালেট থেকে কাটা হবে।
              </p>
            )}

            {error ? (
              <div className="mx-auto mt-10 max-w-md rounded-2xl border border-ink-200 bg-ink-50 p-10 text-center">
                <AlertCircle className="mx-auto size-10 text-brand-500" />
                <p className="mt-4 font-semibold text-ink-800">{error}</p>
                <button
                  onClick={() => activePackage && loadMenu(activePackage)}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  <RefreshCw size={15} />
                  আবার চেষ্টা করুন
                </button>
              </div>
            ) : (
              <div className={menuLoading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
                {/* Today / tomorrow spotlight */}
                <div className="mt-10 grid gap-5 md:grid-cols-2">
                  <SpotlightCard
                    title="আজকের খাবার"
                    day={today}
                    row={rows.find((r) => r.day === today)}
                    pay={pay}
                    highlight
                  />
                  <SpotlightCard
                    title="আগামীকালের খাবার"
                    day={tomorrow}
                    row={rows.find((r) => r.day === tomorrow)}
                    pay={pay}
                  />
                </div>

                {/* Full week — table on desktop */}
                <div className="mt-8 hidden overflow-hidden rounded-2xl border border-ink-200 shadow-card lg:block">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-ink-900 text-white">
                      <tr>
                        <th scope="col" className="px-5 py-3.5 font-semibold">দিন</th>
                        {SLOTS.map((slot) => (
                          <th key={slot.key} scope="col" className="px-5 py-3.5 font-semibold">
                            {slot.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100 bg-white">
                      {rows.map((row) => {
                        const isToday = row.day === today;
                        return (
                          <tr key={row.day} className={isToday ? 'bg-brand-50/70' : 'hover:bg-ink-50'}>
                            <th scope="row" className="px-5 py-4 text-left font-semibold whitespace-nowrap text-ink-900">
                              {row.day}
                              {isToday && (
                                <span className="ml-2 rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                                  আজ
                                </span>
                              )}
                            </th>
                            {SLOTS.map((slot) => {
                              const meal = mealOf(row, slot, pay);
                              return (
                                <td key={slot.key} className="px-5 py-4 align-top">
                                  <span className={meal.available ? 'text-ink-700' : 'text-ink-400 italic'}>
                                    {meal.name}
                                  </span>
                                  {meal.available && (
                                    <span className="mt-1 block text-xs font-semibold text-brand-700">
                                      {taka(meal.price)}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Full week — day picker on mobile/tablet. Showing one day at a
                    time beats stacking seven cards the user has to scroll past. */}
                <div className="mt-8 lg:hidden">
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {rows.map((row) => {
                      const selected = row.day === mobileDay;
                      return (
                        <button
                          key={row.day}
                          onClick={() => setOpenDay(row.day)}
                          aria-pressed={selected}
                          className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                            selected
                              ? 'bg-brand-600 text-white'
                              : 'border border-ink-200 bg-white text-ink-600'
                          }`}
                        >
                          {row.day}
                          {row.day === today && (
                            <span className={`ml-1.5 text-[11px] ${selected ? 'text-white/80' : 'text-brand-600'}`}>
                              • আজ
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {mobileRow && (
                    <div className="mt-4 divide-y divide-ink-100 rounded-2xl border border-ink-200 bg-white px-5 shadow-card">
                      {SLOTS.map((slot) => (
                        <MealRow key={slot.key} row={mobileRow} slot={slot} pay={pay} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className={`mt-10 text-center ${compact ? 'hidden' : ''}`}>
              <Link
                href="/order"
                className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700"
              >
                <UtensilsCrossed size={17} />
                {activePackage ? `${activePackage.title} থেকে অর্ডার করুন` : 'অর্ডার করুন'}
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
