'use client';

/**
 * Everything the assistant reads and writes, through the same `/api/*` client
 * the order form uses. No endpoint was added for this feature.
 *
 * The division of labour is the important part: this file works out what to
 * *propose*, and `POST /api/orders` decides what anything *costs*. The payload
 * below carries the date, the meal, the zone and the package and nothing else
 * — the server looks the dish and its price up in the weekly menu and the
 * delivery charge up in the zone, so a mistake in this file can show the
 * customer a wrong review card but cannot sell a meal at the wrong price.
 */

import { isClosedFriday, zoneLabel } from '@/lib/format';
import { BOX_DEPOSIT, joiningFoodTotal, joiningMinimum, mealPrice } from '@/lib/rules';
import {
  menuAPI,
  orderAPI,
  packageAPI,
  subscriptionAPI,
  transactionAPI,
  zoneAPI,
} from '@/lib/api';
import type { SessionUser } from '@/lib/useSession';
import { MAX_DAYS, MEALS, type MealKey } from './config';

/** One weekly-menu row, as much of it as this feature touches. */
export interface MenuRow {
  day: string;
  morning?: string;
  lunch?: string;
  dinner?: string;
  morningPrice?: number;
  lunchPrice?: number;
  dinnerPrice?: number;
}

export interface Account {
  subscribed: boolean;
  /** Which package's menu applies — the subscriber's own, or the cheapest. */
  packageSlug: string;
  packageLabel: string;
  walletAvailable: number;
  address: string;
  zoneId: string;
  /** What one delivery costs in that zone; 0 for a subscriber. */
  deliveryPerMeal: number;
  /** Bengali names of the active delivery zones, for "where do you deliver". */
  zoneNames: string[];
  menu: MenuRow[];
  /** ISO date -> reason, for admin-blocked days. */
  blocked: Map<string, string>;
  /** `${iso}|${meal}` for meals already ordered and not cancelled. */
  taken: Set<string>;
  /**
   * Orders still on their way — not yet delivered, not cancelled.
   *
   * Counted apart from `taken`, which exists to stop a meal being ordered
   * twice and so includes meals already eaten. "কতগুলো অর্ডার চলছে" asks
   * about the ones still running, and answering it with every order the
   * account ever placed would be a number that only ever grows.
   */
  activeOrders: number;
  /** What this account has ordered, in money. See `loadAccount`. */
  spend: Spend;
}

/**
 * "কত টাকার অর্ডার করেছি" — three different numbers, kept apart.
 *
 * `placed` is every order that was not cancelled, which is what the customer
 * means by "how much have I ordered". `delivered` is the part that has
 * actually been handed over and charged — the same definition the admin
 * revenue figures use (food + delivery charge over delivered orders, see
 * CLAUDE.md). A cancelled order cost nothing, so it is counted separately
 * rather than folded into either.
 */
export interface Spend {
  placedTotal: number;
  placedCount: number;
  deliveredTotal: number;
  deliveredCount: number;
  cancelledCount: number;
}

/** Same fallback the order form uses when the zone list cannot be read. */
const DEFAULT_DELIVERY_CHARGE = 15;

/** JS getDay() is Sunday-first; mirrors WEEKDAY_BY_INDEX in src/lib/format.ts. */
const WEEKDAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

/* ---------------------------------------------------------------------- */
/* Dates                                                                  */
/* ---------------------------------------------------------------------- */

/**
 * A calendar date, as the whole app handles them: 'YYYY-MM-DD' built from and
 * read back as *local* parts.
 *
 * The server stores a delivery date as midnight UTC and reads its weekday with
 * getUTCDay(), which is the same calendar day this produces — so the dish shown
 * on the review card is the dish the server will price.
 */
