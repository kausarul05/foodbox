# FoodBox

Bengali meal-subscription and delivery service. **Customer site, admin panel, and
backend API all live in this one Next.js app.** There is no separate backend or
admin repo — if you are looking for one, it was merged in here.

## Layout

```
src/
├── app/
│   ├── (site)/          Customer site. Route group — the (site) segment is NOT in the URL.
│   │                    /  /order  /subscription  /guest-meal  /login  /signup  /dashboard/*
│   │                    layout.tsx is the sticky NoticeBar+Navbar header, Footer, Toaster.
│   ├── admin/           Admin panel — /admin/login, /admin/dashboard/*.
│   │                    Own layout (AuthProvider + Toaster), own API client in admin/lib/api.js.
│   ├── api/             Every backend endpoint, as route handlers.
│   ├── Common/          NoticeBar, Navbar, Footer, AuthModal (site chrome, not routes).
│   ├── Components/Home/ Home page sections (not routes) — see "Home page" below.
│   ├── globals.css      Design tokens (@theme) + custom utilities. Read before styling.
│   └── layout.tsx       Root layout: <html>/<body>/font/globals.css only.
├── server/              Backend internals — never imported by client components.
│   ├── db.ts            Cached Mongoose connection (required for serverless).
│   ├── http.ts          ok() / fail() / handler() / body() — the response envelope.
│   ├── auth.ts          generateToken, requireUser, requireAdmin, authorize.
│   ├── deadlines.ts     Ordering and cancellation cut-off rules.
│   ├── seed-data.ts     Rows used by POST /api/setup.
│   ├── backupData.ts    Every collection as flat tables — the source for both backups.
│   ├── excelBackup.ts   Renders those tables as one .xlsx.
│   ├── sheets.ts        Pushes those tables into the live Google Sheet.
│   └── models/          13 Mongoose models.
├── lib/
│   ├── api.ts           Customer API client. Switches mock ⇄ real on NEXT_PUBLIC_USE_MOCK.
│   ├── api.mock.ts      Mock implementation, backed by src/mock/data.ts.
│   ├── api.http.ts      Real implementation, fetches /api/*.
│   ├── format.ts        bn() / taka() / zoneLabel() / day helpers. All user-facing values go through it.
│   └── useSession.ts    useSession() / useHydrated() — the localStorage session, read safely.
├── mock/data.ts         Mock fixtures shaped exactly like the Mongoose models.
└── components/ui/       Shared UI: Button, Field (Input/Textarea/Select/PasswordInput),
                         Modal, PageHeader, SectionHeading, ZoneSelect.
```

## Design system

All colour, radius, shadow and animation values live in `@theme` in
`src/app/globals.css`. **Do not hard-code hex values in components** — use the
token scales:

- `brand-*` — saffron/orange, every primary action
- `leaf-*` — green, success / available / savings
- `ink-*` — warm neutral scale, all text and borders (`ink-900` is body text)
- `cream` — the page background
- `shadow-card` / `shadow-lift`, `animate-marquee` / `animate-rise`
- utilities: `container-page` (page gutter + max width), `no-scrollbar`, `bg-grain`

Type is Hind Siliguri (Bengali + Latin in one family), wired up in the root
layout as `--font-bangla`.

Every user-facing number goes through `src/lib/format.ts` so it renders in
Bengali numerals: `bn(1200)` → `১২০০`, `taka(3500)` → `৳ ৩,৫০০`. Mixing Latin
digits into Bengali copy is the fastest way to make the UI look unfinished.

## Home page

`(site)/page.tsx` is a landing page, not an app screen. Sections, in order:
Hero → HowItWorks → WeeklyMenu → Packages → Features → DeliveryInfo →
Testimonials → Faq → CtaBand.

Only `WeeklyMenu`, `Packages` and `DeliveryInfo` are client components — they
fetch through `@/lib/api`, so they honour mock mode. The rest are server
components with hard-coded copy.

