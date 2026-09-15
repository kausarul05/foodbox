/**
 * Display helpers for the Bengali customer site.
 *
 * Everything user-facing goes through here so numbers read as ৩,৫০০ rather than
 * 3,500 — mixing Latin digits into Bengali copy is the single most common way a
 * localised UI looks half-finished.
 */

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/** 1234 -> "১২৩৪". Leaves any non-digit character untouched. */
export function bn(value: string | number): string {
  return String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

/** 3500 -> "৳ ৩,৫০০" */
export function taka(amount: number | undefined | null): string {
  return `৳ ${bn((amount ?? 0).toLocaleString('en-US'))}`;
}

/**
 * How a zone is shown to a customer.
 *
 * `Zone.name` is a lowercase English slug (`mymensingh_sadar`) used as the
 * unique key; `nameBn` carries the Bengali label. Rendering `name` directly
 * puts a slug in the middle of Bengali copy, so every zone display goes
 * through here.
 */
export function zoneLabel(zone: { name?: string; nameBn?: string | null } | null | undefined): string {
  if (!zone) return '';
  return zone.nameBn || zone.name || '';
}

/**
 * Menu day order, Saturday-first — the Bangladeshi week.
 * Mirrors `MENU_DAYS` in src/server/models/WeeklyMenu.ts. It is duplicated
 * rather than imported because client components must not pull in server code.
 */
export const MENU_DAY_ORDER = [
  'শনিবার',
  'রবিবার',
  'সোমবার',
  'মঙ্গলবার',
  'বুধবার',
  'বৃহস্পতিবার',
  'শুক্রবার',
] as const;

/** JS getDay() is Sunday-first; this maps it onto the Bengali day names. */
const WEEKDAY_BY_INDEX = [
  'রবিবার',
  'সোমবার',
  'মঙ্গলবার',
  'বুধবার',
  'বৃহস্পতিবার',
  'শুক্রবার',
  'শনিবার',
];

export function bengaliWeekday(date: Date = new Date()): string {
  return WEEKDAY_BY_INDEX[date.getDay()];
}

export function todayAndTomorrow(): { today: string; tomorrow: string } {
  const now = new Date();
  const next = new Date(now);
  next.setDate(now.getDate() + 1);
  return { today: bengaliWeekday(now), tomorrow: bengaliWeekday(next) };
}

/** Sorts menu rows into Saturday-first order regardless of API ordering. */
export function sortByMenuDay<T extends { day: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => MENU_DAY_ORDER.indexOf(a.day as never) - MENU_DAY_ORDER.indexOf(b.day as never)
  );
}

const BN_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

/**
 * Splits a value into the day/month/year a Bangladeshi reader expects.
 *
 * Never use `toLocaleDateString('bn-BD')` for this. When the browser has no
 * bn-BD locale data it silently falls back to the system locale, which on most
 * machines prints month/day/year — so ৩রা ডিসেম্বর renders as ১২/৩, and dates
 * appear scrambled for some visitors and not others.
 *
 * Delivery dates are stored as midnight UTC, i.e. a calendar date rather than
 * an instant. Reading those with local getters shifts the day by one for any
 * viewer west of UTC, so midnight-UTC values are read with UTC getters and
 * everything else (createdAt and friends, which are real instants) with local
 * ones.
 */
function parts(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return null;

  const isCalendarDate =
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0;

  return isCalendarDate
    ? { day: d.getUTCDate(), month: d.getUTCMonth(), year: d.getUTCFullYear() }
    : { day: d.getDate(), month: d.getMonth(), year: d.getFullYear() };
}

/** "২ আগস্ট, ২০২৬" */
export function bengaliDate(date: Date | string): string {
  const p = parts(date);
  if (!p) return '—';
  return `${bn(p.day)} ${BN_MONTHS[p.month]}, ${bn(p.year)}`;
}

/** "০২/০৮/২০২৬" — always day/month/year, zero-padded. */
export function bengaliDateNumeric(date: Date | string): string {
  const p = parts(date);
  if (!p) return '—';
  const dd = String(p.day).padStart(2, '0');
  const mm = String(p.month + 1).padStart(2, '0');
  return `${bn(dd)}/${bn(mm)}/${bn(p.year)}`;
}

/** "২ আগস্ট, ২০২৬, ৮:৪১ PM" — for timestamps where the time matters. */
export function bengaliDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  const hours24 = d.getHours();
  const suffix = hours24 < 12 ? 'AM' : 'PM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${bengaliDate(d)}, ${bn(hours12)}:${bn(minutes)} ${suffix}`;
}

/**
 * The kitchen closes on the 2nd and last Friday of every month.
 *
 * Mirror of `isClosedFriday` in src/server/deadlines.ts, duplicated because
 * client code must not import server code. The server still rejects these
 * dates — this copy only lets the order form grey them out instead of letting
 * someone fill in a whole week and fail at submit.
 */
export function isClosedFriday(date: Date): boolean {
  if (date.getDay() !== 5) return false;

  const year = date.getFullYear();
  const month = date.getMonth();
  const fridays: number[] = [];

  for (let day = 1; day <= 31; day++) {
    const d = new Date(year, month, day);
    if (d.getMonth() !== month) break;
    if (d.getDay() === 5) fridays.push(d.getDate());
  }

  return date.getDate() === fridays[1] || date.getDate() === fridays[fridays.length - 1];
}

/**
 * The three delivery windows and their ordering cut-offs.
 * Copy of the rules in src/server/deadlines.ts — shown to the user, never used
 * to decide anything. The server remains the only authority on cut-offs.
 */
export const MEAL_SLOTS = [
  { key: 'morning', label: 'সকালের খাবার', window: 'সকাল ৭টা – ৯টা', cutoff: 'আগের দিন রাত ১০টা' },
  { key: 'lunch', label: 'দুপুরের খাবার', window: 'দুপুর ১২টা – ২টা', cutoff: 'একই দিন সকাল ৮:৩০' },
  { key: 'dinner', label: 'রাতের খাবার', window: 'রাত ৮টা – ১০টা', cutoff: 'একই দিন দুপুর ১টা' },
] as const;
