import { createHmac, randomInt, timingSafeEqual } from 'crypto';

/**
 * Forgot-password rules, in one place.
 *
 * Customers sign in with a phone number and email is optional, so there are
 * two paths:
 *   - the account has an email → a 6-digit code is mailed to it
 *   - it does not → the customer contacts support on WhatsApp, and an admin
 *     issues a temporary password from Settings
 *
 * The code is stored only as an HMAC (keyed with JWT_SECRET and bound to the
 * user id), so a database read does not reveal a usable code.
 */

export const CODE_TTL_MINUTES = 10;
/** A new code cannot be requested sooner than this. */
export const RESEND_AFTER_SECONDS = 60;
/** Wrong guesses allowed before the code is thrown away. */
export const MAX_ATTEMPTS = 5;
/** Matches the sign-up rule. */
export const MIN_PASSWORD_LENGTH = 6;

export function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function hashCode(code: string, userId: string): string {
  return createHmac('sha256', process.env.JWT_SECRET ?? '')
    .update(`${userId}:${code}`)
    .digest('hex');
}

export function codeMatches(code: string, userId: string, storedHash: string): boolean {
  const given = Buffer.from(hashCode(code, userId), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  return given.length === stored.length && timingSafeEqual(given, stored);
}

/** "ka•••••@gmail.com" — enough to recognise, not enough to harvest. */
export function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  const shown = name.slice(0, Math.min(2, name.length));
  return `${shown}${'•'.repeat(Math.max(name.length - shown.length, 3))}@${domain}`;
}

/** Temporary password an admin reads out — no 0/O or 1/l/I to confuse. */
export function tempPassword(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 8 }, () => alphabet[randomInt(0, alphabet.length)]).join('');
}

export function resetEmail(name: string, code: string) {
  const subject = `FoodBox পাসওয়ার্ড রিসেট কোড: ${code}`;
  const text = `প্রিয় ${name},\n\nআপনার FoodBox পাসওয়ার্ড রিসেট কোড: ${code}\n\nকোডটি ${CODE_TTL_MINUTES} মিনিট পর্যন্ত কাজ করবে। আপনি অনুরোধ না করে থাকলে এই ইমেইলটি উপেক্ষা করুন — আপনার পাসওয়ার্ড বদলাবে না।\n\n— FoodBox`;
  const html = `
<div style="font-family:'Hind Siliguri',Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#292524">
  <p style="font-size:20px;font-weight:700;color:#ea580c;margin:0 0 16px">FoodBox</p>
  <p style="margin:0 0 8px">প্রিয় ${escapeHtml(name)},</p>
  <p style="margin:0 0 16px">আপনার পাসওয়ার্ড রিসেট কোড:</p>
  <p style="font-size:32px;font-weight:700;letter-spacing:8px;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px;text-align:center;margin:0 0 16px">${code}</p>
  <p style="margin:0 0 8px;font-size:14px">কোডটি <b>${CODE_TTL_MINUTES} মিনিট</b> পর্যন্ত কাজ করবে। কাউকে এই কোড দেবেন না।</p>
  <p style="margin:0;font-size:13px;color:#78716c">আপনি অনুরোধ না করে থাকলে এই ইমেইলটি উপেক্ষা করুন — আপনার পাসওয়ার্ড বদলাবে না।</p>
</div>`;
  return { subject, text, html };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
