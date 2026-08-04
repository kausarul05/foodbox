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
│   └── models/          11 Mongoose models.
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
already holds production data carried over from the old Express backend: 8 users,
40 orders, 21 weekly-menu rows, 20 zones, 2 packages, 3 subscriptions, 1 admin.

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

## Business rules

Delivery cut-offs live in `src/server/deadlines.ts` — do not re-implement them
inline:

- lunch — order by 8:30 AM same day
- dinner — order by 1:00 PM same day
- morning — order by 10:00 PM the day before
- kitchen closed on the 2nd and last Friday of every month
- admins can block individual dates (`BlockedDate`)

Wallet orders require an active subscription and sufficient balance; cancelling a
wallet order refunds it. Wallet top-ups are manual: the user submits a bKash/Nagad
transaction id, an admin approves it, and only then is the balance credited.

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
