/**
 * What the customer is actually asking about.
 *
 * `parse.ts` works out the *action* a sentence asks for — order this, show my
 * balance. This file works out the *subject of a question*, which is a
 * different thing and the one the assistant used to get wrong: "আমি কি চাইলে
 * সাবস্ক্রিপশনটা আপডেট করতে পারব?" mentions a subscription and the word
 * "করতে", so the action parser read it as "wants to subscribe" and the reply
 * reported their package status. Both halves were about subscriptions and the
 * answer still did not answer the question.
 *
 * So a topic, when one is found, is answered **before** any action is taken,
 * and a question with no topic is admitted to rather than guessed at. The list
 * is finite on purpose: every answer below is a rule that exists in this
 * codebase, and a parser that cannot find the rule should say so instead of
 * inventing one.
 */

export type Topic =
  // Subscriptions
  | 'sub-overview'
  | 'sub-price'
  | 'sub-update'
  | 'sub-cancel'
  | 'sub-expiry'
  | 'sub-renew'
  | 'sub-how'
  | 'sub-benefit'
  | 'sub-status'
  | 'sub-pause'
  // Money
  | 'deposit'
  | 'fee-refund'
  | 'wallet-howto'
  | 'payment-how'
  // Orders and delivery
  | 'deadline'
  | 'delivery-time'
  | 'delivery-charge'
  | 'closed-day'
  | 'order-cancel'
  | 'guest-meal'
  | 'zones'
  | 'contact'
  /** "can you use less oil" — a request about the cooking itself. */
  | 'special-request'
  // Ordering
  | 'order-no-sub'
  | 'order-how'
  | 'order-refund'
  | 'order-max'
  /** "how much have I ordered so far" — the customer's own total. */
  | 'order-spend'
  // The account itself
  | 'signup'
  | 'password'
  | 'profile-edit'
  | 'portion'
  /** "where are you located" — the service area. */
  | 'location';

/* Bengali is matched as a bare substring because it inflects by suffix;
 * romanised spellings carry \b. Same rule as parse.ts. */

const SUB = /সাবস্ক্রিপশন|সাবস্ক্রাইব|প্যাকেজ|\b(subscription|subscribe|package|packege|plan)\b/;

/** Changing what you already have. */
const UPDATE = /আপডেট|বদল|পরিবর্তন|পাল্টা|পালটা|পরিবর্তে|চেঞ্জ|আপগ্রেড|\b(update|change|chenge|bodl\w*|bodol\w*|bodal\w*|poriborton|palta\w*|upgrade|downgrade|switch|onno\s*package)\b/;

const CANCEL = /বাতিল|ক্যান্সেল|বন্ধ\s*কর|ছেড়ে\s*দ|\b(cancel\w*|batil|baatil|bondho\s*kor\w*|close\s*kor\w*|stop)\b/;

/** How long it runs, and when it ends. */
const EXPIRY = /মেয়াদ|কতদিন|কত\s*দিন|কবে\s*শেষ|শেষ\s*হবে|এক্সপায়ার|\b(meyad|meyaad|koto\s*din|kodin|kobe\s*shes\w*|kobe\s*ses\w*|expire\w*|expiry|validity|koto\s*mash)\b/;

const RENEW = /রিনিউ|নবায়ন|আবার\s*নিতে|আবার\s*নিব|পুনরায়|\b(renew\w*|abar\s*nib\w*|abar\s*nite|abar\s*korte|re\s*subscribe|extend)\b/;

/** "how do I …" — the process, not the price. */
const HOW = /কিভাবে|কীভাবে|কেমন\s*করে|কি\s*করে|প্রক্রিয়া|নিয়ম|\b(kivabe|kibhabe|kemon\s*kore|ki\s*kore|kemne|kmne|how|process|niyom|rules?)\b/;

const BENEFIT = /সুবিধা|লাভ|কি\s*পাব|কী\s*পাব|বাড়তি|অফার|\b(subidha|shubidha|labh|lav|ki\s*pabo|benefit|offer|extra|free)\b/;

/**
 * Theirs, not the service's in general.
 *
 * Kept apart from STATUS because "আমার" is rarely next to the thing it owns:
 * "আমার বর্তমান সাবস্ক্রিপশন কোনটা" puts two words in between, and the
 * adjacent-word pattern missed it entirely.
 */
const MINE = /আমার|নিজের|বর্তমান|কোনটা|কোন\s*টা|কোন\s*প্যাকেজ/;

