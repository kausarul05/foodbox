import { depositOf, summariseDeposit } from './deposit';
import Admin from './models/Admin';
import BlockedDate from './models/BlockedDate';
import DepositEvent from './models/DepositEvent';
import Expense from './models/Expense';
import ManualOrder from './models/ManualOrder';
import Order from './models/Order';
import Package from './models/Package';
import Settings from './models/Settings';
import Subscription from './models/Subscription';
import Transaction from './models/Transaction';
import User from './models/User';
import WeeklyMenu from './models/WeeklyMenu';
import Zone from './models/Zone';
import { reservedByUser } from './wallet';

/**
 * The whole database as a set of flat, readable tables — one per collection.
 *
 * This is the shape both backups are built from: `excelBackup.ts` renders it as
 * an .xlsx the owner downloads, and `sheets.ts` pushes the same tables into a
 * Google Sheet that mirrors the database live. Defining the columns once is
 * what keeps the two from drifting apart, so a new column shows up in both.
 *
 * It is deliberately not a restore format. Nested documents are flattened, zone
 * ids are replaced with their Bengali names, and password hashes are left out
 * entirely — these tables end up in files that get mailed around and in a sheet
 * that gets shared, and a bcrypt hash is a credential. `scripts/backup-db.mjs`
 * is the machine backup: EJSON, every field, restorable as-is.
 *
 * Numbers stay Latin digits (1200, not ১২০০) on purpose. This is the one place
 * `src/lib/format.ts` must not be used: a Bengali numeral is text to a
 * spreadsheet, and text cannot be summed, sorted or charted — the whole reason
 * for choosing a spreadsheet over a PDF.
 */

/** Bangladesh is UTC+6 all year — no daylight saving to account for. */
export const BD_OFFSET_MS = 6 * 60 * 60 * 1000;

/**
 * A spreadsheet date cell is wall-clock time with no time zone, while Mongo
 * stores instants in UTC. Writing one straight out shows a Dhaka evening as
 * the same afternoon, so every date is shifted +6h first and the cell then
 * reads as Dhaka local time. It stays a real date, so sorting still works.
 */
export function at(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() + BD_OFFSET_MS);
}

/** Excel number formats. `fmt` also tells the Sheets renderer how to print. */
export const DATE = 'dd/mm/yyyy';
export const DATETIME = 'dd/mm/yyyy hh:mm AM/PM';
export const MONEY = '#,##0';

const ORDER_STATUS: Record<string, string> = {
  pending: 'পেন্ডিং',
  confirmed: 'কনফার্মড',
  preparing: 'রান্না হচ্ছে',
  out_for_delivery: 'ডেলিভারিতে',
  delivered: 'ডেলিভারি হয়েছে',
  cancelled: 'বাতিল',
  returned: 'ফেরত এসেছে',
};

const PAYMENT_METHOD: Record<string, string> = {
  bkash: 'বিকাশ',
  nagad: 'নগদ',
  rocket: 'রকেট',
  bank: 'ব্যাংক',
  cash: 'ক্যাশ',
  cod: 'ক্যাশ অন ডেলিভারি',
  wallet: 'ওয়ালেট',
  subscription: 'সাবস্ক্রিপশন',
};

const PAYMENT_STATUS: Record<string, string> = {
  pending: 'পেন্ডিং',
  paid: 'পরিশোধিত',
  failed: 'ব্যর্থ',
};

const MEAL: Record<string, string> = {
  morning: 'সকাল',
  lunch: 'দুপুর',
  dinner: 'রাত',
};

const SUBSCRIPTION_STATUS: Record<string, string> = {
  pending: 'পেন্ডিং',
  active: 'চালু',
  expired: 'শেষ',
  cancelled: 'বাতিল',
};

const TRANSACTION_STATUS: Record<string, string> = {
  pending: 'পেন্ডিং',
  approved: 'অনুমোদিত',
  rejected: 'বাতিল',
};

const DEPOSIT_STATUS: Record<string, string> = {
  none: 'নেই',
  active: 'হোল্ড আছে',
  deducted: 'কেটে নেওয়া',
  refunded: 'ফেরত দেওয়া',
};

