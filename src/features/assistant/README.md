# Voice assistant (trial)

A guided chat that takes an order by keyboard **or by voice**, with no AI
service behind it and no API key: the intent parsing is a Bengali/Banglish
keyword parser in `parse.ts`, and the microphone is the browser's own Web
Speech API. Nothing here costs money to run and nothing leaves the user's
browser except the same `/api/*` calls the order form already makes.

**Voice goes one way: in.** The assistant listens, and answers in text only.
It read its replies aloud with `speechSynthesis` until 8 Nov 2026, when the
owner asked for the speaker to go — Windows ships no Bengali voice, so a Latin
one sounded out Bengali letters, and the answers are cards, tables and prices
that do not read aloud usefully in any voice. `speech.ts` now holds the
recogniser alone; there is no speaker button and no mute state.

It was added on 7 Nov 2026 as something the owner could try privately before
deciding whether customers should see it. **It is off unless
`NEXT_PUBLIC_ASSISTANT=true`,** so a deploy without that variable ships the
site exactly as it was.

## Turning it on and off

```bash
# .env.local  (gitignored, so this stays on your machine only)
NEXT_PUBLIC_ASSISTANT=true
```

`NEXT_PUBLIC_*` is inlined at **build** time, so a running `npm run dev` has to
be restarted after changing it — a page reload is not enough.

## Removing it completely

Three steps, nothing else in the repository knows about this feature:

1. Delete this folder: `src/features/assistant/`
2. Delete the two assistant lines from `src/app/(site)/layout.tsx` — the
   `import` and the `<Assistant />` element.
3. Delete `NEXT_PUBLIC_ASSISTANT` from `.env.local`.

`npx tsc --noEmit` then passes with nothing left behind. No API route, no
database field, no dependency and no change to any existing component was
needed, which is the whole reason it is laid out this way.

## How a message is read

Three layers, in this order, and the order is the point:

1. **Is it a question about a rule?** `topics.ts` matches the *subject* of the
   question and `answers.ts` answers that subject. Nothing else runs.
2. **Is it an instruction?** `parse.ts` picks the action — order this, show my
   balance, open the subscribe form — and the flow in `AssistantWidget.tsx`
   carries it out.
3. **Neither.** It says so, and gives the support number.

Layer 1 exists because of a bug the owner caught on 7 Nov 2026: *"আমি কি
চাইলে সাবস্ক্রিপশনটা আপডেট করতে পারব?"* contains a package word and the verb
"করতে", so the action parser read it as "wants to subscribe" and the reply was
a line about which package was running. Both halves were about subscriptions
and the answer still did not answer the question. An action parser cannot fix
that by itself — what the sentence *asks* has to be decided before what it
asks *for*.

Two smaller cases from the same hour, both now tested:

- *"আপনাদের রান্নায় কি তেল কম দেওয়া যাবে?"* was answered with today's menu,
  because the menu pattern matched a bare "রান্না". That word now has to be
  part of a question about what is cooked, and the request itself has its own
  topic — answered honestly, since `specialInstructions` exists on the order
  payload but no form on the site collects it.
- *"এই সপ্তাহে কি নতুন কোনো আইটেম আসবে?"* opened the ordering flow, because
  "সপ্তাহ" means seven days. A day word inside an open question no longer
  promotes a sentence to an order; naming a meal still does.

Three more on 8 Nov 2026, all the same shape — a pattern that wanted two
words to sit next to each other:

- *"আমার বর্তমান সাবস্ক্রিপশন কোনটা"* got the overview, because the status
  pattern looked for "আমার" directly before "সাবস্ক্রিপশন" and two words sat in
  between. Ownership is now matched anywhere in the sentence, with a money word
  taking it back out so "আমার প্যাকেজ কত টাকা" stays a price question.
- *"আমার এখন পর্যন্ত কতগুলো অর্ডার চলছে"* opened the ordering flow, for the
  same reason — counting words next to "অর্ডার" now read as a request to see
  them. The count was wrong too: it came from `taken`, which exists to stop a
  meal being ordered twice and therefore includes meals already eaten, so the
  figure only ever grew. `Account.activeOrders` counts what is still running.
- *"আপনাদের লোকেশন কোথায়"* had no pattern at all. The service area is
  answered from the zone list, and the one thing this repository does not hold
  — a street address for the office or the kitchen — is admitted to.

**The honest fallback is a feature, not a shortfall.** There is no model here,
so the list of answerable subjects is finite and always will be. A customer who
asked something and got "press a button" has not been answered; one who is told
plainly that the answer is not in here, with the number of someone who knows,
has been. If an answer is ever wanted for a new kind of question, it is one
pattern in `topics.ts` and one case in `answers.ts` — and if it needs a figure,
read the figure, never type it.

## What it can and cannot do

Actions it carries out: "3 din ratre", "kal dupure", "আগামীকাল রাতে",
"shukrobar sokale", "ei saptah", "amar balance koto", "aj ki ranna",
"amar order dekhao", "subscribe korte chai".