The ordering form (`Components/Home/Order.tsx`, ~1,200 lines) is **not** on the
home page; it lives on `/order` only. Do not re-add it — a first-time visitor
should not meet a date/zone/meal form before learning what FoodBox is.

`Testimonials` uses placeholder reviews. There is no Review model or
`/api/reviews` route; add one before treating them as real.

## Database — live, and already populated

`.env.local` points at the **real Atlas database** (`fcs_meal_manager`), and it
holds live data. As of 20 Oct 2026: 4 users, 14 orders, 1 subscription, 1 wallet
top-up, 6 deposit events, 21 weekly-menu rows, 22 zones, 3 packages, 1 admin.
Counts move with real use — take a backup (below) rather than trusting this line.

**Do not run `POST /api/setup`.** It refuses when zones or packages already exist,
but it will re-seed if handed `{ "force": true }`. There is nothing to seed.

Every route was smoke-tested against this data and passes; both auth guards
correctly return 401. Admin login works with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Mock mode

`NEXT_PUBLIC_USE_MOCK=true` in `.env.local` makes the entire customer site run
off `src/mock/data.ts` with zero network calls and no database — useful for UI
work. **It is currently `false`, so the site reads and writes the live database.**
The admin panel does **not** honour this flag — it always calls the real API.

When you change a mock fixture, keep its shape matching the corresponding model
in `src/server/models/`. That is what makes the flag switch cleanly.

## Writing an API route

Every handler follows the same shape. `handler()` opens the DB connection and
turns thrown errors into the right status code.

```ts
import { requireAdmin } from '@/server/auth';
import { body, fail, handler, ok, type RouteContext } from '@/server/http';
import Package from '@/server/models/Package';

export const PUT = handler(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  await requireAdmin(req);              // or requireUser(req); throws 401
  const { id } = await ctx.params;      // params is a promise in Next 15+
  const updated = await Package.findByIdAndUpdate(id, await body(req), { new: true });
  if (!updated) return fail('Package not found', 404);
  return ok({ data: updated });
});
```

Response envelope is always `{ success: boolean, data?, message?, ... }`. Do not
invent a different shape — both clients depend on this one.

## Auth

JWTs in `localStorage`, sent as `Authorization: Bearer <token>`.
Customer token key is `userToken`; admin token key is `adminToken`. Both are
signed with the same `JWT_SECRET`; `requireUser` looks the id up in `User`,
`requireAdmin` in `Admin`.

**The `/api/admin/*` route guards are the real security boundary.** The
client-side redirect in `admin/dashboard/layout.tsx` is UX only — tokens live in
localStorage, so Next middleware cannot see them and does not gate `/admin`.
If you want a server-side gate on the pages themselves, that means moving the
admin token to an httpOnly cookie first.

Forgot password (`/forgot-password`): customers log in by phone and email is
optional, so an account *with* email gets a 6-digit code mailed through the
Gmail SMTP in `EMAIL_*` (`src/server/mail.ts`, rules in
`src/server/passwordReset.ts`); one *without* is sent to WhatsApp support, and
an admin issues a temporary password from Settings. Both cases answer
`channel: 'admin'` for unknown numbers, so the endpoint does not reveal who is
registered. `EMAIL_*` must be set on the host too.

## Admin alerts

`src/server/adminNotify.ts` mails the owner when a customer **requests a
subscription** (`POST /api/subscriptions`, new or re-request) or **submits a
wallet top-up** (`POST /api/wallet/recharge`). Both sit as `pending` until an
admin approves, so the alert is what tells them to go look.

Two rules, both load-bearing:

- `ADMIN_NOTIFY_EMAIL` is the destination. Unset = alerts are simply off; the
  routes behave exactly as before. It is separate from `ADMIN_EMAIL`, which is
  the admin's *login*, not a real inbox.