const DEPOSIT_EVENT: Record<string, string> = {
  hold: 'হোল্ড (বক্স দেওয়া)',
  deduct: 'কেটে নেওয়া (বক্স নষ্ট/হারানো)',
  refund: 'হোল্ড ছেড়ে দেওয়া (বক্স ফেরত)',
};

const ADMIN_ROLE: Record<string, string> = {
  super_admin: 'সুপার অ্যাডমিন',
  manager: 'ম্যানেজার',
  support: 'সাপোর্ট',
};

const BOOL = (value: unknown) => (value ? 'হ্যাঁ' : 'না');

/** Looks a Bengali label up, falling back to the raw value so nothing vanishes. */
function label(map: Record<string, string>, value: unknown): string {
  const key = String(value ?? '');
  return map[key] ?? key;
}

export interface Column {
  header: string;
  /** Excel column width. Google Sheets sizes its own columns. */
  width: number;
  /** One of DATE / DATETIME / MONEY above; plain text when absent. */
  fmt?: string;
}

export interface Table {
  /** Sheet or tab name. */
  name: string;
  columns: Column[];
  /** Cells: a string, a number, or a Date already shifted by `at()`. */
  rows: unknown[][];
}

/** A column plus how to read it off one document. */
type Field<T> = Column & { value: (row: T) => unknown };

function table<T>(name: string, rows: T[], fields: Field<T>[]): Table {
  return {
    name,
    columns: fields.map(({ header, width, fmt }) => ({ header, width, fmt })),
    rows: rows.map((row) => fields.map((field) => field.value(row) ?? '')),
  };
}

export interface BackupData {
  takenAt: Date;
  /** Row count per table, for the summary and the log line. */
  counts: Record<string, number>;
  /** The summary table first, then one per collection. */
  tables: Table[];
}

