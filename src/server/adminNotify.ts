import { after } from 'next/server';
import { bn, taka } from '@/lib/format';
import { paymentLabel } from '@/lib/payment';
import { mailConfigured, sendMail } from '@/server/mail';

/**
 * "Someone just asked for something — go look at it" mail to the owner.
 *
 * Both subscriptions and wallet top-ups sit as `pending` until an admin
 * approves them, so until now the only way to find out one had arrived was to
 * open the panel and check. These are operational alerts, not customer mail.
 *
 * Nothing here is allowed to break the customer's request. A dead SMTP server
 * must not turn a successful top-up into an error, so every failure is
 * swallowed and logged — see `notifyAdmin`.
 */

/** Where the alerts go. Unset = the feature is simply off. */
export function notifyAddress(): string | undefined {
  return process.env.ADMIN_NOTIFY_EMAIL?.trim() || undefined;
}

/** Longest we are willing to hold the customer's request open for SMTP. */
const SEND_TIMEOUT_MS = 8000;

export async function notifyAdmin(mail: { subject: string; html: string; text: string }): Promise<void> {
  const to = notifyAddress();
  if (!to) return;

  if (!mailConfigured()) {
    console.warn('[adminNotify] EMAIL_HOST / EMAIL_USER / EMAIL_PASS not set — alert not sent:', mail.subject);
    return;
  }

  try {
    // The timeout keeps a hanging SMTP connection from holding the serverless
    // instance open until the platform kills it.
    await Promise.race([
      sendMail(to, mail.subject, mail.html, mail.text),
      new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP timed out')), SEND_TIMEOUT_MS)),
    ]);
  } catch (error) {
    console.error('[adminNotify] could not send:', mail.subject, error instanceof Error ? error.message : error);
  }
}

/**
 * Queue an alert to go out *after* the response has been sent.
 *
 * Gmail takes ~3.5s to accept a message, and awaiting that inside the handler
 * made subscribing feel broken — the button sat spinning for over four seconds
 * on what is otherwise a 300ms request. An unawaited promise is not the answer
 * either: a serverless instance is frozen the moment it responds, which kills
 * the send. `after()` is the framework's own answer — the platform keeps the
 * instance alive for the callback, so the customer gets their response
 * immediately and the mail still goes.
 *
 * Call it from inside a request; it never throws and never blocks.
 */
export function notifyAdminLater(mail: { subject: string; html: string; text: string }): void {
  after(() => notifyAdmin(mail));
}

function escapeHtml(s: string) {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );
}

type Row = [label: string, value: string | undefined];

/** Shared shell: heading, a label/value table, and a button to the admin page. */
function layout(opts: { heading: string; lead: string; rows: Row[]; actionLabel: string; actionUrl?: string }) {
  const rows = opts.rows.filter(([, value]) => value !== undefined && value !== '');

  const html = `
<div style="font-family:'Hind Siliguri',Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#292524">
  <p style="font-size:20px;font-weight:700;color:#ea580c;margin:0 0 4px">FoodBox</p>
  <p style="font-size:17px;font-weight:700;margin:0 0 4px">${escapeHtml(opts.heading)}</p>
  <p style="margin:0 0 16px;font-size:14px;color:#78716c">${escapeHtml(opts.lead)}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    ${rows
      .map(
        ([label, value]) => `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f5f5f4;color:#78716c;width:40%">${escapeHtml(label)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f5f5f4;font-weight:600">${escapeHtml(value!)}</td>
    </tr>`
      )
      .join('\n    ')}
  </table>
  ${
    opts.actionUrl
      ? `<p style="margin:20px 0 0"><a href="${escapeHtml(opts.actionUrl)}" style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:10px">${escapeHtml(opts.actionLabel)}</a></p>`
      : ''
  }
  <p style="margin:20px 0 0;font-size:12px;color:#a8a29e">এটি FoodBox অ্যাডমিন প্যানেলের স্বয়ংক্রিয় বার্তা।</p>