- **A mail failure must never fail or slow the request.** Routes call
  `notifyAdminLater()`, which hands the send to Next's `after()` so it runs once
  the response is already out. Gmail takes ~3.5s to accept a message; awaiting
  it made subscribing a 4.6s request. An unawaited promise is not the
  alternative — a serverless instance freezes the moment it responds, which
  kills the send. Inside, `notifyAdmin()` swallows every error and logs it, with
  an 8s SMTP timeout. Verified: subscribe and top-up both answer in ~320ms, the
  mail still arrives, and with SMTP down the request still returns 201.

The button in those emails is built by `baseUrlFrom(req)`, which follows the
host the customer actually used — localhost locally, the real domain in
production, with no code change. It reads `x-forwarded-host` / `x-forwarded-proto`
first (behind a proxy `req.url` is the *internal* address, and its protocol is
plain http even on an HTTPS site), then the Host header. `APP_URL` overrides it:
set that when the host forwards neither header, or to keep links on the custom
domain when someone arrives through a `*.vercel.app` preview URL.

**`nodemailer` must stay in `serverExternalPackages`** (next.config.ts). Next
bundles server dependencies by default and nodemailer resolves parts of itself
from disk at runtime, so bundled it throws on every send — silently, because the
error is swallowed. The tell is a subscription request returning in ~270ms when
a real send takes ~3.5s, with `[adminNotify] could not send` in the log.

Add new alerts by writing a builder next to `subscriptionAlert` /
`rechargeAlert` and passing it to `notifyAdminLater`. Never call `sendMail`
directly from a route — that loses both the error handling and the deferral.

Admin roles: `super_admin`, `manager`, `support`. Gate with
`authorize(await requireAdmin(req), 'super_admin')`.

## Database seeding

`POST /api/setup` and `POST /api/setup/admin` both require the `x-setup-secret`
header to match `SETUP_SECRET`, and return 503 when it is unset. Keep it unset in
production once seeding is done.

```bash
curl -X POST http://localhost:3000/api/setup -H "x-setup-secret: $SETUP_SECRET"
curl -X POST http://localhost:3000/api/setup/admin \
  -H "x-setup-secret: $SETUP_SECRET" -H "content-type: application/json" \
  -d '{"email":"admin@foodbox.com","password":"<at least 8 chars>"}'
```

## Backups

Three of them, three different jobs.

**1. Google Sheet — the live mirror.** `src/server/sheets.ts`. Every successful
write rewrites the owner's sheet a second or two after the response goes out, so
there is always an online spreadsheet of customers, orders, wallets and
deposits with nothing to press. Set up in `docs/google-sheets-setup.md`
(`GOOGLE_SHEETS_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`,
`GOOGLE_SERVICE_ACCOUNT_KEY`); unset = the feature is simply off.

Four things about it are load-bearing:

- **The trigger lives in `handler()`** (src/server/http.ts), not in each route.
  Any non-GET request that returns 2xx queues a sync, so routes added later are
  mirrored without being touched. `NO_MIRROR` there skips logins and the sync
  route itself — the latter would otherwise sync in a loop.
- **A sync must never fail or slow a request.** `syncSheetsLater()` hands the
  work to Next's `after()`, exactly as `notifyAdminLater` does and for the same
  reason: an unawaited promise dies when a serverless instance freezes on
  responding. Verified: a write answers in 145ms while its sync takes ~350ms
  afterwards, and with Google unreachable the write still returns 200 with
  `[sheets] sync failed` in the log.
- **Each tab is rewritten whole, not appended to.** Statuses change, wallets
  move, rows get cancelled. Matching rows by id on every write would drift the
  first time a match failed; a rewrite is right by construction. It also means
  **anything typed into those tabs by hand is lost on the next sync** — own
  calculations belong in a new tab that references them.
- **`valueInputOption` is RAW.** With USER_ENTERED, Sheets parses every string:
  `01868703130` becomes 1868703130 and loses its leading zero, and an address
  starting with `=` becomes a formula. RAW also means dates go as
  `yyyy-mm-dd` text, which sorts chronologically and cannot be misread
  month-first by a US-locale sheet.