Questions it answers, 33 subjects as of 8 Nov 2026: subscriptions (what it is,
price, cheapest, changing, cancelling, expiry, renewal, how to join, what you
get, your own status, skipping a day), money (box deposit, fee refund, wallet
top-up, where to send money), ordering (how, without a subscription, how much
you have ordered so far, cut-off times, cancelling, what happens to the money,
the 7-day limit, delivery times,
delivery charge, closed days, guest meals, zones, the service area, portions,
cooking requests), and the account (sign-up, forgotten password, changing your
details, support contact).

Deliberately not handled:

- **Guest meals** and **multiple packages in one order** — the full form at
  `/order` keeps those.
- **Cancelling** — it points at the dashboard instead. Cancelling releases
  money, and a keyword parser is the wrong thing to hand that to.
- **Changing or renewing a live subscription** — an account that already has
  one, pending or active, is told where it stands and sent to the dashboard.
  The route refuses a second request anyway.
- Free-form questions ("halka kichu ache?"). A parser cannot answer those; the
  bot says so rather than guessing.

## Where the authority lives

The assistant never decides money. It reads the menu, mirrors the cut-off rules
to avoid proposing something that will fail, and then calls `POST /api/orders`
with only the date, the meal, the zone and the package — exactly as the order
form does. **The server prices the meal, applies the delivery charge, enforces
the deadline, the blocked dates and the wallet.** If this parser ever
misunderstands, the worst it can do is propose the wrong meal on the review
card, which the customer sees before confirming.

That review card is on purpose: the bot fills the order in, a human presses the
button. Nothing is ordered from a voice command alone.

## Orders

Four things the chat does with an order, each of them a question the owner
actually asked for on 8 Nov 2026:

- **"আগামী 5 দিনের অর্ডার করে দাও"** — a bare "আগামী" in front of a count
  now means "starting tomorrow", so the only thing left to ask is which meals.
  Pick one and five days are priced in one card.
- **"13 তারিখে কি রান্না"** — dates are parsed outright ("13 তারিখ",
  "13 নভেম্বর", "nov 20") and always resolved forwards, so a day that has
  passed means next month. The menu for that day comes back as a card at the
  price this customer would pay, with a chip to order it.
- **An order for a named date.** `buildPlan` walks forward past a closed
  Friday so a request for three days yields three days — right for a run, but
  for one named date it would answer about a different day, so the reply says
  which date fell out and why before it shows the card.
- **Cancelling, from here.** `loadCancellableOrders` lists everything still
  running, each row with a button; pressing one asks for a yes, naming the
  meal, the date and the amount. **Two taps, never one** — same reason the
  ordering flow shows a review card. The cut-off is not guessed at: the chat
  lists every running order and `PUT /api/orders/:id/cancel` applies
  `checkCancelDeadline`, so a refusal is the server's own sentence.

"কত টাকার অর্ডার করেছি" is answered from three figures kept apart in
`Account.spend`: every order that was not cancelled, the part already
delivered and charged, and the cancelled count on its own. The delivered
figure uses the same definition as the admin revenue cards — food plus
delivery charge over delivered orders — so the chat and the dashboard cannot
tell the owner two different numbers.

## Where the answers come from

Every sentence in `answers.ts` traces to a rule in this repository, and the
numbers in them are read, not typed: the cut-offs and delivery windows from
`MEAL_SLOTS`, the deposit from `BOX_DEPOSIT`, the top-up floor from
`MIN_RECHARGE`, the cash surcharge from `COD_MEAL_SURCHARGE`, the account
numbers from `PAYMENT_CHANNELS`, the zone names from `/api/zones`, and the
prices and joining totals from `/api/packages` plus the package's own weekly
menu. Change a rule in those files and the answer changes with it.

Where the site cannot do a thing, the answer says so and names the support
number rather than inventing a path: there is no route that changes a
subscription's package, no UI that cancels one, and no field that carries a
cooking request.

## Subscriptions

Three questions, one branch (`case 'subscription' / 'price' / 'subscribe'`),
and the customer's own status decides the answer before the wording does:

- **Already subscribed, or waiting for approval** — it says so, with the end
  date, and links to the profile. It does not offer a second request, because
  `POST /api/subscriptions` refuses one.
- **"what is it" / "what does it cost" / "which is cheapest"** — the package
  cards, with the joining breakdown. The cheapest is simply the first package
  `/api/packages` returns, since that endpoint sorts by price; the fee comes
  from the package row and the food float from that package's own weekly menu
  through `joiningFoodTotal()` in `src/lib/rules.ts` — **the same function the
  route enforces with**, so the figure quoted and the figure accepted cannot
  drift apart. Nothing about price is written in this folder.
- **Wants to subscribe** — the form, inline in the chat. It reuses
  `components/ui/PaymentFields`, so the bKash number, the instructions and the
  transaction-id rule have one definition for the whole site.

The form sends `address` and `zone` empty on purpose: the route fills both from
the saved profile. Both are *required* on the Subscription model, so an account
with neither is asked to complete its profile first rather than being allowed
to pay for a request mongoose would reject.

The money is still the server's to judge: it re-reads the package price,
recomputes the joining minimum, decides what counts as the fee and what becomes
wallet credit, and an admin approves the payment by hand. The chat only carries
the amount and the transaction id the customer typed.
