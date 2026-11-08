/**
 * Bengali / Banglish intent parsing, with no model behind it.
 *
 * The domain is small enough that keywords are honestly better than an LLM
 * here: there are three meals, seven weekdays and two or three packages, so
 * what a customer can mean is nearly a closed set. A parser is free, instant,
 * and — unlike a model — cannot invent a dish or a price.
 *
 * Everything in this file is a pure function over a string, so it can be read
 * and corrected without running the app. Customers write Bengali script,
 * romanised Bengali, English, and all three in one sentence, so every table
 * below carries all three spellings.
 */

import { MAX_DAYS, type MealKey } from './config';
import { findTopic, isQuestion, type Topic } from './topics';

/**
 * What the customer wants *done*. Questions are not here — those are topics
 * (see topics.ts), and a topic is answered before an action is taken.
 */
export type Intent =
  | 'order'
  | 'wallet'
  | 'menu'
  | 'myorders'
  /** "subscribe korte chai" — wants the request form. */
  | 'subscribe'
  | 'help'
  | 'unknown';

/** Patterns can also match things that are topics rather than actions. */
type Matched = Intent | 'subscription';

export interface Parsed {
  intent: Intent;
  /** What a question was about, when the sentence asked something. */
  topic: Topic | null;
  /** Whether it was phrased as a question at all. */
  question: boolean;
  /** Which meals were named. Empty means the customer has not said yet. */
  meals: MealKey[];
  /** How many consecutive days, if a count was given — capped at MAX_DAYS. */
  dayCount: number | null;
  /** True when more days were asked for than the chat will take at once. */
  dayCountCapped: boolean;
  /** Days from today: 0 = today, 1 = tomorrow, 2 = the day after. */
  startOffset: number | null;
  /** A named weekday as JS getDay() returns it, if one was named. */
  weekday: number | null;
  /** A calendar date the customer named outright — "13 তারিখ", "13 নভেম্বর". */
  dateISO: string | null;
  /** True when the customer asked for a day that has already gone. */
  pastDay: boolean;
}

/** A phone keyboard still produces these even though the site shows Latin digits. */
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/**
 * Lower-cases, turns Bengali numerals into Latin ones and drops punctuation,
 * so every pattern below can assume single spaces and no stray marks. The
 * Bengali full stop (।) is punctuation too.
 */
