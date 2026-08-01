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

/** "২ আগস্ট, ২০২৬" */
export function bengaliDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${bn(d.getDate())} ${BN_MONTHS[d.getMonth()]}, ${bn(d.getFullYear())}`;
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
