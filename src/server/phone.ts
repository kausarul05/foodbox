/**
 * Bangladeshi mobile numbers arrive as "01868703130", "+8801868703130",
 * "8801868703130", "01868-703130", "+880 1868 703130"… and the live database
 * already holds more than one of these shapes. Matching them as exact strings
 * meant typing "01…" could not find an account saved as "+8801…".
 *
 * New numbers are stored in the local form, `01XXXXXXXXX`. Lookups match every
 * shape, so older rows keep working without a migration.
 */

/** "+880 1868-703130" → "01868703130". Anything unrecognised comes back trimmed. */
export function normalizePhone(input: unknown): string {
  const raw = String(input ?? '').trim();
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('880')) digits = digits.slice(2); // 8801… → 01…
  if (digits.length === 10 && digits.startsWith('1')) digits = `0${digits}`; // 1868… → 01868…
  return /^01\d{9}$/.test(digits) ? digits : raw;
}

/** Every stored shape this number might have. */
export function phoneVariants(input: unknown): string[] {
  const local = normalizePhone(input);
  if (!/^01\d{9}$/.test(local)) return [local];
  return [local, `+88${local}`, `88${local}`];
}

/** Mongo filter for `phoneNumber` matching any stored shape. */
export function byPhone(input: unknown) {
  return { phoneNumber: { $in: phoneVariants(input) } };
}
