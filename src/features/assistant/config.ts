/**
 * The one switch for the whole feature. See README.md in this folder.
 *
 * On everywhere unless it is explicitly turned off. It was the other way round
 * while this was a trial the owner wanted to see privately; on 17 Nov 2026 the
 * feature went live, and a flag that has to be *remembered* on every host is a
 * flag that eventually ships a site without its assistant.
 *
 * The kill switch stays: `NEXT_PUBLIC_ASSISTANT=false` removes the whole chat
 * from the bundle, with no code change and no deploy of anything but the
 * variable. `NEXT_PUBLIC_*` is inlined at build time, so changing it needs a
 * rebuild — a restart or a reload is not enough.
 */
export const ASSISTANT_ENABLED = process.env.NEXT_PUBLIC_ASSISTANT !== 'false';

/** Meal keys, in the order a day runs. Mirrors MEAL_SLOTS in src/lib/format.ts. */
export const MEALS = [
  { key: 'morning', label: 'সকাল', full: 'সকালের খাবার' },
  { key: 'lunch', label: 'দুপুর', full: 'দুপুরের খাবার' },
  { key: 'dinner', label: 'রাত', full: 'রাতের খাবার' },
] as const;

export type MealKey = (typeof MEALS)[number]['key'];

/** The most days one chat order may cover, so a misparse cannot book a month. */
export const MAX_DAYS = 7;
