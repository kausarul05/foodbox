'use client';

/**
 * One answer per topic, and every one of them traceable to a rule that exists
 * in this codebase.
 *
 * Nothing here is generated or guessed: the deadlines come from `MEAL_SLOTS`,
 * the deposit from `BOX_DEPOSIT`, the top-up floor from `MIN_RECHARGE`, the
 * surcharge from `COD_MEAL_SURCHARGE`, the payment numbers from
 * `PAYMENT_CHANNELS`, and the prices from whatever the server just said. If a
 * rule changes in those files the answer changes with it; if a question has no
 * rule behind it, there is deliberately no answer here and the chat says so
 * rather than inventing one.
 *
 * Kept free of React so it can be read — and corrected — without running the
 * app, the same reason `parse.ts` is pure.
 */

import { MEAL_SLOTS, bengaliDate, taka } from '@/lib/format';
import { BOX_DEPOSIT, COD_MEAL_SURCHARGE, JOINING_FLOAT_DAYS, MIN_RECHARGE } from '@/lib/rules';
import { PAYMENT_CHANNELS } from '@/lib/payment';
import type { Topic } from './topics';
import { MAX_DAYS } from './config';
import type { Account, GuestQuota, SubscriptionInfo } from './data';

/** Support contact, as CLAUDE.md requires every surface to state it. */
const SUPPORT_PHONE = '01410906862';

export interface Chip {
  label: string;
  send: string;
}

export interface Answer {
  text: string;
  link?: { href: string; label: string };
  chips?: Chip[];
  /** Show the package cards under the answer. */
  packages?: boolean;
  /** Offer the subscribe buttons on those cards. */
  canSubscribe?: boolean;
}

export interface AnswerContext {
  account: Account | null;
  sub: SubscriptionInfo | null;
  /** Only loaded for the guest-meal question, which is the only one that needs it. */
  guest?: GuestQuota | null;
}

/** Topics that cannot be answered without the package / joining figures. */
export const TOPICS_NEEDING_PACKAGES: Topic[] = [
  'sub-overview',
  'sub-price',
  'sub-benefit',
  'sub-status',
  'sub-expiry',
  'sub-renew',
  'sub-cancel',
  'sub-update',
  'fee-refund',
];

const SUB_CHIPS: Chip[] = [
  { label: 'দাম কত', send: 'সাবস্ক্রিপশনের দাম কত' },
  { label: 'সাবস্ক্রাইব করতে চাই', send: 'সাবস্ক্রাইব করতে চাই' },
];

/** "সকালের খাবার — সকাল 7টা – 9টা" for each meal. */
const windowLines = () => MEAL_SLOTS.map((slot) => `${slot.label} — ${slot.window}`).join('\n');

/** "সকালের খাবার — আগের দিন রাত 10টা" for each meal. */
const cutoffLines = () => MEAL_SLOTS.map((slot) => `${slot.label} — ${slot.cutoff}`).join('\n');

/** How their own subscription stands, in one sentence. */
function statusLine(sub: SubscriptionInfo | null, account: Account | null): string {
  if (!sub || sub.status === 'none') return 'এখন আপনার কোনো সাবস্ক্রিপশন নেই।';
  const title = sub.packageTitle || account?.packageLabel || 'প্যাকেজ';
  if (sub.status === 'active') {
    return sub.endDate
      ? `আপনার ${title} চালু আছে, চলবে ${bengaliDate(sub.endDate)} পর্যন্ত।`
      : `আপনার ${title} চালু আছে।`;
  }
  if (sub.status === 'pending') return `আপনার ${title} রিকোয়েস্ট অ্যাডমিনের অনুমোদনের অপেক্ষায় আছে।`;
  if (sub.status === 'cancelled') return `আপনার ${title} বাতিল হয়ে গেছে।`;
  return `আপনার ${title} এর মেয়াদ শেষ হয়ে গেছে।`;
}

