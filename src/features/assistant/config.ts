/**
 * The one switch for the whole feature. See README.md in this folder.
 *
 * Off unless explicitly turned on, so a deploy that does not set the variable
 * ships the site exactly as it was — the owner can try this locally without it
 * appearing for customers. `NEXT_PUBLIC_*` is inlined at build time, so the dev
 * server has to be restarted after changing it, not just reloaded.
 */
export const ASSISTANT_ENABLED = process.env.NEXT_PUBLIC_ASSISTANT === 'true';

/** Meal keys, in the order a day runs. Mirrors MEAL_SLOTS in src/lib/format.ts. */
export const MEALS = [
  { key: 'morning', label: 'সকাল', full: 'সকালের খাবার' },
  { key: 'lunch', label: 'দুপুর', full: 'দুপুরের খাবার' },
  { key: 'dinner', label: 'রাত', full: 'রাতের খাবার' },
] as const;

export type MealKey = (typeof MEALS)[number]['key'];

/** The most days one chat order may cover, so a misparse cannot book a month. */
export const MAX_DAYS = 7;