A full sync is four HTTPS calls however many tabs there are: read the tab list,
create/grow/format tabs, clear values, write values — plus one more on a sync
that creates tabs, since column widths need the sheetIds that create call
returns. `POST
/api/admin/sheets/sync` forces one by hand (any admin role — no data goes back
to the caller; `GET` on it reports whether the mirror is on), and `vercel.json` runs
a daily safety-net sync at 20:00 UTC (2 AM Dhaka) for anything changed straight
in the database. That cron needs `CRON_SECRET` set; Vercel sends it back as a
bearer token, which is why `isCron()` is checked before `requireAdmin`.

**2. Excel download — the point-in-time copy.** `GET
/api/admin/backup/excel` (`src/server/excelBackup.ts`), button in the admin
Settings page, `super_admin` only — it is the one route that hands out every
customer's phone number, address and balance in a single file.

**3. JSON — the one a machine restores.** `node scripts/backup-db.mjs` writes
EJSON, every field, every index, to `backups/<timestamp>/` (gitignored: real
customer data). This is what to restore from, and it needs no running server.

Both spreadsheet backups render the tables defined once in
`src/server/backupData.ts`, so they can never disagree about the data. Three
decisions in there apply to both:

- **Numbers stay Latin digits** (1200, not ১২০০). This is the one place
  `src/lib/format.ts` must not be used: a Bengali numeral is text to a
  spreadsheet, and text cannot be summed, sorted or charted.
- **Dates are shifted +6h** before being written. A spreadsheet date is
  wall-clock with no time zone, so a UTC instant reads six hours early in Dhaka.
- **Password hashes are excluded** by name in the queries. These tables end up
  in files that get mailed around and in a sheet that gets shared; a bcrypt hash
  is a credential. Rebuilding from them means re-issuing passwords, which
  Settings can already do.

Neither spreadsheet is a restore format — nested documents are flattened and
zone ids are replaced by Bengali names.

The old no-op `POST /api/admin/backup` is gone. It answered "Database backup
completed successfully" while persisting nothing, which is worse than no route;
`settingsAPI.backupDatabase` went with it. `exceljs` is the only dependency
either path adds — the Sheets client is plain `fetch` plus the `jsonwebtoken`
already here, since a service-account token is just a signed JWT.

## Business rules

Delivery cut-offs live in `src/server/deadlines.ts` — do not re-implement them
inline:

- lunch — order by 8:30 AM same day
- dinner — order by 1:00 PM same day
- morning — order by 10:00 PM the day before
- kitchen closed on the 2nd and last Friday of every month
- admins can block individual dates (`BlockedDate`)

Wallet orders require an active subscription and enough *available* balance.
They are **charged on delivery, not when placed**: placing one reserves its price
(`available = balance − reserved`), delivering it deducts the money, cancelling it
just releases the reservation. `Order.walletCharged` is `false` while reserved,
`true` once charged, and missing on orders from before this rule (those were
charged up front, so they are never charged again and are refunded on cancel).
All of it lives in `src/server/wallet.ts` — never touch `walletBalance` for an
order anywhere else.

Food-box security deposit (`src/server/deposit.ts`, admin page
`/admin/dashboard/deposits`): a subscriber with a box has ৳100 of their wallet
*held* — `User.depositStatus: 'active'`, and `available` is also reduced by it.
Approving a subscription starts the hold; subscribers from before this rule get it
from the admin page. Box returned → `refund` releases the hold (no money moves);
lost or broken → `deduct` takes up to ৳100 out of `walletBalance`. A wallet short
of ৳100 still gets the hold, so `available` goes negative ("deposit due") and the
next top-up fills it first. Every hold/deduct/refund writes a `DepositEvent` — the
history. Wallet top-ups are manual: the user submits a bKash/Nagad
transaction id, an admin approves it, and only then is the balance credited.
Only a customer with an active subscription can top up (the recharge route
refuses everyone else).
A customer's first top-up (none approved yet) must be at least ৳1,200, after that ৳50 —
`src/lib/rules.ts`, enforced in `POST /api/wallet/recharge`.

