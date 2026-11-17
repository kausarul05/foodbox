'use client';

/**
 * The chat itself: a floating launcher and a panel.
 *
 * It is a guided conversation, not a free-form one. Every reply the bot gives
 * offers the next tap, so a customer who types nothing at all can still finish
 * an order, and the keyword parser only has to understand the short phrases
 * people actually use ("kal ratre", "3 din"). What it does not understand it
 * says so about, rather than guessing — there is no model here to guess with.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Loader2,
  MessageCircle,
  Mic,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { bengaliDate, bn, taka } from '@/lib/format';
import { JOINING_FLOAT_DAYS, mealPrice } from '@/lib/rules';
import { useSession } from '@/lib/useSession';
import { Field, Input } from '@/components/ui/Field';
import PaymentFields, { validatePayment, type PaymentDetails } from '@/components/ui/PaymentFields';
import { answerTopic, TOPICS_NEEDING_PACKAGES } from './answers';
import { MAX_DAYS, MEALS, type MealKey } from './config';
import { parse } from './parse';
import {
  buildPlan,
  cancelOrder,
  loadAccount,
  loadCancellableOrders,
  loadGuestQuota,
  loadPublicAccount,
  loadSubscriptionInfo,
  nextWeekday,
  placePlan,
  requestSubscription,
  splitPackage,
  todayISO,
  weekdayOf,
  addDays,
  fromISO,
  toISO,
  withPackage,
  type Account,
  type MyOrder,
  type PackageChoice,
  type PackageOption,
  type Plan,
  type SubscriptionInfo,
} from './data';
import { listenOnce, micErrorMessage, micSupported } from './speech';

interface Chip {
  label: string;
  send: string;
}

/** One line of the menu card. `price` is null when the meal is not on offer. */
interface MenuLine {
  label: string;
  dish: string;
  price: number | null;
}

interface Message {
  id: number;
  role: 'bot' | 'user';
  text: string;
  chips?: Chip[];
  plan?: Plan;
  /** The package overview card, with a subscribe button per package. */
  sub?: { info: SubscriptionInfo; canSubscribe: boolean };
  /** The subscription request form, inline in the conversation. */
  form?: { pkg: PackageOption; firstTime: boolean };
  /**
   * One day's menu, as a card.
   *
   * `packages` is non-empty only for a customer who may switch — a subscriber
   * eats from the package they pay for, so offering the others would be
   * offering food they cannot order.
   */
  menu?: {
    iso: string;
    dayName: string;
    packageLabel: string;
    packageSlug: string;
    packages: PackageChoice[];
    rows: MenuLine[];
  };
  /** The orders that could still be cancelled, each with its own button. */
  cancelList?: MyOrder[];
  /** The order waiting on a yes before it is cancelled. */
  confirmCancel?: MyOrder;
  link?: { href: string; label: string };
}

interface Draft {
  meals: MealKey[];
  startISO: string | null;
  dayCount: number | null;
  /**
   * Set only when the customer named a date outright ("13 তারিখ").
   *
   * `buildPlan` walks forward past a closed Friday so that a request for three
   * days yields three days — right for a run, but for one named date it would
   * quietly answer about a different day. This is what lets the reply say so.
   */
  exactISO: string | null;
}

const EMPTY_DRAFT: Draft = { meals: [], startISO: null, dayCount: null, exactISO: null };

/** Said whenever the honest answer is "ask a person". */
const SUPPORT_LINE = '01410906862 নাম্বারে কল করুন, ওখান থেকে ঠিক উত্তরটা পাবেন।';

/**
 * Set once the customer has opened the chat even one time.
 *
 * The launcher pulses and offers a line about itself until then, and never
 * again afterwards: a button that keeps waving at someone who has already used
 * it is noise, and the second time it is ignored it stops being noticed at all.
 * Browser storage can throw (private windows, blocked site data), so every
 * read and write below is wrapped and a failure just means the nudge shows
 * again on the next visit.
 */
const SEEN_KEY = 'fcs-assistant-seen';

/**
 * How many visits may offer the nudge before it gives up.
 *
 * Someone who has scrolled past it three times has decided. Holding the value
 * in the same key keeps this to one piece of stored state: '1' once they have
 * opened the chat, otherwise how many times it has been offered.
 */
const NUDGE_LIMIT = 3;

const EMPTY_PAYMENT: PaymentDetails = {
  paymentMethod: 'bkash',
  transactionId: '',
  senderNumber: '',
};

const HOME_CHIPS: Chip[] = [
  { label: 'আগামীকাল রাতের খাবার', send: 'কাল রাতে' },
  { label: '3 দিনের খাবার', send: '3 দিন' },
  { label: 'আমার ব্যালান্স', send: 'ব্যালান্স' },
  { label: 'আজ কী রান্না', send: 'আজ কী রান্না' },
  { label: 'সাবস্ক্রিপশন', send: 'সাবস্ক্রিপশন' },
];

/** Nobody logged in: only the things a visitor can actually get an answer to. */
const GUEST_CHIPS: Chip[] = [
  { label: 'আজ কী রান্না', send: 'আজ কী রান্না' },
  { label: 'সাবস্ক্রিপশনের দাম', send: 'সাবস্ক্রিপশনের দাম কত' },
  { label: 'ডেলিভারি চার্জ', send: 'ডেলিভারি চার্জ কত' },
  { label: 'সাবস্ক্রিপশন ছাড়া অর্ডার', send: 'সাবস্ক্রিপশন ছাড়া অর্ডার করা যাবে' },
];

const MEAL_CHIPS: Chip[] = [
  { label: 'সকাল', send: 'সকালে' },
  { label: 'দুপুর', send: 'দুপুরে' },
  { label: 'রাত', send: 'রাতে' },
  { label: 'তিন বেলা', send: 'তিন বেলা' },
];

const START_CHIPS: Chip[] = [
  { label: 'আজ', send: 'আজ' },
  { label: 'আগামীকাল', send: 'আগামীকাল' },
  { label: 'পরশু', send: 'পরশু' },
];

const YES_RE = /^(হ্যাঁ|হা|হ্যা|জি|ঠিক আছে|করো|কনফার্ম|অর্ডার করুন|ha|haa|hae|hmm|ji|ok|okay|thik|thik ache|koro|kore dao|confirm|yes|y)$/i;
const NO_RE = /^(না|নাহ|বাতিল|থাক|na|nah|no|cancel|batil|thak|bad dao)$/i;

const mealFull = (meal: MealKey) => MEALS.find((m) => m.key === meal)?.full ?? meal;