export function toISO(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function weekdayOf(iso: string): string {
  return WEEKDAYS[fromISO(iso).getDay()];
}

/** The next date on or after today whose weekday is `dow` (JS getDay()). */
export function nextWeekday(dow: number): string {
  const today = new Date();
  const ahead = (dow - today.getDay() + 7) % 7;
  return toISO(addDays(today, ahead));
}

export function todayISO(): string {
  return toISO(new Date());
}

/* ---------------------------------------------------------------------- */
/* Loading the account                                                    */
/* ---------------------------------------------------------------------- */

/**
 * One round of reads, mirroring the order form's four loaders.
 *
 * Every call is wrapped on its own: a failed zone list or order history should
 * leave the assistant usable rather than dead, because the server re-checks
 * all of it at submit anyway.
 */
export async function loadAccount(user: SessionUser): Promise<Account> {
  let subscribed = false;
  let packageSlug = '';
  let walletAvailable = Number(user.walletBalance ?? 0);

  try {
    const res = await subscriptionAPI.getMySubscriptions();
    if (res.success) {
      const active = (res.data ?? []).find((s: { status: string }) => s.status === 'active');
      subscribed = Boolean(active);
      if (active?.package) packageSlug = active.package;
      walletAvailable = res.walletAvailable ?? res.walletBalance ?? walletAvailable;
    }
  } catch {
    /* treated as "no subscription" */
  }

  let packageLabel = '';
  try {
    const res = await packageAPI.getAllPackages();
    if (res.success) {
      const list = (res.data ?? []).filter(
        (p: { isActive?: boolean }) => p.isActive !== false
      ) as { name: string; title?: string }[];
      // A subscriber is locked to their own package; everyone else gets the
      // cheapest, because /api/packages sorts by price. Same rule as the form.
      if (!packageSlug) packageSlug = list[0]?.name ?? 'basic';
      packageLabel = list.find((p) => p.name === packageSlug)?.title ?? packageSlug;
    }
  } catch {
    if (!packageSlug) packageSlug = 'basic';
  }

  let menu: MenuRow[] = [];
  try {
    const res = await menuAPI.getMenuByPackage(packageSlug);
    if (res.success) menu = res.data ?? [];
  } catch {
    /* an empty menu is reported to the customer as "menu load failed" */
  }

  const zoneId = typeof user.zone === 'string' ? user.zone : '';
  let deliveryPerMeal = DEFAULT_DELIVERY_CHARGE;
  let zoneNames: string[] = [];
  try {
    const res = await zoneAPI.getAllZones();
    if (res.success) {
      const zones = (res.data ?? []) as {
        _id: string;
        name?: string;
        nameBn?: string | null;
        deliveryCharge?: number;
        isActive?: boolean;
      }[];
      deliveryPerMeal =
        zones.find((z) => z._id === zoneId)?.deliveryCharge ?? DEFAULT_DELIVERY_CHARGE;
      // Never `name` — that is the lowercase English slug (see CLAUDE.md).
      zoneNames = zones.filter((z) => z.isActive !== false).map((z) => zoneLabel(z));
    }
  } catch {
    /* falls back to the form's own default */
  }

  const blocked = new Map<string, string>();
  try {
    const res = await orderAPI.getBlockedDates();
    if (res.success) {
      for (const row of res.data ?? []) {
        // Stored as midnight UTC, so read the calendar day in UTC.
        blocked.set(new Date(row.date).toISOString().slice(0, 10), row.reason ?? '');
      }
    }
  } catch {
    /* the server refuses a blocked date at submit anyway */
  }

  const taken = new Set<string>();
  let activeOrders = 0;
  const spend: Spend = {
    placedTotal: 0,
    placedCount: 0,
    deliveredTotal: 0,
    deliveredCount: 0,
    cancelledCount: 0,
  };
  // Order.status, from src/server/models/Order.ts — everything before the food
  // is handed over.
  const RUNNING = ['pending', 'confirmed', 'preparing', 'out_for_delivery'];
  try {
    const res = await orderAPI.getMyOrders();
    if (res.success) {
      for (const order of res.data ?? []) {
        /*
         * Money first, and over every order including guest meals: the
         * customer paid for those too. `taken` below is a different job — it
         * stops a meal being ordered twice — so it skips guest meals, which
         * sit alongside a normal order rather than replacing it.
         */
        const amount = Number(order.totalAmount ?? 0) + Number(order.deliveryCharge ?? 0);
        if (order.status === 'cancelled') {
          spend.cancelledCount += 1;
        } else {
          spend.placedTotal += amount;
          spend.placedCount += 1;
          if (order.status === 'delivered') {
            spend.deliveredTotal += amount;
            spend.deliveredCount += 1;
          }
        }

        if (order.status === 'cancelled') continue;
        if (order.orderType === 'guest' || order.package === 'Guest') continue;
        const iso = new Date(order.deliveryDate).toISOString().slice(0, 10);
        taken.add(`${iso}|${order.deliveryTime}`);
        if (RUNNING.includes(order.status)) activeOrders += 1;
      }
    }
  } catch {
    /* the server refuses a duplicate at submit anyway */
  }

  return {
    subscribed,
    packageSlug,
    packageLabel,
    walletAvailable,
    address: typeof user.address === 'string' ? user.address : '',
    zoneId,
    deliveryPerMeal: subscribed ? 0 : deliveryPerMeal,
    zoneNames,
    menu,
    blocked,
    taken,
    activeOrders,
    spend,
  };
}

/* ---------------------------------------------------------------------- */
/* Building a plan                                                        */
/* ---------------------------------------------------------------------- */

export interface PlanLine {
  date: string;
  dayName: string;
  meal: MealKey;
  dish: string;
  /** Food price as the customer will pay it; the server recomputes this. */
  price: number;
  delivery: number;
}

export interface Plan {
  lines: PlanLine[];
  /** Plain sentences explaining every day or meal that was left out. */
  skipped: string[];
  foodTotal: number;
  deliveryTotal: number;
  total: number;
  pay: 'wallet' | 'cash';
}

function dishOf(account: Account, dayName: string, meal: MealKey) {
  const row = account.menu.find((m) => m.day === dayName);
  const name = row?.[meal];
  const price = row?.[`${meal}Price` as const] ?? 0;
  // The same test both UIs use: a dish with no name is not on the menu that
  // day, and one with no price is not for sale yet.
  if (!name || price <= 0) return null;
  return { name, price };
}

const mealLabel = (meal: MealKey) => MEALS.find((m) => m.key === meal)?.full ?? meal;

/**
 * Whether the cut-off has passed, asked of the server.
 *
 * `checkDeliveryDeadline` in src/server/deadlines.ts only constrains today and
 * tomorrow's morning meal and returns "within deadline" for everything later,
 * so only those dates are worth a request — at most six instead of one per
 * meal across a whole week. The server checks every order at submit regardless;
 * this is only so the review card does not offer something that will fail.
 */
async function deadlineBlocked(iso: string, meal: MealKey): Promise<string | null> {
  const days = Math.round((fromISO(iso).getTime() - fromISO(todayISO()).getTime()) / 86400000);
  if (days > 1) return null;

  try {
    const res = await orderAPI.checkDeadline(iso, meal);
    if (res.success && res.data && res.data.isWithinDeadline === false) {
      return res.data.message || `${mealLabel(meal)} অর্ডারের সময় পার হয়ে গেছে`;
    }
  } catch {
    // Unreachable deadline check: let it through and let the order route rule
    // on it, rather than refusing a meal that may well be orderable.
  }
  return null;
}

/**
 * Turns "3 days of dinner from tomorrow" into priced lines.
 *
 * Days the kitchen is shut do not consume one of the requested days — someone
 * who asks for three days of food means three days of food, so the search
 * walks forward past a closed Friday or a blocked date until it has them, up
 * to a week beyond the start.
 */
export async function buildPlan(
  account: Account,
  startISO: string,
  dayCount: number,
  meals: MealKey[]
): Promise<Plan> {
  const pay: Plan['pay'] = account.subscribed ? 'wallet' : 'cash';
  const lines: PlanLine[] = [];
  const skipped: string[] = [];

  let cursor = fromISO(startISO);
  let filled = 0;
  const limit = Math.min(dayCount, MAX_DAYS);

  for (let step = 0; step < limit + MAX_DAYS && filled < limit; step++) {
    const iso = toISO(cursor);
    const date = cursor;
    cursor = addDays(cursor, 1);

    if (isClosedFriday(date)) {
      skipped.push(`${iso} — মাসের 2য় বা শেষ শুক্রবার, রান্নাঘর বন্ধ`);
      continue;
    }
    const blockedReason = account.blocked.get(iso);
    if (blockedReason !== undefined) {
      skipped.push(`${iso} — ${blockedReason || 'ডেলিভারি বন্ধ'}`);
      continue;
    }

    const dayName = weekdayOf(iso);
    const dayLines: PlanLine[] = [];

    for (const meal of meals) {
      if (account.taken.has(`${iso}|${meal}`)) {
        skipped.push(`${iso} ${mealLabel(meal)} — আগেই অর্ডার করা আছে`);
        continue;
      }

      const dish = dishOf(account, dayName, meal);
      if (!dish) {
        skipped.push(`${iso} ${mealLabel(meal)} — মেনুতে নেই`);
        continue;
      }

      const late = await deadlineBlocked(iso, meal);
      if (late) {
        skipped.push(`${iso} ${mealLabel(meal)} — ${late}`);
        continue;
      }

      dayLines.push({
        date: iso,
        dayName,
        meal,
        dish: dish.name,
        price: mealPrice(dish.price, pay),
        delivery: account.deliveryPerMeal,
      });
    }

    // A day only counts once it actually yielded a meal, so an afternoon
    // request for "today's dinner" rolls on to tomorrow instead of silently
    // coming back one meal short.
    if (dayLines.length > 0) {
      lines.push(...dayLines);
      filled += 1;
    }
  }

  const foodTotal = lines.reduce((sum, l) => sum + l.price, 0);
  const deliveryTotal = lines.reduce((sum, l) => sum + l.delivery, 0);

  return { lines, skipped, foodTotal, deliveryTotal, total: foodTotal + deliveryTotal, pay };
}

/* ---------------------------------------------------------------------- */
/* Placing it                                                             */
/* ---------------------------------------------------------------------- */

/**
 * Places one order per line, one at a time.
 *
 * Sequential on purpose: each wallet order reserves its price, so the balance
 * the next one is checked against depends on the one before it. The payload
 * carries no price — see the note at the top of this file.
 */
export async function placePlan(
  account: Account,
  plan: Plan
): Promise<{ placed: number; failures: string[] }> {
  let placed = 0;
  const failures: string[] = [];

  for (const line of plan.lines) {
    try {
      const res = await orderAPI.createOrder({
        deliveryDate: line.date,
        deliveryTime: line.meal,
        address: account.address,
        zone: account.zoneId,
        packageSlug: account.packageSlug,
        paymentMethod: plan.pay,
        specialInstructions: '',
        package: account.packageLabel,
        orderType: 'self',
      });
      if (res.success) placed += 1;
      else failures.push(`${line.date} ${mealLabel(line.meal)} — ${res.message ?? 'হয়নি'}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'অর্ডার করা যায়নি';
      failures.push(`${line.date} ${mealLabel(line.meal)} — ${message}`);
    }
  }

  return { placed, failures };
}

/* ---------------------------------------------------------------------- */
/* Guest meals                                                            */
/* ---------------------------------------------------------------------- */

export interface GuestQuota {
  limit: number;
  remaining: number;
  daysLimit: number;
  daysRemaining: number;
}

/**
 * This month's guest-meal allowance, read from the server.
 *
 * The caps live in `src/server/limits.ts`, which a client component may not
 * import, so they are read through the endpoint rather than copied here —
 * copying them is how an answer ends up quoting a cap nobody enforces.
 */
export async function loadGuestQuota(): Promise<GuestQuota | null> {
  try {
    const res = await orderAPI.getGuestQuota();
    if (!res.success || !res.data) return null;
    const { limit, remaining, daysLimit, daysRemaining } = res.data;
    if (typeof limit !== 'number' || typeof daysLimit !== 'number') return null;
    return { limit, remaining, daysLimit, daysRemaining };
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------------- */
/* Subscriptions                                                          */
/* ---------------------------------------------------------------------- */

/** One package as the assistant talks about it, money already worked out. */
export interface PackageOption {
  slug: string;
  title: string;
  /** The subscription fee — the one non-refundable part. */
  fee: number;
  duration: number;
  features: string[];
  /** JOINING_FLOAT_DAYS of food at this package's own menu prices. */
  foodFloat: number;
  /** The refundable box deposit, carried along so the card can show it. */
  deposit: number;
  /** fee + foodFloat + deposit — what a first-time joiner must send. */
  joining: number;
  /** No weekly menu yet, so POST /api/subscriptions will refuse a joiner. */
  menuMissing: boolean;
}

export interface SubscriptionInfo {
  /** The customer's own subscription, or 'none' if they never asked. */
  status: 'none' | 'pending' | 'active' | 'expired' | 'cancelled';
  packageTitle: string;
  /** ISO date the running subscription ends, when there is one. */
  endDate: string | null;
  /**
   * True when no payment of theirs has ever been approved, which is exactly
   * the test `POST /api/subscriptions` makes before it demands the joining
   * minimum — so the form asks for the figure the server will enforce.
   */
  firstTime: boolean;
  /** Cheapest first, because /api/packages is sorted by price. */
  packages: PackageOption[];
}

/**
 * Everything the subscription answers need, in one round of reads.
 *
 * The money is computed with `joiningFoodTotal` / `joiningMinimum` from
 * src/lib/rules.ts — the same functions the route enforces with — rather than
 * with arithmetic of its own, so the figure quoted here and the figure the
 * server accepts cannot drift apart.
 *
 * Throws if the package list cannot be read: without it there is nothing
 * truthful to say about price, and inventing a number here would be worse
 * than an apology.
 */
export async function loadSubscriptionInfo(): Promise<SubscriptionInfo> {
  let status: SubscriptionInfo['status'] = 'none';
  let packageTitle = '';
  let endDate: string | null = null;

  try {
    const res = await subscriptionAPI.getMySubscriptions();
    if (res.success) {
      const rows = (res.data ?? []) as {
        status: SubscriptionInfo['status'];
        packageName?: string;
        package?: string;
        endDate?: string;
      }[];
      // A live one first, then one waiting for approval, then the newest of
      // whatever is left — /subscriptions/my sorts newest first.
      const mine =
        rows.find((r) => r.status === 'active') ??
        rows.find((r) => r.status === 'pending') ??
        rows[0];
      if (mine) {
        status = mine.status;
        packageTitle = mine.packageName || mine.package || '';
        endDate = mine.endDate ? String(mine.endDate).slice(0, 10) : null;
      }
    }
  } catch {
    /* treated as "never subscribed"; the route refuses a second request */
  }

  // Unreadable history is treated as a first-time joiner: the larger figure
  // is the one the server would demand of an account it cannot see a payment
  // for, and sending extra lands in the customer's own wallet either way.
  let firstTime = true;
  try {
    const res = await transactionAPI.getMyTransactions();
    if (res.success) {
      firstTime = !((res.data ?? []) as { status: string }[]).some((t) => t.status === 'approved');
    }
  } catch {
    /* keep firstTime true */
  }

  const res = await packageAPI.getAllPackages();
  const list = ((res.data ?? []) as {
    name: string;
    title?: string;
    price?: number;
    duration?: number;
    features?: string[];
    isActive?: boolean;
  }[]).filter((p) => p.isActive !== false);

  const packages = await Promise.all(
    list.map(async (pkg): Promise<PackageOption> => {
      let menu: MenuRow[] = [];
      try {
        const menuRes = await menuAPI.getMenuByPackage(pkg.name);
        if (menuRes.success) menu = menuRes.data ?? [];
      } catch {
        /* menuMissing below; the route refuses a joiner without a menu */
      }

      const fee = pkg.price ?? 0;
      const foodFloat = joiningFoodTotal(menu);

      return {
        slug: pkg.name,
        title: pkg.title || pkg.name,
        fee,
        duration: pkg.duration ?? 30,
        features: pkg.features ?? [],
        foodFloat,
        deposit: BOX_DEPOSIT,
        joining: joiningMinimum(fee, foodFloat),
        menuMissing: menu.length === 0,
      };
    })
  );

  return { status, packageTitle, endDate, firstTime, packages };
}

/**
 * Sends the subscription request — the same call the package cards make.
 *
 * `address` and `zone` go empty on purpose: the route fills both from the
 * saved profile, so the chat cannot deliver food to an address the customer
 * never confirmed. Everything about the money is re-derived and re-checked
 * server side; this only carries what the customer typed.
 */
export async function requestSubscription(input: {
  slug: string;
  amount: number;
  paymentMethod: string;
  transactionId: string;
  senderNumber: string;
}): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await subscriptionAPI.requestSubscription({
      package: input.slug,
      paymentMethod: input.paymentMethod,
      transactionId: input.transactionId.trim(),
      senderNumber: input.senderNumber.trim(),
      address: '',
      zone: '',
      amount: input.amount,
    });
    return { ok: Boolean(res.success), message: res.message ?? '' };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'রিকোয়েস্ট পাঠানো যায়নি',
    };
  }
}

/* ---------------------------------------------------------------------- */
/* Cancelling                                                             */
/* ---------------------------------------------------------------------- */

/** One of the customer's own orders, as the cancel list shows it. */
export interface MyOrder {
  id: string;
  date: string;
  dayName: string;
  meal: MealKey | null;
  dish: string;
  amount: number;
  pay: string;
  status: string;
}

/** Order.status values where the food has not been handed over yet. */
const RUNNING_STATUSES = ['pending', 'confirmed', 'preparing', 'out_for_delivery'];

/**
 * The orders a customer could still cancel, soonest first.
 *
 * The cut-off is **not** filtered here. `checkCancelDeadline` in
 * src/server/deadlines.ts is what decides, and the route runs it on submit —
 * guessing it in the browser would either hide an order that is still
 * cancellable or offer one that is not. So everything still running is listed
 * and the server's own refusal is shown if the time has passed.
 */
export async function loadCancellableOrders(): Promise<MyOrder[]> {
  const rows: MyOrder[] = [];
  try {
    const res = await orderAPI.getMyOrders();
    if (!res.success) return rows;

    for (const order of res.data ?? []) {
      if (!RUNNING_STATUSES.includes(order.status)) continue;
      const iso = new Date(order.deliveryDate).toISOString().slice(0, 10);
      const meal = (MEALS.find((m) => m.key === order.deliveryTime)?.key ?? null) as MealKey | null;
      rows.push({
        id: String(order._id),
        date: iso,
        dayName: weekdayOf(iso),
        meal,
        // The dish is stored on the order itself, so a later menu edit cannot
        // rewrite what the customer actually ordered.
        dish: order.items?.[0]?.name ?? '',
        amount: Number(order.totalAmount ?? 0) + Number(order.deliveryCharge ?? 0),
        pay: order.paymentMethod ?? '',
        status: order.status,
      });
    }
  } catch {
    /* an empty list is reported to the customer as "nothing to cancel" */
  }

  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Cancels one order through the same endpoint the dashboard uses.
 *
 * The money is the server's business: a reserved wallet order has its
 * reservation released, one charged under the old rule is refunded, and a
 * cash order never took anything. Nothing about that is decided here.
 */
export async function cancelOrder(id: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await orderAPI.cancelOrder(id, 'সহকারীর মাধ্যমে বাতিল');
    return { ok: Boolean(res.success), message: res.message ?? '' };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'অর্ডার বাতিল করা যায়নি',
    };
  }
}