export function normalise(input: string): string {
  return input
    .toLowerCase()
    /*
     * য় / ড় / ঢ় each have two spellings in Unicode — one codepoint, or the
     * base letter plus a nukta — and a keyboard may produce either. NFC folds
     * all three to the two-codepoint form (they are composition-excluded), so
     * every pattern in this file and in topics.ts can be written one way and
     * still match what the customer typed. Without this, "টাকা কোথায় পাঠাবো"
     * missed a pattern holding the other spelling of the same word.
     */
    .normalize('NFC')
    .replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)))
    .replace(/[।,.!?;:'"()[\]{}\-_/\\+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/*
 * Bengali script is matched as a bare substring and romanised spellings with
 * \b word boundaries. That asymmetry is deliberate: Bengali inflects by
 * suffix, so "রাত" catches রাতে / রাতের / রাতটা for free, while a loose Latin
 * match would find "rat" inside unrelated words.
 */

const MEAL_PATTERNS: { key: MealKey; re: RegExp }[] = [
  {
    key: 'morning',
    re: /সকাল|নাস্তা|ব্রেকফাস্ট|\b(shokal\w*|sokal\w*|shokal|nasta\w*|nashta\w*|breakfast|morning)\b/,
  },
  { key: 'lunch', re: /দুপুর|লাঞ্চ|\b(dupur\w*|dupor\w*|dopor\w*|lunch|noon|midday)\b/ },
  {
    key: 'dinner',
    re: /রাত|ডিনার|সন্ধ্যা|\b(rat|rate|ratre|rater|ratee|raat|raate|raatre|dinner|night|evening|shondha\w*|sondha\w*)\b/,
  },
];

/** "shob bela", "তিন বেলা", "all meals" — every slot in one phrase. */
const ALL_MEALS_RE = /সব\s*বেলা|তিন\s*বেলা|সারাদিন|\b(shob|sob|sb|tin|teen|all|full)\s*(bela|belar|time|meal|meals)\b/;

const WORD_NUMBERS: Record<string, number> = {
  ek: 1, ekta: 1, ekti: 1, একটা: 1, একটি: 1, এক: 1,
  du: 2, dui: 2, duita: 2, duto: 2, duti: 2, দুই: 2, দুইটা: 2, দুটো: 2, দুটি: 2,
  tin: 3, teen: 3, tinta: 3, tinti: 3, তিন: 3, তিনটা: 3, তিনটি: 3,
  char: 4, charta: 4, চার: 4, চারটা: 4,
  panch: 5, pach: 5, পাঁচ: 5, পাচ: 5,
  choy: 6, chhoy: 6, ছয়: 6,
  shat: 7, sat: 7, saat: 7, সাত: 7,
};

/**
 * "day", in the three ways it is written.
 *
 * The romanised half carries a trailing \b so "3 dinner" is not read as three
 * days; Bengali letters are not \w in JavaScript, so `দিন` cannot use one and
 * does not need one.
 */
const DAY_WORD = '(?:দিন|(?:din|diner|day|days)\\b)';

const WEEKDAY_PATTERNS: { re: RegExp; dow: number }[] = [
  { re: /রবিবার|\b(robibar|rabibar|robbar|sunday|sun)\b/, dow: 0 },
  { re: /সোমবার|\b(sombar|shombar|somobar|monday|mon)\b/, dow: 1 },
  { re: /মঙ্গলবার|\b(mongolbar|mangalbar|mongalbar|tuesday|tue)\b/, dow: 2 },
  { re: /বুধবার|\b(budhbar|budbar|budhobar|wednesday|wed)\b/, dow: 3 },
  { re: /বৃহস্পতিবার|\b(brihoshpotibar|brihospotibar|bishudbar|thursday|thu)\b/, dow: 4 },
  { re: /শুক্রবার|\b(shukrobar|sukrobar|shukkurbar|jummabar|friday|fri)\b/, dow: 5 },
  { re: /শনিবার|\b(shonibar|sonibar|shonibaar|saturday|sat)\b/, dow: 6 },
];

const YESTERDAY_RE = /গতকাল|\b(gotokal|gotkal|gotokaal|yesterday)\b/;
const TOMORROW_RE = /আগামীকাল|কাল|\b(kal|kaal|kalke|kalkey|agamikal|agamikaal|agami\s*kal|tomorrow)\b/;
const DAY_AFTER_RE = /পরশু|\b(porshu|poroshu|porsu|parshu|parsu)\b/;
const TODAY_RE = /আজ|\b(aj|aaj|ajke|ajkey|ajker|today)\b/;
/**
 * "আগামী 5 দিন" — a run of days that starts tomorrow.
 *
 * "আগামীকাল" is already a day of its own; this is the bare "আগামী" in front
 * of a count, which is how people ask for the next few days. Without it the
 * chat asked "which day do we start?" after the customer had already said.
 */
const COMING_RE = /আগামী|আগামি|সামনের|পরের|\b(agami|agamee|samner|shamner|porer|next|coming|from\s*tomorrow)\b/;

/**
 * Month names, in Bengali and English.
 *
 * Deliberately a local table rather than an import from src/lib/format.ts:
 * this file is kept free of app imports so it can be compiled and tested on
 * its own, and month names are spelling, not a business rule.
 */
const MONTHS: RegExp[] = [
  /জানুয়ারি|\b(january|jan)\b/,
  /ফেব্রুয়ারি|\b(february|feb)\b/,
  /মার্চ|\b(march|mar)\b/,
  /এপ্রিল|\b(april|apr)\b/,
  /(?:^|\s)মে(?:র|তে)?(?=$|\s)|\b(may)\b/,
  /জুন|\b(june|jun)\b/,
  /জুলাই|\b(july|jul)\b/,
  /আগস্ট|\b(august|aug)\b/,
  /সেপ্টেম্বর|\b(september|sept?)\b/,
  /অক্টোবর|\b(october|oct)\b/,
  /নভেম্বর|\b(november|nov)\b/,
  /ডিসেম্বর|\b(december|dec)\b/,
];

/** "13 তারিখ", "13 tarikhe" — a day of the month, spelled out as one. */
const DATE_WORD_RE = /(\d{1,2})\s*(?:তারিখ|\b(?:tarikh|tarikhe|tarikher|date)\b)/;

const WEEK_RE = /সপ্তাহ|সাপ্তাহিক|\b(saptah|shaptah|soptah|saptaho|week|weekly)\b/;

/**
 * Anything about the monthly plan: the overview, the price and the form all
 * start from this one word, and which of the three the customer wants is
 * decided by what else is in the sentence (see `parse` below).
 */
const SUBSCRIPTION_RE =
  /সাবস্ক্রিপশন|সাবস্ক্রাইব|প্যাকেজ|\b(subscription|subscribe|package|packege|join\w*|member\w*)\b/;

/** A money word — turns a subscription question into a price question. */
const MONEY_RE = /দাম|টাকা|খরচ|ফি|মূল্য|\b(dam|daam|taka|tk|price|cost|khoroch|khoroc|fee|rate|charge|koto)\b/;

/**
 * "which is cheapest" — a price question even with no package word in it, so
 * "সবচেয়ে কম দামে কত?" asked straight after the overview still lands here.
 */
const CHEAPEST_RE =
  /সবচেয়ে\s*কম|সবচেয়ে\s*সস্তা|কম\s*দাম|কম\s*খরচ|সর্বনিম্ন|কমে/;
const CHEAPEST_LATIN_RE =
  /\b(sobche\w*\s*kom|sob\s*theke\s*kom|sob\s*cheye\s*kom|kom\s*dam\w*|kom\s*price|kom\s*khoroc\w*|komdame|lowest|cheapest|cheap|minimum|low\s*price)\b/;

/** Wanting it, rather than asking about it — "subscribe korte chai". */
const WANT_RE =
  /চাই|নিব|নেব|নিতে|নিবো|করব|করবো|করতে|করে\s*দাও|চালু|শুরু|নতুন|কিনব|কিনতে|\b(chai|chaii|nibo|nebo|niba|nite|nibe|korbo|korb|korte|koro|kore\s*dao|kinbo|kinte|start|chalu|shuru|notun|new)\b/;

const INTENT_PATTERNS: { intent: Matched; re: RegExp }[] = [
  // Checked before `order`, because "amar order ache?" contains "order" but
  // asks to see orders rather than to place one.
  {
    intent: 'myorders',
    re: /আমার\s*অর্ডার|অর্ডার\s*আছে|অর্ডারগুলো|অর্ডার\s*চলছে|কতগুলো\s*অর্ডার|কত\s*গুলো\s*অর্ডার|কয়টা\s*অর্ডার|কত\s*অর্ডার|অর্ডারের\s*তালিকা|অর্ডার\s*দেখ|\b(amar\s*order\w*|order\s*ache|order\s*gulo|order\s*cholche|my\s*orders?|order\s*list|order\s*dekh\w*|koyta\s*order|kotogulo\s*order|koto\s*order)\b/,
  },
  {
    intent: 'wallet',
    re: /ওয়ালেট|ব্যালান্স|ব্যালেন্স|হিসাব|কত\s*টাকা|\b(wallet|balance|ballance|hisab|hishab|hisheb|koto\s*taka|kto\s*taka|amar\s*taka)\b/,
  },
  {
    intent: 'menu',
    // A bare "রান্না" used to be enough, which meant "রান্নায় তেল কম দেওয়া
    // যাবে?" was answered with a list of today's dishes. The word now has to
    // be part of a question about what is cooked.
    re: /মেনু|কি\s*আছে|কী\s*আছে|কি\s*খাবার|খাবার\s*কি|কি\s*রান্না|কী\s*রান্না|রান্না\s*কি|রান্না\s*কী|রান্না\s*হয়েছে|রান্না\s*হবে|\b(menu|ki\s*ache|ki\s*ranna|ranna\s*ki|ki\s*khabar|khabar\s*ki|khabar\s*ki\s*ache)\b/,
  },
  { intent: 'subscription', re: SUBSCRIPTION_RE },
  {
    intent: 'order',
    re: /অর্ডার|খাবার|খাব|খেতে|নিব|নেব|চাই|লাগবে|দাও|দিবেন|দেন|\b(order|khabar|khabo|khete|khabe|nibo|nebo|nite|chai|chaii|lagbe|dao|de|den|diben)\b/,
  },
  { intent: 'help', re: /সাহায্য|কি\s*করতে\s*পারো|\b(help|ki\s*koro|ki\s*korte\s*paro|how)\b/ },
];

function findMeals(s: string): MealKey[] {
  if (ALL_MEALS_RE.test(s)) return ['morning', 'lunch', 'dinner'];
  return MEAL_PATTERNS.filter((m) => m.re.test(s)).map((m) => m.key);
}

/**
 * How many consecutive days were asked for.
 *
 * Only counts a number that is actually attached to a day word: "3 din" is
 * three days, but the 3 in "3 ta ruti" is not. "ek saptah" and a bare
 * "saptah" both mean the whole week.
 */
function findDayCount(s: string): number | null {
  const digits = s.match(new RegExp(`(\\d{1,2})\\s*${DAY_WORD}`));
  if (digits) {
    const n = Number(digits[1]);
    if (n >= 1) return n;
  }

  for (const [word, value] of Object.entries(WORD_NUMBERS)) {
    const re = new RegExp(`(?:^|\\s)${word}\\s*${DAY_WORD}`);
    if (re.test(s)) return value;
  }

  if (WEEK_RE.test(s)) return MAX_DAYS;
  return null;
}

/** 'YYYY-MM-DD' from local parts, the way the whole app handles a calendar date. */
function isoOf(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

/**
 * A date the customer named outright: "13 তারিখ", "13 নভেম্বর", "nov 13".
 *
 * Always resolved forwards. A day of the month that has already passed means
 * next month, and a month that has already passed means next year — nobody
 * asks about a date behind them, and the order routes refuse one anyway.
 * `now` is a parameter so this can be tested without waiting for a date.
 */
function findDate(s: string, now: Date): string | null {
  const monthIndex = MONTHS.findIndex((re) => re.test(s));
  const named = DATE_WORD_RE.exec(s);

  let day: number | null = named ? Number(named[1]) : null;
  if (day === null && monthIndex !== -1) {
    // "13 নভেম্বর" or "নভেম্বর 13" — the only number in a month phrase
    // is the day. A count of days would have carried দিন with it.
    const loose = /(?:^|\s)(\d{1,2})(?:$|\s)/.exec(s);
    if (loose) day = Number(loose[1]);
  }
  if (day === null || day < 1 || day > 31) return null;

  const month = monthIndex === -1 ? now.getMonth() : monthIndex;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let candidate = new Date(now.getFullYear(), month, day);
  // A rolled-over date (31 February) is not a date the customer meant.
  if (candidate.getDate() !== day) return null;
  if (candidate.getTime() < today.getTime()) {
    candidate = new Date(now.getFullYear(), month + (monthIndex === -1 ? 1 : 12), day);
    if (candidate.getDate() !== day) return null;
  }
  return isoOf(candidate);
}

function findWeekday(s: string): number | null {
  const hit = WEEKDAY_PATTERNS.find((w) => w.re.test(s));
  return hit ? hit.dow : null;
}

/**
 * Which day the customer means to start on.
 *
 * Yesterday is checked first because "গতকাল" contains "কাল", and tomorrow
 * before today for the same reason in reverse ("আগামীকাল" would otherwise
 * never be reached). Returning `pastDay` rather than a negative offset keeps
 * the caller from having to know that a past date is impossible.
 */
function findStart(s: string): { offset: number | null; pastDay: boolean } {
  if (YESTERDAY_RE.test(s)) return { offset: null, pastDay: true };
  if (DAY_AFTER_RE.test(s)) return { offset: 2, pastDay: false };
  if (TOMORROW_RE.test(s)) return { offset: 1, pastDay: false };
  if (TODAY_RE.test(s)) return { offset: 0, pastDay: false };
  // "আগামী 5 দিনের অর্ডার" — no day is named, but the run starts tomorrow.
  if (COMING_RE.test(s)) return { offset: 1, pastDay: false };
  return { offset: null, pastDay: false };
}

/**
 * `now` is injectable so a date question can be tested against a fixed day.
 */
export function parse(input: string, now: Date = new Date()): Parsed {
  const s = normalise(input);

  const meals = findMeals(s);
  // Capped here rather than inside the finder, so the caller can say that it
  // capped — asking for 14 days and silently getting 7 is its own small lie.
  const askedDays = findDayCount(s);
  const dayCount = askedDays === null ? null : Math.min(askedDays, MAX_DAYS);
  const dayCountCapped = askedDays !== null && askedDays > MAX_DAYS;
  const { offset, pastDay } = findStart(s);
  const weekday = findWeekday(s);
  const dateISO = findDate(s, now);

  const matched = INTENT_PATTERNS.find((p) => p.re.test(s))?.intent ?? 'unknown';
  const asksCheapest = CHEAPEST_RE.test(s) || CHEAPEST_LATIN_RE.test(s);

  /*
   * The question comes first.
   *
   * A sentence that asks something is answered on its own terms, whatever
   * action words it also happens to contain — "সাবস্ক্রিপশনটা আপডেট করতে
   * পারব?" has "করতে" in it, and reading that as "wants to subscribe" is how
   * the bot used to reply with a package status to a question about changing
   * packages.
   */
  let topic = findTopic(s);
  const question = isQuestion(input, s);

  /*
   * A subscription word with nothing more specific around it still splits
   * three ways: a money word makes it a price question, a wanting word makes
   * it a request to subscribe, and on its own it asks for the overview.
   *
   * "কত টাকা" belongs to the wallet pattern, so "প্যাকেজ কত টাকা" matches
   * `wallet` before `subscription` is reached — with a package word in the
   * sentence it is plainly the package's price, not the customer's balance.
   * Only `wallet` and `unknown` are overruled, and only when no topic was
   * found, so "প্যাকেজ বাতিল করতে চাই" stays its own topic.
   */
  const aboutSubscription =
    matched === 'subscription' ||
    ((matched === 'wallet' || matched === 'unknown') && SUBSCRIPTION_RE.test(s));

  let wantsForm = false;
  if (!topic) {
    if (aboutSubscription) {
      if (asksCheapest || MONEY_RE.test(s)) topic = 'sub-price';
      else if (WANT_RE.test(s)) wantsForm = true;
      else topic = 'sub-overview';
    } else if (
      asksCheapest &&
      (matched === 'unknown' || matched === 'wallet') &&
      meals.length === 0 &&
      dayCount === null
    ) {
      // "সবচেয়ে কম দামে কত টাকা?" — no package word, and "কত টাকা" would
      // otherwise read as a balance question.
      topic = 'sub-price';
    }
  }

  /*
   * Naming a meal or a day is itself an order request — "kal ratre" has no
   * verb in it at all, and that is how people actually type. But a day named
   * inside a question stays that question, or "aj ki ranna" would be read as
   * an order for today.
   */
  const action: Intent = wantsForm
    ? 'subscribe'
    : matched === 'subscription'
      ? 'unknown'
      : matched;

  const namesDayOrMeal =
    meals.length > 0 ||
    dayCount !== null ||
    offset !== null ||
    weekday !== null ||
    dateISO !== null;

  /*
   * A question is not promoted to an order on the strength of a day word
   * alone: "এই সপ্তাহে কি নতুন কোনো আইটেম আসবে?" has "সপ্তাহ" in it and used to
   * open the ordering flow with "which meal?", which answers nothing. Naming a
   * meal is still enough, because "কাল রাতে?" really is an order.
   */
  const intent: Intent =
    !topic && action === 'unknown' && namesDayOrMeal && (!question || meals.length > 0)
      ? 'order'
      : action;

  return {
    intent,
    topic,
    question,
    meals,
    dayCount,
    dayCountCapped,
    startOffset: offset,
    weekday,
    dateISO,
    pastDay,
  };
}