export default function AssistantWidget() {
  const { user, hydrated } = useSession();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [account, setAccount] = useState<Account | null>(null);
  const [busy, setBusy] = useState(false);
  /** Which card's buttons are still live. */
  const [pendingCard, setPendingCard] = useState<number | null>(null);

  /** Package and joining figures, re-read after a request changes them. */
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  /** Which subscription form is live, and what has been typed into it. */
  const [activeForm, setActiveForm] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [payment, setPayment] = useState<PaymentDetails>(EMPTY_PAYMENT);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');

  /** The order a yes/no is being collected for. */
  const [pendingCancel, setPendingCancel] = useState<MyOrder | null>(null);

  /** Whether this browser has opened the chat before, and the one-time nudge. */
  const [seen, setSeen] = useState(true);
  const [nudge, setNudge] = useState(false);

  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [micNote, setMicNote] = useState('');

  const nextId = useRef(1);
  const scroller = useRef<HTMLDivElement | null>(null);
  const stopListening = useRef<(() => void) | null>(null);
  /** The plan behind the live card, kept out of message state for confirmation. */
  const planRef = useRef<Plan | null>(null);

  const say = useCallback((message: Omit<Message, 'id'>) => {
    const id = nextId.current++;
    setMessages((prev) => [...prev, { ...message, id }]);
    return id;
  }, []);

  /* -------------------------------------------------------------------- */
  /* Scroll                                                               */
  /* -------------------------------------------------------------------- */

  useEffect(() => {
    const node = scroller.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, busy]);

  /* -------------------------------------------------------------------- */
  /* Conversation                                                         */
  /* -------------------------------------------------------------------- */

  /**
   * Said when a visitor asks for something only an account can do.
   *
   * Everything about the food and the rules is answered without a login; it is
   * money, orders and anything belonging to one person that needs one.
   */
  const askLogin = useCallback(
    (what: string) => {
      say({
        role: 'bot',
        text: `${what} করতে আগে লগইন করতে হবে। অ্যাকাউন্ট না থাকলে এক মিনিটেই খোলা যায় — নাম, হোয়াটসঅ্যাপ নাম্বার আর ঠিকানা লাগে। মেনু আর নিয়মকানুনের কথা এখনই জিজ্ঞেস করতে পারেন।`,
        link: { href: '/login', label: 'লগইন করুন' },
        chips: [
          { label: 'আজ কী রান্না', send: 'আজ কী রান্না' },
          { label: 'সাবস্ক্রিপশনের দাম', send: 'সাবস্ক্রিপশনের দাম কত' },
        ],
      });
    },
    [say]
  );

  /** Loads the account once per open panel, and reports a failure honestly. */
  const ensureAccount = useCallback(async (): Promise<Account | null> => {
    if (account) return account;
    try {
      // Nobody logged in: the menu, the packages and the zones are still
      // public, and showing them is the point of the chat being on a landing
      // page at all.
      const loaded = user ? await loadAccount(user) : await loadPublicAccount();
      setAccount(loaded);
      return loaded;
    } catch {
      say({ role: 'bot', text: 'আপনার তথ্য লোড করা যায়নি। একটু পরে আবার চেষ্টা করুন।' });
      return null;
    }
  }, [account, user, say]);

  /** Shows the review card for a completed draft, or explains why there is none. */
  const proposeOrder = useCallback(
    async (acc: Account, complete: Draft) => {
      if (!acc.zoneId && !acc.subscribed) {
        say({
          role: 'bot',
          text: 'আপনার প্রোফাইলে ডেলিভারির জোন নেই, তাই দাম হিসাব করা যাচ্ছে না। অর্ডার পেজে একবার জোন বেছে নিলে এখান থেকেই অর্ডার করা যাবে।',
          link: { href: '/order', label: 'অর্ডার পেজে যান' },
        });
        return;
      }
      if (acc.menu.length === 0) {
        say({ role: 'bot', text: 'মেনু লোড করা যায়নি, তাই এখন দাম বলতে পারছি না।' });
        return;
      }

      const plan = await buildPlan(
        acc,
        complete.startISO as string,
        complete.dayCount ?? 1,
        complete.meals
      );

      if (plan.lines.length === 0) {
        say({
          role: 'bot',
          text:
            plan.skipped.length > 0
              ? `এই অর্ডারটা করা যাচ্ছে না — ${plan.skipped[0]}`
              : 'এই দিনগুলোতে অর্ডার করার মতো কিছু পাওয়া যায়নি।',
          chips: HOME_CHIPS,
        });
        setDraft(EMPTY_DRAFT);
        return;
      }

      if (plan.pay === 'wallet' && plan.total > acc.walletAvailable) {
        say({
          role: 'bot',
          text: `এই অর্ডারে লাগবে ${taka(plan.total)}, কিন্তু অর্ডারের জন্য ওয়ালেটে আছে ${taka(acc.walletAvailable)}। আগে রিচার্জ করে নিন।`,
          link: { href: '/dashboard/wallet', label: 'ওয়ালেট রিচার্জ' },
        });
        setDraft(EMPTY_DRAFT);
        return;
      }

      /*
       * The named date did not survive: say that before the card, or the
       * answer is about a day the customer never asked about.
       */
      if (complete.exactISO && plan.lines[0].date !== complete.exactISO) {
        const why = plan.skipped.find((reason) => reason.startsWith(complete.exactISO as string));
        say({
          role: 'bot',
          text: `${bengaliDate(complete.exactISO)} তারিখে হবে না${
            why ? ` — ${why.slice((complete.exactISO as string).length).replace(/^\s*[—-]\s*/, '')}` : ''
          }। তার পরের যে দিন পাওয়া গেল, সেটাই দেখালাম — ঠিক না হলে বাতিল করুন।`,
        });
      }

      planRef.current = plan;
      // Which menu the food and the price came from. A subscriber has only
      // one, but anyone else could have been reading either.
      const from = acc.packageLocked ? '' : ` (${acc.packageLabel}ের মেনু থেকে)`;
      const id = say({
        role: 'bot',
        text: `${plan.lines.length}টি খাবার, সর্বমোট ${taka(plan.total)}${from}। ঠিক থাকলে অর্ডার করুন বলুন বা বাটনে চাপ দিন।`,
        plan,
      });
      setPendingCard(id);
      setDraft(EMPTY_DRAFT);
    },
    [say]
  );

  /**
   * One day's menu as a card, priced the way this customer would pay for it.
   *
   * Lifted out of the message handler on 17 Nov 2026 so the package buttons on
   * the card can redraw the same day from a different menu without sending a
   * sentence back through the parser.
   */
  const showMenu = useCallback(
    (acc: Account, iso: string) => {
      const dayName = weekdayOf(iso);
      const row = acc.menu.find((m) => m.day === dayName);
      if (!row) {
        say({ role: 'bot', text: `${dayName}ের মেনু পাওয়া যায়নি।` });
        return;
      }

      /*
       * Priced as this customer would pay: the menu price from the wallet, or
       * that plus the cash surcharge. `mealPrice()` in src/lib/rules.ts is the
       * one place that rule lives, and the order route prices the meal with
       * the same function.
       */
      const rows: MenuLine[] = MEALS.map((meal) => {
        const dish = row[meal.key];
        const menuPrice = row[`${meal.key}Price` as const] ?? 0;
        const sellable = Boolean(dish) && menuPrice > 0;
        return {
          label: meal.label,
          dish: dish ?? '',
          price: sellable ? mealPrice(menuPrice, acc.subscribed ? 'wallet' : 'cash') : null,
        };
      });

      const offered = rows.filter((line) => line.price !== null).length;
      const day = Number(iso.slice(8));
      say({
        role: 'bot',
        text:
          offered > 0
            ? `${dayName}, ${bengaliDate(iso)} — ${acc.packageLabel}ের মেনু।`
            : `${dayName}, ${bengaliDate(iso)} — এখনো কোনো খাবার ঠিক করা হয়নি।`,
        menu: {
          iso,
          dayName,
          packageLabel: acc.packageLabel,
          packageSlug: acc.packageSlug,
          // A subscriber has nothing to choose between, and neither has anyone
          // else when the site sells one package.
          packages: acc.packageLocked ? [] : acc.packages,
          rows,
        },
        chips:
          offered > 0
            ? [
                { label: 'এই দিনের অর্ডার করব', send: `${day} তারিখে অর্ডার করব` },
                { label: 'আগামীকালের মেনু', send: 'কাল কি রান্না' },
              ]
            : HOME_CHIPS,
      });
    },
    [say]
  );

  /**
   * The package buttons under a menu card: reload that package's menu and draw
   * the same day again.
   */
  const pickPackage = useCallback(
    async (slug: string, iso: string) => {
      const acc = account;
      if (!acc || slug === acc.packageSlug) return;
      setBusy(true);
      try {
        const switched = await withPackage(acc, slug);
        if (!switched) {
          say({
            role: 'bot',
            text: 'ওই প্যাকেজের মেনু লোড করা যায়নি, তাই আগেরটাই রেখে দিলাম।',
          });
          return;
        }
        setAccount(switched);
        showMenu(switched, iso);
      } finally {
        setBusy(false);
      }
    },
    [account, say, showMenu]
  );

  /** Asks for whatever the draft is still missing, or proposes the order. */
  const advance = useCallback(
    async (acc: Account, next: Draft) => {
      if (next.meals.length === 0) {
        say({ role: 'bot', text: 'কোন বেলার খাবার?', chips: MEAL_CHIPS });
        return;
      }
      if (!next.startISO) {
        say({ role: 'bot', text: 'কোন দিন থেকে?', chips: START_CHIPS });
        return;
      }
      await proposeOrder(acc, next);
    },
    [say, proposeOrder]
  );

  const confirmOrder = useCallback(async () => {
    const plan = planRef.current;
    const acc = account;
    if (!plan || !acc) return;

    setPendingCard(null);
    setBusy(true);
    try {
      const { placed, failures } = await placePlan(acc, plan);

      if (placed > 0) {
        say({
          role: 'bot',
          text:
            failures.length === 0
              ? `${placed}টি অর্ডার হয়ে গেছে।`
              : `${placed}টি অর্ডার হয়েছে, ${failures.length}টি হয়নি: ${failures.join('; ')}`,
          link: { href: '/dashboard/orders', label: 'আমার অর্ডার দেখুন' },
        });
        // The wallet and the "already ordered" set both moved, so the next
        // question must not be answered from the old snapshot.
        setAccount(null);
      } else {
        say({
          role: 'bot',
          text: `অর্ডার করা যায়নি — ${failures[0] ?? 'আবার চেষ্টা করুন'}`,
          chips: HOME_CHIPS,
        });
      }
    } finally {
      planRef.current = null;
      setBusy(false);
    }
  }, [account, say]);

  /* -------------------------------------------------------------------- */
  /* Subscriptions                                                        */
  /* -------------------------------------------------------------------- */

  /** Loads the package figures once per open panel. */
  const ensureSubInfo = useCallback(async (): Promise<SubscriptionInfo | null> => {
    if (subInfo) return subInfo;
    try {
      const loaded = await loadSubscriptionInfo();
      setSubInfo(loaded);
      return loaded;
    } catch {
      say({ role: 'bot', text: 'প্যাকেজের তথ্য লোড করা যায়নি। একটু পরে আবার চেষ্টা করুন।' });
      return null;
    }
  }, [subInfo, say]);

  /** Opens the request form for one package, or says why it cannot. */
  const startSubscribe = useCallback(
    (pkg: PackageOption, firstTime: boolean) => {
      /*
       * Subscription.address and Subscription.zone are both required, and the
       * route fills them from the saved profile — so an account with neither
       * would have its request rejected by mongoose after the customer had
       * already sent money. Better to ask for the profile first.
       */
      if (!user?.address || !user?.zone) {
        say({
          role: 'bot',
          text: 'সাবস্ক্রাইব করার আগে প্রোফাইলে ঠিকানা আর ডেলিভারির জোন দিয়ে নিন — ওখান থেকেই খাবার পাঠানো হবে।',
          link: { href: '/dashboard/profile', label: 'প্রোফাইল পূরণ করুন' },
        });
        return;
      }

      // The same refusal POST /api/subscriptions gives a first-time joiner:
      // without a menu there is nothing to price the food float against.
      if (firstTime && pkg.menuMissing) {
        say({
          role: 'bot',
          text: `${pkg.title}-এর সাপ্তাহিক মেনু এখনো যোগ করা হয়নি, তাই এখন এটা নেওয়া যাচ্ছে না।`,
        });
        return;
      }

      setPayment(EMPTY_PAYMENT);
      setAmount(String(firstTime ? pkg.joining : pkg.fee));
      setFormError('');

      const id = say({
        role: 'bot',
        text: firstTime
          ? `${pkg.title}। প্রথমবার সর্বনিম্ন ${taka(pkg.joining)} পাঠাতে হবে — এর মধ্যে শুধু ফি'র ${taka(pkg.fee)} ফেরতযোগ্য নয়, বাকি ${taka(pkg.joining - pkg.fee)} আপনার ওয়ালেটেই জমা থাকবে। নিচের ফর্মটা পূরণ করুন।`
          : `${pkg.title} — ফি ${taka(pkg.fee)}, যেটা ফেরতযোগ্য নয়। টাকা পাঠিয়ে নিচের ফর্মে ট্রানজেকশন আইডিটা দিন।`,
        form: { pkg, firstTime },
      });
      setActiveForm(id);
    },
    [user, say]
  );

  /**
   * Sends the request. Every figure is checked again by the route — this is so
   * the customer sees the problem before their money is involved.
   */
  const submitSubscription = useCallback(
    async (pkg: PackageOption, firstTime: boolean) => {
      const sent = Number(amount);
      const least = firstTime ? pkg.joining : pkg.fee;
      if (!Number.isFinite(sent) || sent < least) {
        setFormError(`সর্বনিম্ন ${bn(least)} টাকা পাঠাতে হবে`);
        return;
      }

      const problem = validatePayment(payment);
      if (problem) {
        setFormError(problem);
        return;
      }

      setFormError('');
      setSending(true);
      try {
        const res = await requestSubscription({
          slug: pkg.slug,
          amount: sent,
          paymentMethod: payment.paymentMethod,
          transactionId: payment.transactionId,
          senderNumber: payment.senderNumber,
        });

        if (res.ok) {
          setActiveForm(null);
          // The subscription is pending now and the order flow reads
          // "subscribed" and the wallet off its own snapshot — both stale.
          setSubInfo(null);
          setAccount(null);
          say({
            role: 'bot',
            text: `রিকোয়েস্ট পাঠানো হয়েছে। অ্যাডমিন ট্রানজেকশন আইডি মিলিয়ে দেখে অনুমোদন দিলে ${pkg.title} চালু হয়ে যাবে।`,
            link: { href: '/dashboard/profile', label: 'অবস্থা দেখুন' },
          });
        } else {
          setFormError(res.message || 'রিকোয়েস্ট পাঠানো যায়নি');
        }
      } finally {
        setSending(false);
      }
    },
    [amount, payment, say]
  );

  /* -------------------------------------------------------------------- */
  /* Cancelling                                                           */
  /* -------------------------------------------------------------------- */

  /**
   * Asks before cancelling. Two taps, never one.
   *
   * A cancellation is somebody's dinner and somebody's money, so the chat
   * names the meal and the date and waits for a yes — the same reason the
   * ordering flow shows a review card before it places anything.
   */
  const askCancel = useCallback(
    (order: MyOrder) => {
      setPendingCancel(order);
      say({
        role: 'bot',
        text: `${order.dayName}, ${bengaliDate(order.date)} — ${order.meal ? mealFull(order.meal) : 'খাবার'}${order.dish ? ` (${order.dish})` : ''}, ${taka(order.amount)}। এই অর্ডারটা বাতিল করব?`,
        confirmCancel: order,
      });
    },
    [say]
  );

  const doCancel = useCallback(
    async (order: MyOrder) => {
      setPendingCancel(null);
      setBusy(true);
      try {
        const res = await cancelOrder(order.id);
        if (res.ok) {
          // The wallet reservation and the "already ordered" set both moved.
          setAccount(null);
          say({
            role: 'bot',
            text: `বাতিল হয়ে গেছে — ${order.dayName}, ${bengaliDate(order.date)} এর ${order.meal ? mealFull(order.meal) : 'খাবার'}। ওই দিনের টাকা কাটা হবে না।`,
            link: { href: '/dashboard/orders', label: 'অর্ডারের তালিকা' },
          });
        } else {
          // Usually the cut-off: the server's own message is the honest one.
          say({ role: 'bot', text: res.message || 'অর্ডার বাতিল করা যায়নি।', chips: HOME_CHIPS });
        }
      } finally {
        setBusy(false);
      }
    },
    [say]
  );

  const handle = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;

      say({ role: 'user', text });
      setInput('');
      setHeard('');

      setBusy(true);
      try {
        // A pending cancellation owns the next word, the same way a review
        // card does — and it is asked first, because losing a meal matters
        // more than mis-reading a new request.
        if (pendingCancel) {
          if (YES_RE.test(text)) {
            await doCancel(pendingCancel);
            return;
          }
          if (NO_RE.test(text)) {
            setPendingCancel(null);
            say({ role: 'bot', text: 'ঠিক আছে, অর্ডারটা রেখে দিলাম।', chips: HOME_CHIPS });
            return;
          }
          // Anything else is a new request; the question simply lapses.
          setPendingCancel(null);
        }

        // A live card owns the next word: "ha" after a review card means that
        // card, not a new request.
        if (pendingCard !== null) {
          if (YES_RE.test(text)) {
            await confirmOrder();
            return;
          }
          if (NO_RE.test(text)) {
            setPendingCard(null);
            planRef.current = null;
            say({ role: 'bot', text: 'ঠিক আছে, বাতিল করলাম।', chips: HOME_CHIPS });
            return;
          }
          // Anything else is a new request; the card simply stops being live.
          setPendingCard(null);
          planRef.current = null;
        }

        let acc = await ensureAccount();
        if (!acc) return;

        /*
         * A package named in the sentence decides which menu the rest of it is
         * about — "স্ট্যান্ডার্ড প্যাকেজের কাল রাতের খাবার" is an order from
         * that menu, not from whichever one happened to be loaded.
         *
         * Until 17 Nov 2026 there was no way to say this at all: the chat
         * loaded the cheapest package and a customer without a subscription
         * never saw the rest of the food. The names come from the database, so
         * a package added later works without a code change.
         */
        let said = text;
        const picked = splitPackage(acc.packages, text);
        if (picked && picked.pkg.slug !== acc.packageSlug) {
          if (acc.packageLocked) {
            say({
              role: 'bot',
              text: `আপনার ${acc.packageLabel} চালু আছে, তাই খাবার আর দাম ওই প্যাকেজের মেনু থেকেই আসে — ${picked.pkg.title} থেকে অর্ডার নেওয়া যাবে না। প্যাকেজ বদলাতে চাইলে ${SUPPORT_LINE}`,
              link: { href: '/dashboard/profile', label: 'আমার সাবস্ক্রিপশন' },
            });
            return;
          }
          const switched = await withPackage(acc, picked.pkg.slug);
          if (!switched) {
            say({ role: 'bot', text: `${picked.pkg.title}ের মেনু লোড করা যায়নি। একটু পরে আবার চেষ্টা করুন।` });
            return;
          }
          setAccount(switched);
          acc = switched;
        }
        if (picked) {
          // "স্ট্যান্ডার্ড প্যাকেজ" and nothing else is a request to see it.
          if (picked.rest.length === 0) {
            showMenu(acc, todayISO());
            return;
          }
          said = picked.rest;
        }

        const parsed = parse(said);

        if (parsed.pastDay) {
          say({ role: 'bot', text: 'আগের দিনের জন্য অর্ডার করা যায় না। আজ বা আগামীকালের কথা বলুন।', chips: START_CHIPS });
          return;
        }

        /*
         * The question comes before the action.
         *
         * "আমি কি চাইলে সাবস্ক্রিপশনটা আপডেট করতে পারব?" used to be read as
         * "wants to subscribe" — a package word plus "করতে" — and answered
         * with a status line that had nothing to do with the question. Now a
         * recognised question is answered from `answers.ts`, where every reply
         * is tied to a rule that exists in this codebase, and an unrecognised
         * one is admitted to below instead of being guessed at.
         */
        /*
         * Cancelling is the one topic that does something rather than says
         * something, so it is handled here instead of in answers.ts.
         */
        if (acc.guest && (parsed.topic === 'order-spend' || parsed.topic === 'order-status')) {
          askLogin(parsed.topic === 'order-spend' ? 'নিজের অর্ডারের হিসাব দেখতে' : 'নিজের অর্ডার দেখতে');
          return;
        }

        if (parsed.topic === 'order-cancel') {
          if (acc.guest) {
            askLogin('অর্ডার বাতিল');
            return;
          }
          const list = await loadCancellableOrders();
          if (list.length === 0) {
            say({
              role: 'bot',
              text: 'এখন বাতিল করার মতো কোনো অর্ডার নেই — যেগুলো ডেলিভারি হয়ে গেছে সেগুলো আর বাতিল করা যায় না।',
              link: { href: '/dashboard/orders', label: 'অর্ডারের তালিকা' },
            });
            return;
          }
          say({
            role: 'bot',
            text: 'কোন অর্ডারটা বাতিল করতে চান? নিচে থেকে বেছে নিন — সময়ের মধ্যে বাতিল করলে ওই দিনের টাকা কাটবে না।',
            cancelList: list,
          });
          return;
        }

        /*
         * "অন্য প্যাকেজের মেনু" — showing it beats describing it, and the card
         * carries the buttons to move between packages. Only for someone who
         * has a choice; answers.ts handles the rest.
         */
        if (
          parsed.topic === 'menu-package' &&
          !acc.packageLocked &&
          acc.packages.length > 1
        ) {
          say({
            role: 'bot',
            text: `সাবস্ক্রিপশন ছাড়া ${acc.packages.length}টি প্যাকেজের যেকোনো মেনু থেকেই অর্ডার করতে পারবেন। নিচের বাটন থেকে প্যাকেজ বদলে দেখুন।`,
          });
          showMenu(acc, todayISO());
          return;
        }

        if (parsed.topic) {
          const needsPackages = TOPICS_NEEDING_PACKAGES.includes(parsed.topic);
          const info = needsPackages ? await ensureSubInfo() : subInfo;
          if (needsPackages && !info) return;

          // The guest-meal caps are the one answer that needs a read of its
          // own, so it is made only when that question is actually asked.
          const guest = parsed.topic === 'guest-meal' ? await loadGuestQuota() : null;

          const answer = answerTopic(parsed.topic, { account: acc, sub: info, guest });
          if (!answer) {
            say({
              role: 'bot',
              text: `এই প্রশ্নটার পাকা উত্তর আমার কাছে নেই, তাই আন্দাজে কিছু বলব না। ${SUPPORT_LINE}`,
              chips: HOME_CHIPS,
            });
            return;
          }

          say({
            role: 'bot',
            text: answer.text,
            chips: answer.chips,
            link: answer.link,
            sub:
              answer.packages && info
                ? { info, canSubscribe: Boolean(answer.canSubscribe) && !acc.guest }
                : undefined,
          });
          return;
        }

        switch (parsed.intent) {
          case 'order': {
            if (acc.guest) {
              askLogin('অর্ডার');
              return;
            }
            // Asking for a fortnight and quietly getting a week is its own
            // small lie, so the cap is said out loud before the card appears.
            if (parsed.dayCountCapped) {
              say({
                role: 'bot',
                text: `আমি এক কথায় সর্বোচ্চ ${MAX_DAYS} দিনের অর্ডার নিতে পারি, তাই ${MAX_DAYS} দিনের হিসাব দেখাচ্ছি। বাকিটা পরে আবার বললেই নিয়ে নেব।`,
              });
            }

            const next: Draft = {
              meals: parsed.meals.length > 0 ? parsed.meals : draft.meals,
              // Most specific first: a date the customer named outright, then a
              // named weekday, then today / tomorrow / the day after, then
              // whatever they said a message ago.
              startISO:
                parsed.dateISO ??
                (parsed.weekday !== null
                  ? nextWeekday(parsed.weekday)
                  : parsed.startOffset !== null
                    ? toISO(addDays(fromISO(todayISO()), parsed.startOffset))
                    : draft.startISO),
              dayCount: parsed.dayCount ?? draft.dayCount,
              exactISO: parsed.dateISO ?? draft.exactISO,
            };
            // A named day with no count means that one day — "kal ratre" is one
            // meal, and asking "how many days?" after it would be silly.
            if (next.startISO && next.dayCount === null) next.dayCount = 1;
            setDraft(next);
            await advance(acc, next);
            return;
          }

          case 'wallet': {
            if (acc.guest) {
              askLogin('ব্যালান্স দেখতে');
              return;
            }
            if (!acc.subscribed) {
              say({
                role: 'bot',
                text: 'ওয়ালেট শুধু সাবস্ক্রাইবারদের জন্য। সাবস্ক্রিপশন ছাড়া অর্ডার করলে ক্যাশ অন ডেলিভারিতে দিতে হয়।',
                link: { href: '/subscription', label: 'সাবস্ক্রিপশন দেখুন' },
              });
              return;
            }
            say({
              role: 'bot',
              text: `অর্ডার করার জন্য আপনার ওয়ালেটে আছে ${taka(acc.walletAvailable)}।`,
              link: { href: '/dashboard/wallet', label: 'বিস্তারিত হিসাব' },
            });
            return;
          }

          case 'menu': {
            // Same precedence as an order: "13 তারিখে কি রান্না" is that date.
            const iso =
              parsed.dateISO ??
              (parsed.weekday !== null
                ? nextWeekday(parsed.weekday)
                : toISO(addDays(fromISO(todayISO()), parsed.startOffset ?? 0)));
            showMenu(acc, iso);
            return;
          }

          case 'myorders': {
            if (acc.guest) {
              askLogin('নিজের অর্ডার দেখতে');
              return;
            }
            const upcoming = acc.activeOrders;
            say({
              role: 'bot',
              text:
                upcoming > 0
                  ? `আপনার ${upcoming}টি খাবারের অর্ডার এখনও চলছে — ডেলিভারি হয়নি এখনও।`
                  : 'এই মুহূর্তে আপনার কোনো অর্ডার নেই।',
              link: { href: '/dashboard/orders', label: 'অর্ডারের তালিকা' },
            });
            return;
          }

          case 'subscribe': {
            if (acc.guest) {
              askLogin('সাবস্ক্রিপশন নিতে');
              return;
            }
            const info = await ensureSubInfo();
            if (!info) return;

            // The route refuses a second request while one is live, so say so
            // rather than opening a form that can only fail.
            if (info.status === 'active' || info.status === 'pending') {
              const title = info.packageTitle || acc.packageLabel;
              say({
                role: 'bot',
                text:
                  info.status === 'active'
                    ? `আপনার ${title} এখনো চালু আছে, তাই নতুন সাবস্ক্রিপশন নেওয়া যাবে না। প্যাকেজ বদলাতে চাইলে ${SUPPORT_LINE}`
                    : `আপনার ${title} রিকোয়েস্ট এখনো অনুমোদনের অপেক্ষায়, তাই নতুন রিকোয়েস্ট পাঠানো যাবে না।`,
                link: { href: '/dashboard/profile', label: 'আমার সাবস্ক্রিপশন' },
              });
              return;
            }

            if (info.packages.length === 0) {
              say({ role: 'bot', text: 'এই মুহূর্তে কোনো প্যাকেজ চালু নেই।' });
              return;
            }

            // Nothing to choose between — straight to the form.
            if (info.packages.length === 1) {
              startSubscribe(info.packages[0], info.firstTime);
              return;
            }

            say({
              role: 'bot',
              text: 'কোন প্যাকেজটা নিতে চান?',
              sub: { info, canSubscribe: true },
            });
            return;
          }

          /*
           * Two different admissions, because they are two different failures.
           * Someone who asked a question and got "press a button" has not been
           * answered; saying plainly that the answer is not in here, with the
           * number of someone who does know, is the honest reply.
           */
          default: {
            say({
              role: 'bot',
              text: parsed.question
                ? `এই প্রশ্নটা আমি ঠিক বুঝতে পারিনি, আর বুঝিনি বলে আন্দাজে উত্তর দিতে চাই না। আমি নিয়মকানুনের উত্তর দিতে পারি — সাবস্ক্রিপশন, দাম, ডিপোজিট, অর্ডারের শেষ সময়, ডেলিভারির সময়, বন্ধের দিন, পেমেন্ট, গেস্ট মিল আর অ্যাকাউন্টের ব্যাপার। প্রশ্নটা অন্যভাবে বলে দেখুন। ${SUPPORT_LINE}`
                : 'এটা আমি বুঝতে পারিনি। আমি খাবার অর্ডার করতে, ব্যালান্স বলতে, মেনু দেখাতে আর সাবস্ক্রিপশন নিতে পারি — নিচের যেকোনোটায় চাপ দিন বা বলুন "কাল রাতে"।',
              chips: HOME_CHIPS,
            });
            return;
          }
        }
      } finally {
        setBusy(false);
      }
    },
    [
      busy,
      pendingCard,
      draft,
      say,
      askLogin,
      ensureAccount,
      advance,
      showMenu,
      confirmOrder,
      ensureSubInfo,
      subInfo,
      startSubscribe,
      pendingCancel,
      doCancel,
    ]
  );

  /* -------------------------------------------------------------------- */
  /* Opening                                                              */
  /* -------------------------------------------------------------------- */

  /*
   * `seen` starts true so the first paint is the quiet button: assuming the
   * nudge and then withdrawing it would flash at everyone, including the
   * people who have already used this.
   */
  const counted = useRef(false);
  useEffect(() => {
    // React runs effects twice in development; without this the visit counter
    // would burn through its three offers in two page loads.
    if (counted.current) return;
    counted.current = true;

    let known = true;
    try {
      const stored = localStorage.getItem(SEEN_KEY);
      if (stored === '1') {
        known = true;
      } else {
        const offered = Number(stored ?? 0);
        known = !Number.isFinite(offered) || offered >= NUDGE_LIMIT;
        if (!known) localStorage.setItem(SEEN_KEY, String(offered + 1));
      }
    } catch {
      /* storage unavailable: treat as seen, so nobody is nagged in a loop */
    }
    if (known) return;
    setSeen(false);
    // Not at the moment the page lands — it arrives once the page has settled,
    // which is when it reads as an offer rather than a pop-up.
    const timer = setTimeout(() => setNudge(true), 2600);
    return () => clearTimeout(timer);
  }, []);

  const markSeen = useCallback(() => {
    setSeen(true);
    setNudge(false);
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* nothing to do; it will offer once more next time */
    }
  }, []);

  const openPanel = useCallback(() => {
    markSeen();
    setOpen(true);
    if (messages.length === 0) {
      say({
        role: 'bot',
        text: user
          ? 'বলুন, কী করতে চান? লিখতে পারেন, মাইক চেপে বলতেও পারেন।'
          : 'কী রান্না হচ্ছে, দাম কত, সাবস্ক্রিপশনে কী থাকে — যা জানতে চান জিজ্ঞেস করুন। অর্ডার করতে হলে শুধু একবার লগইন করে নিতে হবে।',
        chips: user ? HOME_CHIPS : GUEST_CHIPS,
      });
    }
  }, [markSeen, messages.length, say, user]);

  const closePanel = useCallback(() => {
    stopListening.current?.();
    stopListening.current = null;
    setListening(false);
    setOpen(false);
  }, []);

  /* -------------------------------------------------------------------- */
  /* Microphone                                                           */
  /* -------------------------------------------------------------------- */

  const toggleMic = useCallback(() => {
    if (listening) {
      stopListening.current?.();
      stopListening.current = null;
      setListening(false);
      return;
    }

    setMicNote('');
    setHeard('');
    setListening(true);

    stopListening.current = listenOnce({
      onPartial: setHeard,
      onFinal: (text) => {
        setListening(false);
        stopListening.current = null;
        void handle(text);
      },
      onError: (code) => {
        setListening(false);
        stopListening.current = null;
        // The language chain moved on; one more tap will use the next tag.
        setMicNote(code === 'retry-language' ? 'আবার মাইকে চাপ দিন' : micErrorMessage(code));
      },
      onEnd: () => {
        setListening(false);
        stopListening.current = null;
      },
    });
  }, [listening, handle]);

  /* -------------------------------------------------------------------- */
  /* Render                                                               */
  /* -------------------------------------------------------------------- */

  // Nothing renders until localStorage has been read, so the greeting does not
  // say "log in" to someone who is already logged in.
  if (!hydrated) return null;

  if (!open) {
    /*
     * The launcher, and the one thing it is allowed to say about itself.
     *
     * It sits above the mobile tab bar (`bottom-24`, which clears the bar's
     * ~60px plus the safe area) and in the corner on a desktop. The ring and
     * the bubble below only exist until the chat has been opened once — see
     * SEEN_KEY. `motion-safe:` keeps both still for anyone who has asked their
     * device for less movement.
     */
    return (
      <div className="fixed right-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-30 flex flex-col items-end gap-2 lg:right-6 lg:bottom-6">
        {nudge && (
          <div
            role="status"
            className="flex max-w-[15.5rem] items-start gap-2 rounded-2xl rounded-br-sm border border-ink-200 bg-white py-2.5 pr-2 pl-3.5 shadow-lift motion-safe:animate-rise"
          >
            <p className="text-[12.5px] leading-snug text-ink-700">
              কী রান্না হচ্ছে, দাম কত, অর্ডার — <span className="font-semibold text-ink-900">এখানে জিজ্ঞেস করুন</span>।
              লিখেও বলতে পারেন, মাইকে বলেও।
            </p>
            <button
              type="button"
              onClick={markSeen}
              aria-label="বন্ধ করুন"
              className="-mt-0.5 shrink-0 rounded-full p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
            >
              <X size={13} />
            </button>
          </div>
        )}

        <span className="relative flex">
          {!seen && (
            <span
              aria-hidden
              className="absolute inset-0 rounded-full border-2 border-brand-400 opacity-75 motion-safe:animate-ping"
            />
          )}
          <button
            type="button"
            onClick={openPanel}
            aria-label="সহকারীর সাথে কথা বলুন"
            className="relative flex min-h-12 items-center gap-2 rounded-full bg-brand-600 py-3 pr-5 pl-4 text-sm font-semibold text-white shadow-lift transition-colors hover:bg-brand-700"
          >
            <MessageCircle size={18} />
            সহকারী
            {!seen && (
              <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-bold">
                নতুন
              </span>
            )}
          </button>
        </span>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="FCS সহকারী"
      className="fixed inset-x-2 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex max-h-[76vh] flex-col overflow-hidden rounded-3xl border border-ink-200 bg-cream shadow-lift sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[25rem] sm:max-h-[36rem]"
    >
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-ink-200 bg-white px-4 py-3">
        <span className="grid size-9 place-items-center rounded-full bg-brand-100 text-brand-700">
          <MessageCircle size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink-900">FCS সহকারী</p>
          <p className="text-[11px] text-ink-500">বলে বা লিখে অর্ডার করুন</p>
        </div>

        <button
          type="button"
          onClick={closePanel}
          aria-label="বন্ধ করুন"
          className="grid size-9 place-items-center rounded-full border border-ink-200 text-ink-500 transition-colors hover:bg-ink-100"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
        {messages.map((message) => (
          <div key={message.id}>
            <div
              className={
                message.role === 'user'
                  ? 'ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-brand-600 px-3.5 py-2 text-sm text-white'
                  : 'w-fit max-w-[90%] rounded-2xl rounded-bl-sm bg-white px-3.5 py-2 text-sm whitespace-pre-line text-ink-800 shadow-card'
              }
            >
              {message.text}
            </div>

            {message.plan && <PlanCard plan={message.plan} />}

            {message.menu && (
              <MenuCard day={message.menu} busy={busy} onPick={pickPackage} />
            )}

            {message.cancelList && message.cancelList.length > 0 && (
              <div className="mt-2 space-y-2">
                {message.cancelList.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-ink-200 bg-white p-3 shadow-card"
                  >
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-ink-900">
                        {order.dayName} · {bengaliDate(order.date)}
                      </p>
                      <p className="truncate text-[11px] text-ink-600">
                        {order.meal ? mealFull(order.meal) : 'খাবার'}
                        {order.dish ? ` — ${order.dish}` : ''} · {taka(order.amount)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => askCancel(order)}
                      className="shrink-0 rounded-full border border-ink-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-800 transition-colors hover:border-red-300 hover:text-red-700"
                    >
                      বাতিল
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Only the newest question is live, like the review card. */}
            {message.confirmCancel && pendingCancel?.id === message.confirmCancel.id && (
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const order = message.confirmCancel;
                    if (order) void doCancel(order);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-red-700"
                >
                  <Check size={15} />
                  হ্যাঁ, বাতিল করুন
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingCancel(null);
                    say({ role: 'bot', text: 'ঠিক আছে, অর্ডারটা রেখে দিলাম।', chips: HOME_CHIPS });
                  }}
                  className="rounded-full border border-ink-200 bg-white px-4 py-2 text-[13px] font-medium text-ink-700 transition-colors hover:bg-ink-100"
                >
                  না, থাক
                </button>
              </div>
            )}

            {message.sub && (
              <SubCard
                info={message.sub.info}
                canSubscribe={message.sub.canSubscribe}
                onPick={startSubscribe}
              />
            )}

            {/* Only the newest form is live; an older one simply stops showing. */}
            {message.form && activeForm === message.id && (
              <SubForm
                pkg={message.form.pkg}
                firstTime={message.form.firstTime}
                amount={amount}
                onAmount={setAmount}
                payment={payment}
                onPayment={setPayment}
                busy={sending}
                error={formError}
                onSubmit={() => {
                  const form = message.form;
                  if (form) void submitSubscription(form.pkg, form.firstTime);
                }}
                onCancel={() => {
                  setActiveForm(null);
                  setFormError('');
                  say({ role: 'bot', text: 'ঠিক আছে, ফর্মটা বন্ধ করলাম।', chips: HOME_CHIPS });
                }}
              />
            )}

            {message.plan && pendingCard === message.id && (
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => void confirmOrder()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  <Check size={15} />
                  অর্ডার করুন
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingCard(null);
                    planRef.current = null;
                    say({ role: 'bot', text: 'ঠিক আছে, বাতিল করলাম।', chips: HOME_CHIPS });
                  }}
                  className="rounded-full border border-ink-200 bg-white px-4 py-2 text-[13px] font-medium text-ink-700 transition-colors hover:bg-ink-100"
                >
                  বাতিল
                </button>
              </div>
            )}

            {message.link && (
              <Link
                href={message.link.href}
                onClick={closePanel}
                className="mt-2 inline-block rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-[13px] font-semibold text-brand-700 transition-colors hover:bg-brand-100"
              >
                {message.link.label}
              </Link>
            )}

            {message.chips && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {message.chips.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => void handle(chip.send)}
                    className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[12px] font-medium text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {busy && (
          <p className="flex items-center gap-2 text-[12px] text-ink-500">
            <Loader2 size={14} className="animate-spin" />
            দেখছি…
          </p>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-ink-200 bg-white px-3 py-3">
        {(listening || heard || micNote) && (
          <p className="mb-2 px-1 text-[11px] text-ink-500">
            {listening ? (heard ? `শুনছি: ${heard}` : 'শুনছি…') : micNote || heard}
          </p>
        )}

        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handle(input);
            }}
            placeholder="লিখুন — যেমন: কাল রাতে"
            aria-label="সহকারীকে লিখুন"
            className="min-w-0 flex-1 rounded-full border border-ink-200 bg-cream px-4 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-400"
          />

          {micSupported() && (
            <button
              type="button"
              onClick={toggleMic}
              aria-label={listening ? 'শোনা বন্ধ করুন' : 'মাইকে বলুন'}
              aria-pressed={listening}
              className={`grid size-10 shrink-0 place-items-center rounded-full transition-colors ${
                listening
                  ? 'animate-pulse bg-brand-600 text-white'
                  : 'border border-ink-200 bg-white text-brand-700 hover:border-brand-300'
              }`}
            >
              <Mic size={18} />
            </button>
          )}

          <button
            type="button"
            onClick={() => void handle(input)}
            disabled={!input.trim() || busy}
            aria-label="পাঠান"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** The review card: what will be ordered, what it costs, what was left out. */
function PlanCard({ plan }: { plan: Plan }) {
  const dates = [...new Set(plan.lines.map((line) => line.date))];

  return (
    <div className="mt-2 rounded-2xl border border-ink-200 bg-white p-3 shadow-card">
      {dates.map((date) => (
        <div key={date} className="mb-2 last:mb-0">
          <p className="text-[11px] font-semibold tracking-wide text-ink-500">
            {weekdayOf(date)} · {bengaliDate(date)}
          </p>
          {plan.lines
            .filter((line) => line.date === date)
            .map((line) => (
              <div key={line.meal} className="flex items-baseline justify-between gap-3 py-0.5">
                <span className="min-w-0 text-[13px] text-ink-800">
                  <span className="font-medium">{mealFull(line.meal)}</span> — {line.dish}
                </span>
                <span className="shrink-0 text-[13px] font-semibold text-ink-900">
                  {taka(line.price)}
                </span>
              </div>
            ))}
        </div>
      ))}

      <div className="mt-2 space-y-0.5 border-t border-ink-200 pt-2 text-[13px]">
        <Row label="খাবার" value={taka(plan.foodTotal)} />
        {plan.deliveryTotal > 0 && <Row label="ডেলিভারি" value={taka(plan.deliveryTotal)} />}
        <div className="flex items-baseline justify-between pt-1 text-sm font-bold text-ink-900">
          <span>সর্বমোট</span>
          <span>{taka(plan.total)}</span>
        </div>
        <p className="pt-1 text-[11px] text-ink-500">
          {plan.pay === 'wallet' ? 'ওয়ালেট থেকে — ডেলিভারির পর কাটা হবে' : 'ক্যাশ অন ডেলিভারি'}
        </p>
      </div>

      {plan.skipped.length > 0 && (
        <ul className="mt-2 space-y-0.5 border-t border-ink-200 pt-2 text-[11px] text-ink-500">
          {plan.skipped.map((reason) => (
            <li key={reason}>বাদ পড়েছে: {reason}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-ink-600">
      <span>{label}</span>
      <span className="shrink-0">{value}</span>
    </div>
  );
}

/**
 * The packages, with what joining each one costs.
 *
 * The breakdown is only shown to a first-time joiner, because that is the only
 * account the food float and the deposit apply to — a returning customer owes
 * the fee alone, and showing them three lines they do not pay would be a lie
 * dressed as detail.
 */
/** One day's menu: what is cooked, and what this customer would pay for it. */
function MenuCard({
  day,
  busy,
  onPick,
}: {
  day: {
    iso: string;
    dayName: string;
    packageLabel: string;
    packageSlug: string;
    packages: PackageChoice[];
    rows: MenuLine[];
  };
  busy: boolean;
  onPick: (slug: string, iso: string) => void;
}) {
  return (
    <div className="mt-2 rounded-2xl border border-ink-200 bg-white p-3 shadow-card">
      <p className="text-[11px] font-semibold tracking-wide text-ink-500">
        {day.dayName} · {bengaliDate(day.iso)} · {day.packageLabel}
      </p>

      {/*
        The same choice the order form offers above its meal toggles: without a
        subscription any package's menu may be ordered from, so all of them are
        shown rather than just the cheapest.
      */}
      {day.packages.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {day.packages.map((pkg) => {
            const on = pkg.slug === day.packageSlug;
            return (
              <button
                key={pkg.slug}
                type="button"
                aria-pressed={on}
                disabled={busy || on}
                onClick={() => onPick(pkg.slug, day.iso)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-70 ${
                  on
                    ? 'border-brand-300 bg-brand-50 text-brand-800'
                    : 'border-ink-200 text-ink-600 hover:border-ink-300'
                }`}
              >
                {pkg.title}
              </button>
            );
          })}
        </div>
      )}
      <div className="mt-1.5 space-y-1">
        {day.rows.map((line) => (
          <div key={line.label} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 text-[13px] text-ink-800">
              <span className="font-medium">{line.label}</span>
              {line.price === null ? (
                <span className="text-ink-400"> — এখনো ঠিক হয়নি</span>
              ) : (
                <> — {line.dish}</>
              )}
            </span>
            {line.price !== null && (
              <span className="shrink-0 text-[13px] font-semibold text-ink-900">
                {taka(line.price)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SubCard({
  info,
  canSubscribe,
  onPick,
}: {
  info: SubscriptionInfo;
  canSubscribe: boolean;
  onPick: (pkg: PackageOption, firstTime: boolean) => void;
}) {
  return (
    <div className="mt-2 space-y-2">
      {info.packages.map((pkg) => (
        <div key={pkg.slug} className="rounded-2xl border border-ink-200 bg-white p-3 shadow-card">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-bold text-ink-900">{pkg.title}</p>
            <p className="shrink-0 text-sm font-bold text-ink-900">{taka(pkg.fee)}</p>
          </div>
          <p className="text-[11px] text-ink-500">
            {bn(pkg.duration)} দিনের সাবস্ক্রিপশন ফি · ফেরতযোগ্য নয়
          </p>

          {info.firstTime && (
            <div className="mt-2 space-y-0.5 border-t border-ink-200 pt-2 text-[12px]">
              <Row label="সাবস্ক্রিপশন ফি" value={taka(pkg.fee)} />
              <Row
                label={`${bn(JOINING_FLOAT_DAYS)} দিনের খাবার (ওয়ালেটে জমা থাকবে)`}
                value={taka(pkg.foodFloat)}
              />
              <Row label="বক্সের ডিপোজিট (ফেরতযোগ্য)" value={taka(pkg.deposit)} />
              <div className="flex items-baseline justify-between gap-3 pt-1 text-[13px] font-bold text-ink-900">
                <span>প্রথমবার পাঠাতে হবে</span>
                <span className="shrink-0">{taka(pkg.joining)}</span>
              </div>
            </div>
          )}

          {pkg.features.length > 0 && (
            <ul className="mt-2 space-y-0.5 border-t border-ink-200 pt-2 text-[11px] text-ink-600">
              {pkg.features.slice(0, 3).map((feature) => (
                <li key={feature} className="flex gap-1.5">
                  <Check size={13} className="mt-0.5 shrink-0 text-leaf-600" />
                  {feature}
                </li>
              ))}
            </ul>
          )}

          {canSubscribe &&
            (info.firstTime && pkg.menuMissing ? (
              <p className="mt-2 text-[11px] text-amber-700">
                এই প্যাকেজের সাপ্তাহিক মেনু এখনো যোগ করা হয়নি, তাই এখন নেওয়া যাচ্ছে না।
              </p>
            ) : (
              <button
                type="button"
                onClick={() => onPick(pkg, info.firstTime)}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand-700"
              >
                <Sparkles size={14} />
                এটা নিব
              </button>
            ))}
        </div>
      ))}
    </div>
  );
}

/**
 * The request form, inline in the conversation.
 *
 * `PaymentFields` is the same component the package cards and the wallet
 * top-up use, so the account number, the instructions and the transaction-id
 * rule are not restated here — one copy of "where to send money" is the whole
 * point of that file.
 */
function SubForm({
  pkg,
  firstTime,
  amount,
  onAmount,
  payment,
  onPayment,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  pkg: PackageOption;
  firstTime: boolean;
  amount: string;
  onAmount: (next: string) => void;
  payment: PaymentDetails;
  onPayment: (next: PaymentDetails) => void;
  busy: boolean;
  error: string;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const least = firstTime ? pkg.joining : pkg.fee;

  return (
    <div className="mt-2 rounded-2xl border border-brand-200 bg-white p-3 shadow-card">
      <p className="text-[12px] font-bold text-ink-900">{pkg.title} — সাবস্ক্রিপশন রিকোয়েস্ট</p>

      <div className="mt-3">
        <Field
          label="কত টাকা পাঠাচ্ছেন?"
          htmlFor="assistantJoiningAmount"
          required
          hint={`সর্বনিম্ন ${bn(least)} টাকা — বেশি পাঠালে বাকিটাও ওয়ালেটে জমা হবে।`}
        >
          <Input
            id="assistantJoiningAmount"
            type="number"
            inputMode="numeric"
            min={least}
            step={10}
            value={amount}
            onChange={(event) => onAmount(event.target.value)}
          />
        </Field>
      </div>

      <div className="mt-4">
        <PaymentFields amount={Number(amount) || 0} value={payment} onChange={onPayment} />
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[12px] leading-relaxed text-red-700">
          {error}
        </p>
      )}

      <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
        অ্যাডমিন ট্রানজেকশন আইডি মিলিয়ে দেখে অনুমোদন দিলে তবেই সাবস্ক্রিপশন চালু হবে। ভুল আইডি দিলে
        রিকোয়েস্ট বাতিল হয়ে যাবে।
      </p>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {busy ? 'পাঠানো হচ্ছে…' : 'রিকোয়েস্ট পাঠান'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-full border border-ink-200 bg-white px-4 py-2 text-[13px] font-medium text-ink-700 transition-colors hover:bg-ink-100 disabled:opacity-60"
        >
          বাতিল
        </button>
      </div>
    </div>
  );
}