/** Asking after their own standing, which is when a status line is the answer. */
const STATUS = /আমার\s*সাবস্ক্রিপশন|আমার\s*প্যাকেজ|চালু\s*আছে|আছে\s*কি|অবস্থা|স্ট্যাটাস|\b(amar\s*subscription|amar\s*package|chalu\s*ache|ache\s*ki|status|obostha|kon\s*package)\b/;

/** Skipping a day, not ending the subscription. */
const PAUSE = /বন্ধ\s*রাখ|খাব\s*না|খাবো\s*না|লাগবে\s*না|বাইরে\s*খাব|বাড়ি\s*যা|ছুটি|স্কিপ|\b(bondho\s*rakh\w*|khabo\s*na|khab\s*na|lagbe\s*na|bari\s*ja\w*|chuti|skip|off\s*rakh\w*|pause)\b/;

const DEPOSIT = /ডিপোজিট|জামানত|বক্স|বাক্স|\b(deposit|box|bax|jamanot)\b/;

const REFUND = /ফেরত|রিফান্ড|\b(ferot|ferot\w*|pherot|refund|fera\w*|money\s*back)\b/;

const WALLET = /ওয়ালেট|ব্যালান্স|ব্যালেন্স|\b(wallet|balance|ballance)\b/;

/** Putting money in, as opposed to asking what is in there. */
const TOPUP = /রিচার্জ|টাকা\s*ঢোকা|টাকা\s*দিব|টাকা\s*জমা|যোগ\s*কর|ভর|\b(recharge|rechareg|top\s*up|topup|add\s*(money|taka)|taka\s*add|add\s*kor\w*|taka\s*jomma|taka\s*dibo|jomma\s*kor\w*|fund)\b/;

const PAYMENT = /বিকাশ|নগদ|রকেট|ক্যাশ|পেমেন্ট|টাকা\s*পাঠা|কোথায়\s*পাঠা|কোন\s*নাম্বারে|\b(bkash|bikash|nagad|nogod|rocket|cash|payment|taka\s*patha\w*|send\s*money|kothay\s*pathabo)\b/;

const DEADLINE = /শেষ\s*সময়|কখন\s*পর্যন্ত|কত\s*টার|সময়\s*পার|ডেডলাইন|কাট\s*অফ|অর্ডার\s*কখন|\b(deadline|cut\s*off|cutoff|shes\s*somoy|ses\s*somoy|kokhon\s*porjonto|koto\s*tar\s*modhye|last\s*time)\b/;

const DELIVERY_TIME = /কখন\s*আসবে|কখন\s*দিবে|কখন\s*পাব|ডেলিভারি\s*কখন|কয়টার\s*সময়|\b(kokhon\s*asbe|kokhon\s*ashbe|kokhon\s*dibe|kokhon\s*pabo|delivery\s*(kokhon|time|somoy)|koytar)\b/;

const DELIVERY_CHARGE = /ডেলিভারি\s*চার্জ|ডেলিভারি\s*খরচ|ডেলিভারির\s*দাম|\b(delivery\s*(charge|cost|khoroch|koto|fee)|courier)\b/;

const CLOSED = /রান্নাঘর\s*বন্ধ|কবে\s*বন্ধ|কোন\s*দিন\s*বন্ধ|শুক্রবার\s*বন্ধ|বন্ধের\s*দিন|বন্ধ\s*থাকে|\b(kobe\s*bondho|kon\s*din\s*bondho|bondho\s*thake|closed|holiday|off\s*day)\b/;

const ORDER_WORD = /অর্ডার|\b(order\w*)\b/;

const GUEST = /গেস্ট|মেহমান|অতিথি|বাড়তি\s*খাবার|\b(guest|mehman|mehmaan|otithi|extra\s*(meal|khabar))\b/;

const ZONE = /জোন|এলাকা|কোন\s*কোন\s*জায়গ|কোথায়\s*ডেলিভারি|এরিয়া|\b(zone|area|elaka|kothay\s*delivery|delivery\s*(kothay|area)|location)\b/;

/**
 * A request about how the food is cooked, which is a different thing from
 * asking what is on the menu — and the menu pattern used to swallow it,
 * answering "can you use less oil?" with a list of today's dishes.
 */
const SPECIAL = /তেল\s*কম|কম\s*তেল|ঝাল\s*কম|কম\s*ঝাল|মসলা\s*কম|কম\s*মসলা|লবণ|নুন|মিষ্টি\s*কম|ডায়েট|এলার্জি|আলাদা\s*করে\s*রান্না|\b(tel\s*kom|kom\s*tel|jhal\s*kom|kom\s*jhal|moshla|mosla|lobon|less\s*oil|oil\s*kom|diet|spicy|allergy|allergic|special\s*(request|instruction))\b/;