export async function collectBackup(): Promise<BackupData> {
  const takenAt = new Date();

  // `.lean()` everywhere: these are read once and written to cells, so there is
  // no reason to hydrate thousands of Mongoose documents. Passwords and reset
  // codes are excluded by name — see the file comment.
  const [
    users,
    orders,
    subscriptions,
    transactions,
    depositEvents,
    manualOrders,
    expenses,
    menu,
    packages,
    zones,
    blockedDates,
    admins,
    settings,
    reserved,
  ] = await Promise.all([
    User.find().select('-password -resetCodeHash -resetCodeExpires -resetCodeSentAt -resetAttempts').lean(),
    Order.find().sort({ createdAt: -1 }).lean(),
    Subscription.find().sort({ createdAt: -1 }).lean(),
    Transaction.find().sort({ createdAt: -1 }).lean(),
    DepositEvent.find().sort({ createdAt: -1 }).lean(),
    ManualOrder.find().sort({ createdAt: -1 }).lean(),
    Expense.find().sort({ date: -1 }).lean(),
    WeeklyMenu.find().lean(),
    Package.find().lean(),
    Zone.find().lean(),
    BlockedDate.find().sort({ date: -1 }).lean(),
    Admin.find().select('-password').lean(),
    Settings.findOne().lean(),
    reservedByUser(),
  ]);

  /**
   * Order.zone and Subscription.zone hold the zone *id as a string*, and some
   * older rows hold a plain name instead. Both are looked up here and fall back
   * to the raw value, so a renamed or deleted zone still leaves something
   * readable in the cell rather than an empty column.
   */
  const zoneById = new Map(zones.map((zone) => [String(zone._id), zone.nameBn || zone.name || '']));
  const zoneName = (value: unknown): string => {
    const key = String(value ?? '');
    return zoneById.get(key) ?? key;
  };

  const subscriberIds = new Set(
    subscriptions.filter((s) => s.status === 'active').map((s) => String(s.userId))
  );

  // Wallet money is three figures, not one: `balance` is what is in the wallet,
  // `reserved` is held by orders placed but not yet delivered, and `available`
  // is what a new order may use (balance − reserved − box deposit). Storing
  // only the balance would make a reconstructed database over-credit everyone.
  const userRows = users.map((user) => {
    const held = reserved.get(String(user._id)) ?? { reserved: 0, count: 0 };
    const balance = user.walletBalance ?? 0;
    const deposit = summariseDeposit(user, balance, held.reserved);
    return { user, balance, reserved: held.reserved, reservedOrders: held.count, deposit };
  });

  const tables: Table[] = [
    table('কাস্টমার', userRows, [
      { header: 'আইডি', width: 26, value: (r) => String(r.user._id) },
      { header: 'নাম', width: 22, value: (r) => r.user.fullName },
      { header: 'ফোন', width: 15, value: (r) => r.user.phoneNumber },
      { header: 'হোয়াটসঅ্যাপ', width: 15, value: (r) => r.user.whatsappNumber || '' },
      { header: 'ইমেইল', width: 26, value: (r) => r.user.email || '' },
      { header: 'জোন', width: 18, value: (r) => zoneName(r.user.zone) },
      { header: 'ঠিকানা', width: 34, value: (r) => r.user.address },
      { header: 'ওয়ালেট ব্যালেন্স', width: 15, value: (r) => r.balance, fmt: MONEY },
      { header: 'রিজার্ভড', width: 12, value: (r) => r.reserved, fmt: MONEY },
      {
        header: 'ব্যবহারযোগ্য',
        width: 13,
        value: (r) => r.balance - r.reserved - depositOf(r.user).held,
        fmt: MONEY,
      },
      { header: 'রিজার্ভড অর্ডার', width: 13, value: (r) => r.reservedOrders },
      { header: 'ডিপোজিট', width: 14, value: (r) => label(DEPOSIT_STATUS, r.deposit.status) },
      { header: 'ডিপোজিট হোল্ড', width: 13, value: (r) => r.deposit.required, fmt: MONEY },
      { header: 'ডিপোজিট বাকি', width: 13, value: (r) => r.deposit.due, fmt: MONEY },
      { header: 'সাবস্ক্রিপশন', width: 13, value: (r) => BOOL(subscriberIds.has(String(r.user._id))) },
      { header: 'সক্রিয়', width: 9, value: (r) => BOOL(r.user.isActive !== false) },
      { header: 'রোল', width: 10, value: (r) => r.user.role || 'user' },
      { header: 'রেজিস্ট্রেশন', width: 20, value: (r) => at(r.user.createdAt), fmt: DATETIME },
    ]),

    // totalAmount is the food only; the delivery charge is a separate field and
    // revenue is the two added up (see "Business rules" in CLAUDE.md), so the
    // table carries all three rather than making the reader do the sum.
    table('অর্ডার', orders, [
      { header: 'অর্ডার আইডি', width: 14, value: (o) => o.orderId || '' },
      { header: 'ডাটাবেস আইডি', width: 26, value: (o) => String(o._id) },
      { header: 'কাস্টমার আইডি', width: 26, value: (o) => String(o.userId ?? '') },
      { header: 'নাম', width: 20, value: (o) => o.userName },
      { header: 'ফোন', width: 15, value: (o) => o.phoneNumber },
      { header: 'প্যাকেজ', width: 14, value: (o) => o.package },
      {
        header: 'আইটেম',
        width: 40,
        value: (o) =>
          (o.items ?? [])
            .map((item) => `${item.name} ×${item.quantity ?? 1} (${item.price ?? 0})`)
            .join(' | '),
      },
      { header: 'খাবারের দাম', width: 13, value: (o) => o.totalAmount ?? 0, fmt: MONEY },
      { header: 'ডেলিভারি চার্জ', width: 13, value: (o) => o.deliveryCharge ?? 0, fmt: MONEY },
      {
        header: 'সর্বমোট',
        width: 12,
        value: (o) => (o.totalAmount ?? 0) + (o.deliveryCharge ?? 0),
        fmt: MONEY,
      },
      { header: 'স্টেটাস', width: 15, value: (o) => label(ORDER_STATUS, o.status) },
      { header: 'পেমেন্ট মেথড', width: 18, value: (o) => label(PAYMENT_METHOD, o.paymentMethod) },
      { header: 'পেমেন্ট স্টেটাস', width: 13, value: (o) => label(PAYMENT_STATUS, o.paymentStatus) },
      {
        header: 'ওয়ালেট চার্জ',
        width: 13,
        // Missing means "placed before the charge-on-delivery rule" — it was paid
        // up front. Blank is the honest cell for that; হ্যাঁ/না would both lie.
        value: (o) => (o.walletCharged === undefined ? '' : BOOL(o.walletCharged)),
      },
      { header: 'অর্ডারের তারিখ', width: 20, value: (o) => at(o.orderDate), fmt: DATETIME },
      { header: 'ডেলিভারির তারিখ', width: 14, value: (o) => at(o.deliveryDate), fmt: DATE },
      { header: 'বেলা', width: 9, value: (o) => label(MEAL, o.deliveryTime) },
      { header: 'জোন', width: 18, value: (o) => zoneName(o.zone) },
      { header: 'ঠিকানা', width: 34, value: (o) => o.address },
      { header: 'ধরন', width: 10, value: (o) => (o.orderType === 'guest' ? 'গেস্ট' : 'নিজের') },
      { header: 'গেস্টের নাম', width: 18, value: (o) => o.guestName || '' },
      { header: 'গেস্টের ফোন', width: 15, value: (o) => o.guestPhone || '' },
      { header: 'বিশেষ নির্দেশ', width: 26, value: (o) => o.specialInstructions || '' },
      {
        header: 'বাতিল করেছে',
        width: 12,
        value: (o) =>
          o.cancelledBy === 'admin' ? 'অ্যাডমিন' : o.cancelledBy === 'user' ? 'কাস্টমার' : '',
      },
      { header: 'বাতিলের কারণ', width: 26, value: (o) => o.cancellationReason || '' },
      { header: 'তৈরি হয়েছে', width: 20, value: (o) => at(o.createdAt), fmt: DATETIME },
    ]),

    table('সাবস্ক্রিপশন', subscriptions, [
      { header: 'সাবস্ক্রিপশন আইডি', width: 16, value: (s) => s.subscriptionId || '' },
      { header: 'ডাটাবেস আইডি', width: 26, value: (s) => String(s._id) },
      { header: 'কাস্টমার আইডি', width: 26, value: (s) => String(s.userId ?? '') },
      { header: 'নাম', width: 20, value: (s) => s.userName },
      { header: 'ফোন', width: 15, value: (s) => s.phoneNumber },
      { header: 'ইমেইল', width: 24, value: (s) => s.email || '' },
      { header: 'প্যাকেজ', width: 18, value: (s) => s.packageName || s.package },
      { header: 'ফি', width: 10, value: (s) => s.amount ?? 0, fmt: MONEY },
      { header: 'শুরু', width: 14, value: (s) => at(s.startDate), fmt: DATE },
      { header: 'শেষ', width: 14, value: (s) => at(s.endDate), fmt: DATE },
      { header: 'স্টেটাস', width: 12, value: (s) => label(SUBSCRIPTION_STATUS, s.status) },
      { header: 'পেমেন্ট স্টেটাস', width: 13, value: (s) => label(PAYMENT_STATUS, s.paymentStatus) },
      { header: 'পেমেন্ট মেথড', width: 14, value: (s) => label(PAYMENT_METHOD, s.paymentMethod) },
      { header: 'ট্রানজেকশন আইডি', width: 20, value: (s) => s.transactionId || '' },
      { header: 'যে নাম্বার থেকে পাঠানো', width: 18, value: (s) => s.senderNumber || '' },
      { header: 'জোন', width: 18, value: (s) => zoneName(s.zone) },
      { header: 'ঠিকানা', width: 34, value: (s) => s.address },
      { header: 'অনুমোদনের সময়', width: 20, value: (s) => at(s.approvedAt), fmt: DATETIME },
      { header: 'বাতিলের কারণ', width: 24, value: (s) => s.cancellationReason || '' },
      { header: 'অনুরোধের সময়', width: 20, value: (s) => at(s.createdAt), fmt: DATETIME },
    ]),

    table('ওয়ালেট রিচার্জ', transactions, [
      { header: 'ডাটাবেস আইডি', width: 26, value: (t) => String(t._id) },
      { header: 'কাস্টমার আইডি', width: 26, value: (t) => String(t.userId ?? '') },
      { header: 'নাম', width: 20, value: (t) => t.userName },
      { header: 'পরিমাণ', width: 12, value: (t) => t.amount ?? 0, fmt: MONEY },
      { header: 'ট্রানজেকশন আইডি', width: 22, value: (t) => t.transactionId },
      { header: 'মাধ্যম', width: 12, value: (t) => label(PAYMENT_METHOD, t.paymentMethod) },
      { header: 'স্টেটাস', width: 12, value: (t) => label(TRANSACTION_STATUS, t.status) },
      { header: 'অনুমোদনের সময়', width: 20, value: (t) => at(t.approvedAt), fmt: DATETIME },
      { header: 'বাতিলের কারণ', width: 24, value: (t) => t.rejectionReason || '' },
      { header: 'জমা দেওয়ার সময়', width: 20, value: (t) => at(t.createdAt), fmt: DATETIME },
    ]),

    table('বক্স ডিপোজিট', depositEvents, [
      { header: 'ডাটাবেস আইডি', width: 26, value: (d) => String(d._id) },
      { header: 'কাস্টমার আইডি', width: 26, value: (d) => String(d.userId ?? '') },
      { header: 'নাম', width: 20, value: (d) => d.userName },
      { header: 'ফোন', width: 15, value: (d) => d.phoneNumber || '' },
      { header: 'ধরন', width: 30, value: (d) => label(DEPOSIT_EVENT, d.type) },
      { header: 'পরিমাণ', width: 12, value: (d) => d.amount ?? 0, fmt: MONEY },
      { header: 'কারণ', width: 30, value: (d) => d.reason || '' },
      { header: 'যে অ্যাডমিন', width: 20, value: (d) => d.byAdminName || '' },
      { header: 'সময়', width: 20, value: (d) => at(d.createdAt), fmt: DATETIME },
    ]),

    table('ম্যানুয়াল অর্ডার', manualOrders, [
      { header: 'অর্ডার আইডি', width: 14, value: (m) => m.orderId || '' },
      { header: 'ডাটাবেস আইডি', width: 26, value: (m) => String(m._id) },
      { header: 'কাস্টমারের নাম', width: 20, value: (m) => m.customerName },
      { header: 'ফোন', width: 15, value: (m) => m.phoneNumber },
      {
        header: 'আইটেম',
        width: 40,
        value: (m) =>
          (m.items ?? [])
            .map((item) => `${item.name} ×${item.quantity ?? 1} (${item.price ?? 0})`)
            .join(' | '),
      },
      { header: 'খাবারের দাম', width: 13, value: (m) => m.totalAmount ?? 0, fmt: MONEY },
      { header: 'ডেলিভারি চার্জ', width: 13, value: (m) => m.deliveryCharge ?? 0, fmt: MONEY },
      {
        header: 'সর্বমোট',
        width: 12,
        value: (m) => (m.totalAmount ?? 0) + (m.deliveryCharge ?? 0),
        fmt: MONEY,
      },
      { header: 'স্টেটাস', width: 15, value: (m) => label(ORDER_STATUS, m.status) },
      { header: 'পেমেন্ট মেথড', width: 14, value: (m) => label(PAYMENT_METHOD, m.paymentMethod) },
      { header: 'ডেলিভারির তারিখ', width: 14, value: (m) => at(m.deliveryDate), fmt: DATE },
      { header: 'বেলা', width: 9, value: (m) => label(MEAL, m.deliveryTime) },
      { header: 'জোন', width: 18, value: (m) => zoneName(m.zone) },
      { header: 'ঠিকানা', width: 34, value: (m) => m.address },
      { header: 'বিশেষ নির্দেশ', width: 24, value: (m) => m.specialInstructions || '' },
      { header: 'তৈরি হয়েছে', width: 20, value: (m) => at(m.createdAt), fmt: DATETIME },
    ]),

    table('খরচ', expenses, [
      { header: 'ডাটাবেস আইডি', width: 26, value: (e) => String(e._id) },
      { header: 'খাত', width: 18, value: (e) => e.categoryName || e.category },
      { header: 'পরিমাণ', width: 12, value: (e) => e.amount ?? 0, fmt: MONEY },
      { header: 'বিবরণ', width: 36, value: (e) => e.description || '' },
      { header: 'তারিখ', width: 14, value: (e) => at(e.date), fmt: DATE },
      { header: 'যোগ হয়েছে', width: 20, value: (e) => at(e.createdAt), fmt: DATETIME },
    ]),

    table('সাপ্তাহিক মেনু', menu, [
      { header: 'ডাটাবেস আইডি', width: 26, value: (m) => String(m._id) },
      { header: 'দিন', width: 14, value: (m) => m.day },
      { header: 'প্যাকেজ', width: 14, value: (m) => m.package },
      { header: 'সকালের খাবার', width: 30, value: (m) => m.morning || '' },
      { header: 'সকালের দাম', width: 12, value: (m) => m.morningPrice ?? 0, fmt: MONEY },
      { header: 'দুপুরের খাবার', width: 30, value: (m) => m.lunch || '' },
      { header: 'দুপুরের দাম', width: 12, value: (m) => m.lunchPrice ?? 0, fmt: MONEY },
      { header: 'রাতের খাবার', width: 30, value: (m) => m.dinner || '' },
      { header: 'রাতের দাম', width: 12, value: (m) => m.dinnerPrice ?? 0, fmt: MONEY },
      { header: 'সক্রিয়', width: 9, value: (m) => BOOL(m.isActive !== false) },
    ]),

    table('প্যাকেজ', packages, [
      { header: 'ডাটাবেস আইডি', width: 26, value: (p) => String(p._id) },
      { header: 'কী', width: 14, value: (p) => p.name },
      { header: 'নাম', width: 22, value: (p) => p.title },
      { header: 'দাম', width: 10, value: (p) => p.price ?? 0, fmt: MONEY },
      { header: 'আগের দাম', width: 12, value: (p) => p.originalPrice ?? 0, fmt: MONEY },
      { header: 'ছাড় (%)', width: 10, value: (p) => p.discount ?? 0 },
      { header: 'দিন', width: 8, value: (p) => p.duration ?? 0 },
      { header: 'ফিচার', width: 50, value: (p) => (p.features ?? []).join(' | ') },
      { header: 'সক্রিয়', width: 9, value: (p) => BOOL(p.isActive !== false) },
    ]),

    table('জোন', zones, [
      { header: 'ডাটাবেস আইডি', width: 26, value: (z) => String(z._id) },
      { header: 'কী (ইংরেজি)', width: 24, value: (z) => z.name },
      { header: 'নাম (বাংলা)', width: 22, value: (z) => z.nameBn || '' },
      { header: 'ডেলিভারি চার্জ', width: 13, value: (z) => z.deliveryCharge ?? 0, fmt: MONEY },
      { header: 'সক্রিয়', width: 9, value: (z) => BOOL(z.isActive !== false) },
      { header: 'কাস্টম', width: 9, value: (z) => BOOL(z.isCustom) },
      { header: 'তৈরি হয়েছে', width: 20, value: (z) => at(z.createdAt), fmt: DATETIME },
    ]),

    table('বন্ধের তারিখ', blockedDates, [
      { header: 'ডাটাবেস আইডি', width: 26, value: (b) => String(b._id) },
      { header: 'তারিখ', width: 14, value: (b) => at(b.date), fmt: DATE },
      { header: 'কারণ', width: 36, value: (b) => b.reason || '' },
      { header: 'সক্রিয়', width: 9, value: (b) => BOOL(b.isActive !== false) },
    ]),

    // Logins, not credentials: the password hash is excluded by the query above.
    table('অ্যাডমিন', admins, [
      { header: 'ডাটাবেস আইডি', width: 26, value: (a) => String(a._id) },
      { header: 'নাম', width: 22, value: (a) => a.fullName },
      { header: 'ইমেইল', width: 28, value: (a) => a.email },
      { header: 'রোল', width: 16, value: (a) => label(ADMIN_ROLE, a.role) },
      { header: 'পারমিশন', width: 40, value: (a) => (a.permissions ?? []).join(', ') },
      { header: 'শেষ লগইন', width: 20, value: (a) => at(a.lastLogin), fmt: DATETIME },
      { header: 'সক্রিয়', width: 9, value: (a) => BOOL(a.isActive !== false) },
    ]),

    // One document, so it reads better down the page than across it.
    table(
      'সেটিংস',
      Object.entries(settings ?? {}).filter(([key]) => key !== '_id' && key !== '__v'),
      [
        { header: 'সেটিং', width: 28, value: ([key]) => key },
        {
          header: 'মান',
          width: 60,
          value: ([, value]) =>
            Array.isArray(value)
              ? value.join(', ')
              : value instanceof Date
                ? at(value)
                : typeof value === 'boolean'
                  ? BOOL(value)
                  : String(value ?? ''),
        },
      ]
    ),
  ];

  const counts = Object.fromEntries(tables.map((t) => [t.name, t.rows.length]));

  const walletTotal = userRows.reduce((sum, r) => sum + r.balance, 0);
  const reservedTotal = userRows.reduce((sum, r) => sum + r.reserved, 0);
  const depositHeld = userRows.reduce((sum, r) => sum + r.deposit.frozen, 0);
  const depositDue = userRows.reduce((sum, r) => sum + r.deposit.due, 0);
  const pendingTopUps = transactions.filter((t) => t.status === 'pending').length;

  /**
   * The summary is a two-column table like the rest, so both renderers can
   * write it without a special case. Section rows are plain labels.
   */
  const summaryRows: unknown[][] = [
    ['সর্বশেষ আপডেট', at(takenAt)],
    ['', ''],
    ['— শীট ও সারি —', ''],
    ...Object.entries(counts).map(([name, count]) => [name, count]),
    ['', ''],
    ['— হিসাব (টাকা) —', ''],
    ['কাস্টমারদের মোট ওয়ালেট ব্যালেন্স', walletTotal],
    ['অর্ডারে রিজার্ভড (এখনো ডেলিভারি হয়নি)', reservedTotal],
    // A hold on an empty wallet freezes nothing and shows up as "due" instead,
    // so both halves are reported — one without the other reads as zero deposits.
    ['বক্স ডিপোজিট (ওয়ালেটে আটকে আছে)', depositHeld],
    ['বক্স ডিপোজিট বাকি (ওয়ালেট খালি)', depositDue],
    ['অনুমোদনের অপেক্ষায় রিচার্জ (সংখ্যা)', pendingTopUps],
    ['', ''],
    ['— এই ফাইল সম্পর্কে —', ''],
    ['প্রতিটি শীট ডাটাবেসের একটি কলেকশন।', ''],
    ['সংখ্যা ইংরেজি অঙ্কে — যাতে যোগ, সর্ট ও ফিল্টার কাজ করে।', ''],
    ['সময় ও তারিখ বাংলাদেশ সময় (UTC+6) অনুযায়ী।', ''],
    ['নিরাপত্তার জন্য পাসওয়ার্ড এখানে রাখা হয় না।', ''],
    ['হুবহু রিস্টোরের ব্যাকআপ আলাদা: node scripts/backup-db.mjs', ''],
    ['এতে কাস্টমারের ফোন ও ঠিকানা আছে — নিরাপদ জায়গায় রাখুন।', ''],
  ];

  tables.unshift({
    name: 'সারসংক্ষেপ',
    columns: [
      { header: 'হিসাব', width: 44 },
      { header: 'মান', width: 30 },
    ],
    rows: summaryRows,
  });

  return { takenAt, counts, tables };
}