Subscription fees (৳70 / ৳90 / ৳120 for 30 days) are non-refundable; the customer
confirms a popup before paying. Finance (`/api/admin/profit-stats`): revenue is
every delivered order (food + delivery charge, `orderRevenue`) **plus** the paid
subscription fees — the fee buys no food and is never refunded, so it is earned
on approval. Profit is that revenue minus expenses.

Two figures sit in the "আলাদা হিসাব" box and are deliberately **not** revenue:

- `customerRecharge` — approved wallet top-ups. That money is still the
  customer's until a meal is delivered, and the delivered order already counts
  its own price, so adding the top-up would count the same taka twice.
- `totalOrderAmount` — every order placed except cancelled ones, customer and
  admin manual alike, `returned` included (the food was cooked and sent). It is
  order volume, not earnings; `totalOrderAmount − orderRevenue` is what is still
  in the pipeline.

The cash-on-delivery figure is a slice *inside* `orderRevenue` (just the delivery
charges on cash orders), not an addition to it.

`GET /api/admin/stats` — the main dashboard's মোট রেভিনিউ — uses the same
definition over all time, so the two cards always agree. Change one and change
the other.

Menu days are Bengali strings in a fixed order — see `MENU_DAYS` in
`src/server/models/WeeklyMenu.ts`. UI copy throughout is Bengali.

**Zones have two names.** `Zone.name` is a lowercase English slug used as the
unique key (`mymensingh_sadar`); `Zone.nameBn` is the Bengali label
(`ময়মনসিংহ সদর`). Never render `name` — always `zoneLabel(zone)` from
`src/lib/format.ts`. Both mock and real data share this shape, so rendering
`name` puts a slug in the middle of Bengali copy in either mode.

`Order.zone` and `Subscription.zone` store the zone **id as a string**, not a
name — resolve it against `/api/zones` before display (see
`dashboard/orders/page.tsx`). `User.zone` is a real ObjectId, but older accounts
stored a plain name there, so profile code tests for a 24-char hex id first.

## Known gaps

- Google OAuth is disabled. `AuthModal.handleGoogleLogin` shows a toast; the old
  Passport routes were not ported.
- `admin/lib/api.js` still declares `transactionAPI.getAllTransactions`,
  `getTransactionById`, `getTransactionStats` and `authAPI.getAdminProfile`.
  No route backs them (none did in the Express backend either) and no page calls
  them. Add the routes or delete the methods before using them.
- The `Order.isWithinDeadline()` model method uses a 2:30 PM dinner cut-off,
  disagreeing with the 1:00 PM used everywhere else. Nothing calls it.

## Deploying

The API is part of this app, so it needs a Node server — **do not** add
`output: 'export'` to `next.config.ts`, it would delete every route in
`src/app/api` from the build.

Three things must be true on the host, and none of them come from `.env.local`:

1. `MONGODB_URI` and `JWT_SECRET` are set in the host's environment variables.
2. The host is allowed through the Atlas firewall — **Network Access → 0.0.0.0/0**.
   Serverless hosts have no fixed outbound IP, so an allow-list containing only
   a home IP works locally and times out in production. This is the usual cause
   of "the API works locally but not on the live site".
3. `NEXT_PUBLIC_USE_MOCK` is `false` or unset. It is inlined at **build** time,
   so changing it requires a redeploy, not just a restart.

`GET /api/health` reports all of the above — which env vars are missing, whether
the database answers, and a likely cause when it does not. It returns 503 when
unhealthy and never echoes a secret, so it is safe to hit on a live deployment.

## Commands

```bash
npm run dev      # http://localhost:3000  (site) and /admin
npm run build
npx tsc --noEmit # typecheck — run this before claiming a change works
npm run lint
```