const LOCATION = /লোকেশন|কোথায়\s*আপনা|আপনাদের\s*অফিস|অফিস\s*কোথায়|রান্নাঘর\s*কোথায়|কিচেন\s*কোথায়|কোন\s*শহর|কোন\s*জেলা|\b(location|office|kothay\s*apnara|apnader\s*office|kon\s*shohor|kitchen\s*kothay)\b/;

const CONTACT = /যোগাযোগ|নাম্বার|নম্বর|ফোন|হেল্প\s*লাইন|অভিযোগ|কল\s*কর|\b(contact|number|phone|mobile|call|helpline|complain\w*|support)\b/;

/** Ordering without a monthly plan — "সাবস্ক্রিপশন ছাড়া অর্ডার করা যায়?" */
const NO_SUB = /সাবস্ক্রিপশন\s*(না|ছাড়া|নেই|নাই)|প্যাকেজ\s*(না|ছাড়া|নেই|নাই)|ছাড়াও|\b(subscription\s*(na|chara|chhara|nai|nei)|package\s*(na|chara|chhara)|without\s*subscription|sub\s*chara)\b/;

/** A money word, for telling "how do I cancel" from "what happens to my money". */
const TAKA = /টাকা|পয়সা|দাম|মূল্য|খরচ|\b(taka|tk|poisa|money|amount)\b/;

/** More days than the chat will take at once. */
const LONG_RUN = /এক\s*মাস|পুরো\s*মাস|মাসের|মাস\s*ভর|সারা\s*মাস|১৫\s*দিন|\b(ek\s*mash|1\s*mash|mash\w*|month\w*|30\s*din|15\s*din|puro\s*mash)\b/;

/**
 * Their own running total, which is a different question from what anything
 * costs: "কত টাকার অর্ডার করেছি" wants a sum of their orders, not a price list.
 */
const SPENT = /কত টাকার|কতটাকার|কত টাকা অর্ডার|খরচ করেছি|খরচ হয়েছে|মোট কত|\b(koto\s*takar|kto\s*takar|koto\s*taka\s*(order|khoroch)|khoroch\s*korechi|total\s*(koto|kemon|order)|mot\s*koto|how\s*much\s*(spent|ordered))\b/;

const ACCOUNT = /একাউন্ট|অ্যাকাউন্ট|রেজিস্ট্রেশন|রেজিস্টার|সাইন\s*আপ|নতুন\s*আইডি|\b(account|register|registration|signup|sign\s*up|notun\s*id)\b/;

const PASSWORD = /পাসওয়ার্ড|পাসোয়ার্ড|পাসওয়ার্ড|\b(password|pass\s*word|pin\s*vule|login\s*korte\s*parchi\s*na)\b/;

/** The customer's own details, as opposed to their package. */
const PROFILE = /ঠিকানা|প্রোফাইল|নাম্বার|নম্বর|জোন|নাম\b|\b(address|profile|number|zone|name)\b/;

/** How much food is in one meal. */
const PORTION = /পরিমাণ|পরিমান|কতটুকু|কত\s*টুকু|কি\s*কি\s*থাকে|কী\s*কী\s*থাকে|প্লেট|কয়টা\s*পদ|কয়\s*পদ|কত\s*পদ|পদ\s*কয়|\b(poriman\w*|koto\s*tuku|kotuku|plate|portion|quantity|ki\s*ki\s*thake)\b/;

/**
 * Ordered, because real sentences hit more than one pattern and the earlier
 * rule is the more specific reading.
 *
 * "সাবস্ক্রিপশন বাতিল" has to beat the plain order-cancellation rule, and
 * "বন্ধ রাখব" (skip a day) has to beat both of them — someone who means to
 * miss a meal is not asking to lose their subscription.
 */