</div>`;

  const text = [
    `FoodBox — ${opts.heading}`,
    '',
    opts.lead,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    ...(opts.actionUrl ? ['', `${opts.actionLabel}: ${opts.actionUrl}`] : []),
  ].join('\n');

  return { html, text };
}

export interface SubscriptionAlert {
  userName: string;
  phoneNumber: string;
  email?: string;
  packageName: string;
  amount: number;
  paymentMethod: string;
  transactionId?: string;
  senderNumber?: string;
  address?: string;
  /** True when a previously rejected/expired customer asked again. */
  returning?: boolean;
  baseUrl?: string;
}

export function subscriptionAlert(sub: SubscriptionAlert) {
  const subject = `নতুন সাবস্ক্রিপশন: ${sub.userName} — ${sub.packageName} (${taka(sub.amount)})`;
  const { html, text } = layout({
    heading: 'নতুন সাবস্ক্রিপশন রিকোয়েস্ট',
    lead: sub.returning
      ? 'একজন পুরোনো গ্রাহক আবার সাবস্ক্রিপশন নিয়েছেন — অনুমোদনের অপেক্ষায়।'
      : 'একজন গ্রাহক সাবস্ক্রিপশন নিয়েছেন — অনুমোদনের অপেক্ষায়।',
    rows: [
      ['গ্রাহক', sub.userName],
      ['ফোন', bn(sub.phoneNumber)],
      ['ইমেইল', sub.email],
      ['প্যাকেজ', sub.packageName],
      ['টাকার পরিমাণ', taka(sub.amount)],
      ['পেমেন্ট মাধ্যম', paymentLabel(sub.paymentMethod)],
      ['ট্রানজেকশন আইডি', sub.transactionId],
      ['যে নাম্বার থেকে পাঠানো', sub.senderNumber ? bn(sub.senderNumber) : undefined],
      ['ঠিকানা', sub.address],
    ],
    actionLabel: 'পেন্ডিং সাবস্ক্রাইবার দেখুন',
    actionUrl: sub.baseUrl ? `${sub.baseUrl}/admin/dashboard/pending-subscribers` : undefined,
  });
  return { subject, html, text };
}

export interface RechargeAlert {
  userName: string;
  phoneNumber: string;
  amount: number;
  paymentMethod: string;
  transactionId: string;
  /** True when this is the customer's first top-up request. */
  first?: boolean;
  baseUrl?: string;
}

export function rechargeAlert(tx: RechargeAlert) {
  const subject = `ওয়ালেট রিচার্জ: ${tx.userName} — ${taka(tx.amount)}`;
  const { html, text } = layout({
    heading: 'নতুন রিচার্জ রিকোয়েস্ট',
    lead: tx.first
      ? 'একজন গ্রাহকের প্রথম রিচার্জ — অনুমোদন করলে ব্যালেন্স যোগ হবে।'
      : 'একজন গ্রাহক ওয়ালেট রিচার্জ করেছেন — অনুমোদন করলে ব্যালেন্স যোগ হবে।',
    rows: [
      ['গ্রাহক', tx.userName],
      ['ফোন', bn(tx.phoneNumber)],
      ['টাকার পরিমাণ', taka(tx.amount)],
      ['পেমেন্ট মাধ্যম', paymentLabel(tx.paymentMethod)],
      ['ট্রানজেকশন আইডি', tx.transactionId],
    ],
    actionLabel: 'পেন্ডিং ট্রানজেকশন দেখুন',
    actionUrl: tx.baseUrl ? `${tx.baseUrl}/admin/dashboard/pending-transactions` : undefined,
  });
  return { subject, html, text };
}

/**
 * Where the admin panel lives, for the button in the mail.
 *
 * Resolved per request so the link points at whatever host the customer
 * actually used — localhost in development, the real domain in production,
 * with no code change between them.
 *
 * `req.url` alone is not enough. Behind a reverse proxy the handler often sees
 * the internal address it was forwarded to (`http://localhost:3000`) rather
 * than the public one, and the protocol comes out as `http` even on an HTTPS
 * site, which would put a dead link in the owner's mail. The `x-forwarded-*`
 * headers are what the proxy sets to say where the request really came from;
 * Vercel and nginx both send them.
 *
 * `APP_URL` overrides everything — set it when the host does not forward those
 * headers, or to force links onto the custom domain even when someone reaches
 * the site through a preview URL.
 */
export function baseUrlFrom(req: Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  // A proxy chain can list several hosts; the first is the original client's.
  const forwardedHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || req.headers.get('host')?.trim();
  if (!host) return new URL(req.url).origin;

  const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  // Local development is the only place that is legitimately plain http.
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host);
  const protocol = forwardedProto || (isLocal ? 'http' : 'https');

  return `${protocol}://${host}`;
}