const hasLive = (sub: SubscriptionInfo | null) =>
  sub?.status === 'active' || sub?.status === 'pending';

/**
 * The answer to one topic, given what has been read from the server.
 *
 * Returns null only for the subscription topics that need figures we failed to
 * load — the caller then says so, instead of answering half a question.
 */
export function answerTopic(topic: Topic, ctx: AnswerContext): Answer | null {
  const { account, sub, guest } = ctx;
  const cheapest = sub?.packages[0] ?? null;

  switch (topic) {
    /* ------------------------------------------------------------------ */
    /* Subscriptions                                                      */
    /* ------------------------------------------------------------------ */

    case 'sub-overview':
      return {
        text: 'সাবস্ক্রিপশন নিলে তিনটা জিনিস পাবেন — ডেলিভারি ফ্রি, খাবারের দাম কম, আর টাকা ওয়ালেট থেকে কাটে বলে প্রতিবেলা আলাদা করে টাকা দিতে হয় না। নিচে প্যাকেজগুলো দেখে নিন।',
        packages: true,
        canSubscribe: !hasLive(sub),
      };

    case 'sub-price': {
      if (!cheapest) return null;
      return {
        text: sub?.firstTime
          ? `সবচেয়ে কমে ${cheapest.title} — ${cheapest.duration} দিনের ফি ${taka(cheapest.fee)}। প্রথমবার নিতে সর্বনিম্ন ${taka(cheapest.joining)} পাঠাতে হবে, কারণ এর সাথে ${JOINING_FLOAT_DAYS} দিনের খাবারের ${taka(cheapest.foodFloat)} আর বক্সের ${taka(cheapest.deposit)} ডিপোজিট থাকে — ওই ${taka(cheapest.joining - cheapest.fee)} আপনার ওয়ালেটেই থাকে, খরচ হয় না।`
          : `সবচেয়ে কমে ${cheapest.title} — ${cheapest.duration} দিনের ফি ${taka(cheapest.fee)}। আপনি আগে একবার টাকা জমা দিয়েছেন, তাই এখন শুধু ফি'টাই লাগবে।`,
        packages: true,
        canSubscribe: !hasLive(sub),
      };
    }

    case 'sub-update': {
      // There is no route that changes a subscription's package: POST
      // /api/subscriptions refuses a second request while one is live, and
      // nothing else writes `Subscription.package`. So the honest answer is
      // "not from here", not a status line.
      if (!hasLive(sub)) {
        return {
          text: `এখন তো আপনার চালু সাবস্ক্রিপশন নেই, তাই বদলানোর কিছু নেই — নতুন করে নিতে চাইলে এখান থেকেই নিতে পারবেন। ${statusLine(sub, account)}`,
          chips: SUB_CHIPS,
        };
      }
      return {
        text: `চালু সাবস্ক্রিপশনের প্যাকেজ নিজে থেকে বদলানোর ব্যবস্থা সাইটে নেই — একটা অ্যাকাউন্টে একটাই সাবস্ক্রিপশন থাকে, আর চালু থাকা অবস্থায় নতুন রিকোয়েস্টও নেওয়া হয় না। প্যাকেজ বদলাতে চাইলে ${SUPPORT_PHONE} নাম্বারে অ্যাডমিনকে বলুন। মনে রাখবেন, সাবস্ক্রিপশন ফি ফেরতযোগ্য নয় — নতুন প্যাকেজের ফি আবার দিতে হবে। মেয়াদ শেষ হলে অন্য প্যাকেজ নিতে কোনো বাধা নেই। ${statusLine(sub, account)}`,
        link: { href: '/dashboard/profile', label: 'আমার সাবস্ক্রিপশন' },
      };
    }

    case 'sub-cancel': {
      if (!hasLive(sub)) {
        return { text: `বাতিল করার মতো চালু কিছু নেই। ${statusLine(sub, account)}`, chips: SUB_CHIPS };
      }
      return {
        text: `সাবস্ক্রিপশন বাতিল করতে ${SUPPORT_PHONE} নাম্বারে অ্যাডমিনকে বলতে হবে — নিজে থেকে বাতিল করার অপশন সাইটে নেই, আর আমি এখান থেকে করি না। দুটো কথা আগে জেনে নিন: সাবস্ক্রিপশন ফি কোনো অবস্থাতেই ফেরত হয় না, আর ওয়ালেটে জমা থাকা টাকা ও বক্সের ${taka(BOX_DEPOSIT)} ডিপোজিটের হিসাব অ্যাডমিন করে দেবেন (বক্স ফেরত দিলে ডিপোজিটের হোল্ড ছেড়ে দেওয়া হয়)। শুধু কোনো একদিন খাবার লাগবে না হলে সাবস্ক্রিপশন বাতিলের দরকার নেই — ওই দিনের অর্ডারটা বাতিল করলেই হয়।`,
        link: { href: '/dashboard/orders', label: 'অর্ডারের তালিকা' },
      };
    }

    case 'sub-expiry': {
      if (sub?.status === 'active') {
        const left = sub.endDate
          ? Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / 86400000)
          : null;
        return {
          text:
            left !== null && left >= 0
              ? `${statusLine(sub, account)} আর ${left} দিন বাকি আছে।`
              : statusLine(sub, account),
          link: { href: '/dashboard/profile', label: 'আমার সাবস্ক্রিপশন' },
        };
      }
      if (sub?.status === 'pending') {
        const days = cheapest?.duration ?? 30;
        return {
          text: `${statusLine(sub, account)} অ্যাডমিন অনুমোদন দিলে সেদিন থেকে ${days} দিন চলবে।`,
        };
      }
      return {
        text: `${statusLine(sub, account)} প্যাকেজের মেয়াদ ${cheapest?.duration ?? 30} দিন — যেদিন অ্যাডমিন অনুমোদন দেন, সেদিন থেকে গোনা শুরু হয়।`,
        chips: SUB_CHIPS,
      };
    }

    case 'sub-renew':
      return {
        text: `মেয়াদ শেষ হলে আবার রিকোয়েস্ট পাঠালেই চলবে, আর তখন শুধু সাবস্ক্রিপশন ফি'টা লাগবে — প্রথমবারের মতো খাবারের টাকা আর বক্সের ডিপোজিট আবার দিতে হবে না, কারণ ওয়ালেট আর বক্স তো আপনার কাছেই থাকে। ${statusLine(sub, account)}`,
        chips: SUB_CHIPS,
      };

    case 'sub-how':
      return {
        text: `সাবস্ক্রাইব করার নিয়ম চারটা ধাপ — 1) প্যাকেজ বেছে নিন, 2) বিকাশ বা নগদে টাকা পাঠান, 3) ট্রানজেকশন আইডি জমা দিন, 4) অ্যাডমিন মিলিয়ে দেখে অনুমোদন দিলে সাবস্ক্রিপশন চালু হয়ে যায়। এরপর থেকে প্রতিদিনের খাবারের টাকা ওয়ালেট থেকেই কাটা হয়। চাইলে এখান থেকেই পুরোটা করতে পারেন।`,
        chips: SUB_CHIPS,
      };

    case 'sub-benefit':
      return {
        text: `সাবস্ক্রিপশনে চারটা সুবিধা — ডেলিভারি একেবারে ফ্রি, খাবারের দাম মেনুর দামেই পড়ে (ক্যাশ অন ডেলিভারিতে প্রতি বেলায় ${taka(COD_MEAL_SURCHARGE)} বেশি লাগে), টাকা ওয়ালেট থেকে কাটে ডেলিভারির পর, আর কোনো দিন না খেলে সময়ের আগে অর্ডার বাতিল করলে ওই দিনের টাকা কাটে না।`,
        packages: true,
        canSubscribe: !hasLive(sub),
      };

    case 'sub-status':
      return {
        text: statusLine(sub, account),
        chips: hasLive(sub) ? undefined : SUB_CHIPS,
        link: hasLive(sub) ? { href: '/dashboard/profile', label: 'আমার সাবস্ক্রিপশন' } : undefined,
      };

    case 'sub-pause':
      return {
        text: `এর জন্য সাবস্ক্রিপশন বন্ধ করার দরকার নেই — যেদিন খাবেন না, সেদিনের অর্ডারটা সময়ের আগে বাতিল করলেই ওই দিনের টাকা কাটবে না। আমাকে বললে আমিই বাতিল করে দিতে পারি। শেষ সময়:\n${cutoffLines()}`,
        chips: [{ label: 'অর্ডার বাতিল করব', send: 'অর্ডার বাতিল করব' }],
        link: { href: '/dashboard/orders', label: 'অর্ডারের তালিকা' },
      };

    /* ------------------------------------------------------------------ */
    /* Money                                                              */
    /* ------------------------------------------------------------------ */

    case 'deposit':
      return {
        text: `খাবারের বক্সের জন্য ${taka(BOX_DEPOSIT)} ডিপোজিট ওয়ালেট থেকে আটকে রাখা হয় — টাকাটা খরচ হয় না, শুধু ওই টাকাটা দিয়ে অর্ডার করা যায় না। বক্স ফেরত দিলে হোল্ড ছেড়ে দেওয়া হয়, আর বক্স হারালে বা ভেঙে গেলে ওখান থেকে কাটা হয়। সাবস্ক্রিপশন অনুমোদনের সময় এই হোল্ডটা বসে।`,
        link: { href: '/dashboard/wallet', label: 'ওয়ালেটের হিসাব' },
      };

    case 'fee-refund': {
      const fee = cheapest ? taka(cheapest.fee) : 'সাবস্ক্রিপশন ফি';
      return {
        text: `সাবস্ক্রিপশন ফি (${fee} থেকে শুরু) ফেরতযোগ্য নয় — বাতিল করলেও ফেরত হয় না, এটা সাইটেও লেখা আছে। কিন্তু প্রথমবারের বাকি টাকাটা ফেরতযোগ্য ধরনের: ${JOINING_FLOAT_DAYS} দিনের খাবারের টাকা আপনার ওয়ালেটেই জমা থাকে আর খাবার ডেলিভারি হলে তখন কাটা হয়, আর বক্সের ${taka(BOX_DEPOSIT)} ডিপোজিট বক্স ফেরত দিলে ছেড়ে দেওয়া হয়।`,
        link: { href: '/dashboard/wallet', label: 'ওয়ালেটের হিসাব' },
      };
    }

    case 'wallet-howto':
      return {
        text: `ওয়ালেট রিচার্জের নিয়ম: বিকাশ বা নগদে টাকা পাঠিয়ে ট্রানজেকশন আইডিটা জমা দিন, অ্যাডমিন মিলিয়ে দেখে অনুমোদন দিলে ব্যালান্সে যোগ হয়ে যাবে। সর্বনিম্ন ${taka(MIN_RECHARGE)}, তার বেশি যেকোনো অ্যামাউন্ট চলবে। রিচার্জ শুধু সাবস্ক্রাইবাররা করতে পারেন।`,
        link: { href: '/dashboard/wallet', label: 'রিচার্জ করুন' },
      };

    case 'payment-how': {
      const lines = PAYMENT_CHANNELS.filter((c) => c.number).map((c) => `${c.label} — ${c.number}`);
      return {
        text: `টাকা পাঠানোর নাম্বার (সেন্ড মানি):\n${lines.join('\n')}\nটাকা পাঠিয়ে ট্রানজেকশন আইডিটা জমা দিতে হয়, অ্যাডমিন মিলিয়ে দেখে অনুমোদন দেন। হ্যান্ড ক্যাশেও দেওয়া যায় — তখন প্রতিনিধির হাতে টাকা দিলে অ্যাডমিন অনুমোদন করেন, আইডি লাগে না। আর সাবস্ক্রিপশন ছাড়া অর্ডার করলে খাবারের দাম ডেলিভারির সময় ক্যাশে দিতে হয়।`,
      };
    }

    /* ------------------------------------------------------------------ */
    /* Orders and delivery                                                */
    /* ------------------------------------------------------------------ */

    case 'deadline':
      return {
        text: `প্রতি বেলার অর্ডারের শেষ সময়:\n${cutoffLines()}\nএই সময় পার হয়ে গেলে ওই বেলার অর্ডার আর নেওয়া যায় না, পরের দিনের জন্য নিতে হয়।`,
      };

    case 'delivery-time':
      return {
        text: `খাবার পৌঁছানোর সময়:\n${windowLines()}\nঅর্ডারের শেষ সময় আলাদা — জানতে চাইলে বলুন "অর্ডারের শেষ সময় কখন"।`,
      };

    case 'delivery-charge': {
      if (account?.subscribed) {
        return {
          text: 'আপনার সাবস্ক্রিপশন চালু আছে, তাই ডেলিভারি একেবারে ফ্রি — প্রতি বেলায় শুধু খাবারের দামটাই কাটে।',
        };
      }
      const charge = account?.deliveryPerMeal ?? 0;
      return {
        text:
          charge > 0
            ? `সাবস্ক্রিপশন ছাড়া অর্ডার করলে আপনার জোনে প্রতি বেলায় ডেলিভারি ${taka(charge)}, আর খাবারের দামও ক্যাশে প্রতি বেলায় ${taka(COD_MEAL_SURCHARGE)} বেশি পড়ে। সাবস্ক্রিপশন নিলে ডেলিভারি ফ্রি হয়ে যায়।`
            : `ডেলিভারি চার্জ জোন অনুযায়ী আলাদা — অর্ডারের সময় আপনার জোনের চার্জটা দেখিয়ে দেওয়া হয়। সাবস্ক্রিপশন থাকলে ডেলিভারি ফ্রি।`,
        chips: SUB_CHIPS,
      };
    }

    case 'closed-day':
      return {
        text: 'মাসের 2য় আর শেষ শুক্রবার রান্নাঘর বন্ধ থাকে, ওই দুই দিন ডেলিভারি হয় না। এছাড়া অ্যাডমিন বিশেষ কোনো দিন বন্ধ রাখলে সেটাও অর্ডার করার সময় জানিয়ে দেওয়া হয় — আমি কয়দিনের অর্ডার নিলে বন্ধের দিনগুলো বাদ দিয়ে পরের দিন ধরে হিসাব করি।',
      };

    case 'order-cancel':
      /*
       * A fallback only: the widget handles this topic itself, because
       * cancelling is something it does rather than something it explains.
       * Kept true in case it ever surfaces — the cut-offs are the same ones
       * `checkCancelDeadline` enforces in src/server/deadlines.ts.
       */
      return {
        text: `অর্ডার বাতিল করতে হলে বলুন "অর্ডার বাতিল করব" — আমি আপনার চলতি অর্ডারগুলো দেখাব, বেশে দিলে এখান থেকেই বাতিল করে দেব। সময়ের মধ্যে বাতিল করলে ওই দিনের টাকা কাটা হয় না। বাতিলের শেষ সময়:\n${cutoffLines()}`,
        chips: [{ label: 'অর্ডার বাতিল করব', send: 'অর্ডার বাতিল করব' }],
      };

    case 'guest-meal':
      /*
       * The caps are read from /api/orders/guest-quota, not written here —
       * they live in src/server/limits.ts, which a client file cannot import,
       * and a cap quoted from memory is a cap nobody enforces.
       */
      return {
        text: guest
          ? `মেহমানের জন্য বাড়তি খাবার গেস্ট মিল পেজ থেকে নিতে হয় — সাবস্ক্রিপশন লাগে না, দাম ক্যাশ অন ডেলিভারিতে দিতে হয়। মাসে সর্বোচ্চ ${guest.limit}টি গেস্ট খাবার, আর সেটা সর্বোচ্চ ${guest.daysLimit} দিনে। এই মাসে আপনার বাকি আছে ${guest.remaining}টি খাবার, ${guest.daysRemaining} দিন। আমি এখান থেকে গেস্ট মিল নিই না — ওই পেজ থেকেই নিতে হবে।`
          : 'মেহমানের জন্য বাড়তি খাবার গেস্ট মিল পেজ থেকে নিতে হয় — সাবস্ক্রিপশন লাগে না, দাম ক্যাশ অন ডেলিভারিতে দিতে হয়, আর মাসে একটা নির্দিষ্ট সংখ্যার বেশি নেওয়া যায় না (কত বাকি আছে ওই পেজেই দেখা যায়)। আমি এখান থেকে গেস্ট মিল নিই না।',
        link: { href: '/guest-meal', label: 'গেস্ট মিল পেজ' },
      };

    case 'location': {
      /*
       * ময়মনসিংহ সদর is the service area that both the terms page and the
       * site metadata state. No street address for an office or a kitchen
       * exists anywhere in this codebase, so the answer says so plainly
       * rather than inventing one.
       */
      const names = account?.zoneNames ?? [];
      const zoneBit =
        names.length > 0
          ? ` — এখন ${names.length}টি জোনে, যেমন ${names.slice(0, 5).join(', ')}`
          : '';
      return {
        text: `আমরা ময়মনসিংহ সদরে ঘরের মতো রান্না করা খাবার পৌঁছে দিই${zoneBit}। অফিস বা রান্নাঘরের নির্দিষ্ট ঠিকানাটা আমার কাছে নেই — সেটা জানতে ${SUPPORT_PHONE} নাম্বারে কল করুন।`,
        link: { href: '/order', label: 'জোনের তালিকা' },
      };
    }

    case 'zones': {
      const names = account?.zoneNames ?? [];
      if (names.length === 0) {
        return {
          text: 'কোন কোন জোনে ডেলিভারি হয় সেটা অর্ডার পেজে জোনের তালিকায় দেখতে পাবেন — আপনার ঠিকানার জোনটা ওখান থেকে বেছে নিতে হয়, আর ডেলিভারি চার্জ জোন অনুযায়ী আলাদা।',
          link: { href: '/order', label: 'জোনের তালিকা' },
        };
      }
      const shown = names.slice(0, 8).join(', ');
      return {
        text: `এখন ${names.length}টি জোনে ডেলিভারি হয়${names.length > 8 ? `, যেমন ${shown}` : `: ${shown}`}। ডেলিভারি চার্জ জোন অনুযায়ী আলাদা, আর সাবস্ক্রিপশন থাকলে ফ্রি।`,
        link: { href: '/order', label: 'পুরো তালিকা' },
      };
    }

    case 'contact':
      return {
        text: `যেকোনো দরকারে কল করুন ${SUPPORT_PHONE} — পেমেন্ট, সাবস্ক্রিপশন, ডেলিভারি, সব কিছুর জন্য এই এক নাম্বার। মেইলও করতে পারেন ain19951995@gmail.com এ।`,
      };

    /* ------------------------------------------------------------------ */
    /* Ordering, and the account itself                                   */
    /* ------------------------------------------------------------------ */

    case 'order-no-sub': {
      const charge = account?.deliveryPerMeal ?? 0;
      return {
        text: `হ্যাঁ, সাবস্ক্রিপশন ছাড়াও অর্ডার করা যায় — তখন টাকাটা ক্যাশ অন ডেলিভারিতে দিতে হয়, খাবারের দাম প্রতি বেলায় ${taka(COD_MEAL_SURCHARGE)} বেশি পড়ে${charge > 0 ? `, আর ডেলিভারি চার্জ ${taka(charge)}` : ', আর জোন অনুযায়ী ডেলিভারি চার্জ লাগে'}। শুধু ওয়ালেট থেকে পেমেন্ট আর ফ্রি ডেলিভারির জন্য সাবস্ক্রিপশন লাগে। চাইলে এখান থেকেই অর্ডার করতে পারেন — বলুন "কাল রাতে"।`,
        chips: [
          { label: 'কাল রাতের খাবার', send: 'কাল রাতে' },
          { label: 'সাবস্ক্রিপশনের দাম', send: 'সাবস্ক্রিপশনের দাম কত' },
        ],
      };
    }

    case 'order-how':
      return {
        text: `অর্ডার করা সহজ — আমাকে শুধু বলুন কোন দিন আর কোন বেলা, যেমন "কাল রাতে" বা "3 দিন দুপুরে"। আমি খাবারের নাম আর দাম দেখিয়ে একটা হিসাব দেব, আপনি দেখে "অর্ডার করুন" চাপলেই হয়ে যাবে। অর্ডারের শেষ সময়:
${cutoffLines()}`,
        chips: [
          { label: 'কাল রাতের খাবার', send: 'কাল রাতে' },
          { label: '3 দিনের খাবার', send: '3 দিন' },
        ],
      };

    case 'order-refund':
      /*
       * src/app/api/orders/[id]/cancel: a wallet order placed under
       * charge-on-delivery has `walletCharged: false`, so cancelling only
       * releases the reservation — no money ever moved. A cash order was
       * never paid for. Either way nothing is "refunded", which is why the
       * answer says it in those words.
       */
      return {
        text: `সময়ের মধ্যে অর্ডার বাতিল করলে টাকা কাটেই না, তাই ফেরতের দরকারও হয় না। ওয়ালেটের অর্ডারে টাকাটা শুধু আটকে রাখা হয় আর খাবার ডেলিভারি হলে তখন কাটা হয় — বাতিল করলে ওই আটকে রাখা টাকাটা ছেড়ে দেওয়া হয়। ক্যাশের অর্ডারে তো টাকা দেওয়াই হয়নি। বাতিলের শেষ সময়:
${cutoffLines()}`,
        link: { href: '/dashboard/orders', label: 'অর্ডার বাতিল করুন' },
      };

    case 'order-spend': {
      const spend = account?.spend;
      if (!spend || spend.placedCount === 0) {
        return {
          text: `আপনি এখনও কোনো অর্ডার করেননি${spend && spend.cancelledCount > 0 ? `, আগের ${spend.cancelledCount}টি বাতিল হয়ে গেছে` : ''}। অর্ডার করতে শুধু বলুন "কাল রাতে"।`,
          chips: [{ label: 'কাল রাতের খাবার', send: 'কাল রাতে' }],
        };
      }
      const pending = spend.placedCount - spend.deliveredCount;
      return {
        text:
          `এখন পর্যন্ত আপনি মোট ${spend.placedCount}টি খাবার অর্ডার করেছেন, সব মিলিয়ে ${taka(spend.placedTotal)} (ডেলিভারি চার্জ ধরে)। ` +
          `এর মধ্যে ডেলিভারি হয়ে গেছে ${spend.deliveredCount}টি, ${taka(spend.deliveredTotal)}${
            pending > 0 ? ` — আর ${pending}টি খাবার এখনও চলছে` : ''
          }।${spend.cancelledCount > 0 ? ` বাতিল করা হয়েছে ${spend.cancelledCount}টি — ওগুলোর টাকা ধরা হয়নি।` : ''}`,
        link: { href: '/dashboard/orders', label: 'অর্ডারের তালিকা' },
      };
    }

    case 'order-max':
      return {
        text: `আমি এক কথায় সর্বোচ্চ ${MAX_DAYS} দিনের অর্ডার নিতে পারি — পুরো মাসের অর্ডার একবারে নিই না, কারণ মেনু আর বন্ধের দিন বদলায়। ${MAX_DAYS} দিন করে করে নিতে পারেন, অথবা অর্ডার পেজ থেকে নিজের পছন্দের তারিখগুলো বেছে নিতে পারেন।`,
        chips: [{ label: '7 দিনের খাবার', send: '7 দিন' }],
        link: { href: '/order', label: 'অর্ডার পেজ' },
      };

    case 'signup':
      return {
        text: 'নতুন অ্যাকাউন্ট খুলতে সাইন আপ পেজে নাম, হোয়াটসঅ্যাপ নাম্বার, ডেলিভারির জোন, ঠিকানা আর একটা পাসওয়ার্ড দিতে হয়। ইমেইল দিতেই হবে না — তবে দিলে পাসওয়ার্ড ভুলে গেলে নিজেই রিসেট করতে পারবেন। লগইনটা হয় নাম্বার দিয়ে।',
        link: { href: '/signup', label: 'সাইন আপ করুন' },
      };

    case 'password':
      return {
        text: `পাসওয়ার্ড ভুলে গেলে ফরগট পাসওয়ার্ড পেজে নাম্বারটা দিন। অ্যাকাউন্টে ইমেইল থাকলে ওখানে একটা 6 সংখ্যার কোড চলে যাবে, সেটা দিয়ে নতুন পাসওয়ার্ড বসাতে পারবেন। ইমেইল না থাকলে রিকোয়েস্টটা সাপোর্টে চলে যায়, আর অ্যাডমিন একটা সাময়িক পাসওয়ার্ড দিয়ে দেন — দরকার হলে ${SUPPORT_PHONE} নাম্বারে কল করুন।`,
        link: { href: '/forgot-password', label: 'পাসওয়ার্ড রিসেট' },
      };

    case 'profile-edit':
      return {
        text: 'নাম, নাম্বার, ঠিকানা আর ডেলিভারির জোন প্রোফাইল পেজ থেকে নিজেই বদলাতে পারবেন, পাসওয়ার্ডও ওখান থেকেই বদলানো যায়। ঠিকানা বদলালে পরের অর্ডারগুলো নতুন ঠিকানাতেই যাবে — আগে দেওয়া অর্ডারের ঠিকানা বদলাতে চাইলে অ্যাডমিনকে বলতে হবে।',
        link: { href: '/dashboard/profile', label: 'প্রোফাইল' },
      };

    case 'portion':
      return {
        text: 'প্রতি বেলায় কী কী থাকে সেটা সাপ্তাহিক মেনুতে লেখা থাকে — আমাকে বললে ওই দিনের খাবারের নাম আর দাম দেখিয়ে দিতে পারি। কিন্তু পরিমাণ কতটুকু, কয় পিস, এসব নির্দিষ্ট তথ্য আমার কাছে নেই, তাই আন্দাজে বলব না। স্ট্যান্ডার্ড প্যাকেজে পদ আর পরিমাণ বেসিকের চেয়ে বেশি — বিস্তারিত জানতে ' + SUPPORT_PHONE + ' নাম্বারে কল করুন।',
        chips: [
          { label: 'আজ কী রান্না', send: 'আজ কী রান্না' },
          { label: 'প্যাকেজের দাম', send: 'প্যাকেজের দাম কত' },
        ],
      };

    case 'special-request':
      /*
       * Honest about a gap rather than helpful-sounding: `specialInstructions`
       * exists on the order payload, but no form on the site collects it —
       * Order.tsx sends an empty string — so there is nowhere to type this.
       */
      return {
        text: `তেল, ঝাল বা মসলা নিয়ে আলাদা অনুরোধ রাখার কোনো ব্যবস্থা এখন সাইটে নেই — অর্ডার ফর্মেও এরকম কোনো ঘর নেই, তাই আমি কথা দিতে পারি না। এই ধরনের দরকার হলে ${SUPPORT_PHONE} নাম্বারে কল করে বলুন, রান্নাঘরে জানাতে পারলে ওরাই জানাবে।`,
      };

    default:
      return null;
  }
}