const RULES: { topic: Topic; test: (s: string) => boolean }[] = [
  // Subscription, most specific question first
  { topic: 'sub-pause', test: (s) => PAUSE.test(s) },
  // Before every other subscription rule: this one is about *not* having one.
  { topic: 'order-no-sub', test: (s) => NO_SUB.test(s) },
  { topic: 'sub-update', test: (s) => SUB.test(s) && UPDATE.test(s) },
  { topic: 'sub-cancel', test: (s) => SUB.test(s) && CANCEL.test(s) },
  { topic: 'sub-renew', test: (s) => SUB.test(s) && RENEW.test(s) },
  { topic: 'sub-expiry', test: (s) => SUB.test(s) && EXPIRY.test(s) },
  { topic: 'sub-expiry', test: (s) => EXPIRY.test(s) && !ORDER_WORD.test(s) },
  { topic: 'sub-how', test: (s) => SUB.test(s) && HOW.test(s) },
  { topic: 'sub-benefit', test: (s) => SUB.test(s) && BENEFIT.test(s) },
  // "আমার বর্তমান সাবস্ক্রিপশন কোনটা" is a question about theirs. A money word
  // takes it back out, so "আমার প্যাকেজ কত টাকা" stays a price question.
  {
    topic: 'sub-status',
    test: (s) => SUB.test(s) && (STATUS.test(s) || MINE.test(s)) && !TAKA.test(s),
  },

  // Money. The deposit and the fee both get asked about as "ফেরত পাব?"
  { topic: 'deposit', test: (s) => DEPOSIT.test(s) },
  // "অর্ডার বাতিল করলে টাকা?" is about the order's money, not the joining fee,
  // so it is settled before the fee rule sees the word "ফেরত".
  {
    topic: 'order-refund',
    test: (s) => ORDER_WORD.test(s) && (REFUND.test(s) || (CANCEL.test(s) && TAKA.test(s))),
  },
  { topic: 'fee-refund', test: (s) => REFUND.test(s) },
  { topic: 'wallet-howto', test: (s) => TOPUP.test(s) },
  { topic: 'payment-how', test: (s) => PAYMENT.test(s) && (HOW.test(s) || SUB.test(s) || WALLET.test(s)) },
  { topic: 'payment-how', test: (s) => PAYMENT.test(s) && !WALLET.test(s) },

  // Orders and delivery
  { topic: 'deadline', test: (s) => DEADLINE.test(s) },
  // Before the ordering rules: this one is about orders already placed.
  { topic: 'order-spend', test: (s) => SPENT.test(s) },
  { topic: 'order-max', test: (s) => LONG_RUN.test(s) },
  { topic: 'order-how', test: (s) => ORDER_WORD.test(s) && HOW.test(s) },
  { topic: 'delivery-time', test: (s) => DELIVERY_TIME.test(s) },
  { topic: 'delivery-charge', test: (s) => DELIVERY_CHARGE.test(s) },
  { topic: 'closed-day', test: (s) => CLOSED.test(s) },
  { topic: 'guest-meal', test: (s) => GUEST.test(s) },
  // Before the zone list: "আপনাদের লোকেশন কোথায়" asks where the service
  // is at all, which is a wider question than which zones it covers.
  { topic: 'location', test: (s) => LOCATION.test(s) },
  { topic: 'zones', test: (s) => ZONE.test(s) },
  { topic: 'order-cancel', test: (s) => CANCEL.test(s) },
  { topic: 'special-request', test: (s) => SPECIAL.test(s) },
  { topic: 'portion', test: (s) => PORTION.test(s) },

  // The account. "আমার অ্যাকাউন্টে কত টাকা" is a balance question, not a
  // sign-up question, so a money word takes this rule out of the running.
  { topic: 'password', test: (s) => PASSWORD.test(s) },
  { topic: 'signup', test: (s) => ACCOUNT.test(s) && !TAKA.test(s) },
  { topic: 'profile-edit', test: (s) => PROFILE.test(s) && UPDATE.test(s) },
  { topic: 'contact', test: (s) => CONTACT.test(s) },
];

/** The topic a sentence is about, or null when none of the rules fit. */
export function findTopic(s: string): Topic | null {
  return RULES.find((rule) => rule.test(s))?.topic ?? null;
}

/**
 * Whether this was phrased as a question at all.
 *
 * Used for one thing only: deciding between "I did not understand that" and
 * "I did not understand that *question*" — a customer who asked something and
 * got a mismatched answer is worse served than one who was told plainly that
 * the answer is not in here. `raw` is the untouched input, because `normalise`
 * strips the question mark.
 */
export function isQuestion(raw: string, s: string): boolean {
  if (/[?？]/.test(raw)) return true;
  /*
   * কে / কার / কয়টা are question words that have to be anchored to a space or
   * the ends of the string: Bengali has no \b in JavaScript, and কে as a bare
   * substring lives inside থেকে, একে, কেনা — every other sentence would
   * count as a question.
   */
  if (/(^|\s)(কে|কারা|কাকে|কার|কয়|কয়টা|কতো|কিসের|কীসের)($|\s)/.test(s)) return true;
  return /কি|কী|কিভাবে|কীভাবে|কেমন|কবে|কখন|কোথায়|কোন|কেন|কত|পারব|পারবো|পারি|নাকি|\b(ki|kih|kivabe|kibhabe|kemon|kemne|kobe|kokhon|kothay|kon|keno|kno|koto|parbo|parbe|parben|pari|can|could|how|when|where|why|what|which|is|does|do)\b/.test(
    s
  );
}
