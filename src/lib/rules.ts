/**
 * Money rules shared by the API and both UIs. Kept free of server imports so
 * client components can show the same numbers the server enforces.
 */

/**
 * Food-box security deposit held from a subscriber's wallet (src/server/deposit.ts).
 *
 * ৳100 until 4 Nov 2026. Changing it only affects holds taken from here on:
 * a refund or a deduction reads `User.depositAmount`, the figure that account
 * was actually held at, so nobody's existing hold moves under them. No account
 * was holding a box when this changed, so there are no accounts on ৳100.
 */
export const BOX_DEPOSIT = 200;

/** Smallest wallet top-up. */
export const MIN_RECHARGE = 50;

/**
 * Days of food a brand-new subscriber funds with their joining payment.
 *
 * Joining used to be two payments — the fee now, a top-up of at least ৳1,200
 * whenever the customer got round to it — so an approved subscriber could sit
 * there with an empty wallet and nothing to eat. It is one payment now: the
 * fee, this many days of meals, and the refundable box deposit. The flat
 * ৳1,200 first-top-up minimum is gone with it; every later top-up is just
 * MIN_RECHARGE.
 *
 * It was 7 until 4 Nov 2026, which put joining at ৳1,295 on বেসিক and ৳1,680
 * on স্ট্যান্ডার্ড — a lot to ask of someone who has not tasted the food yet.
 * Three days is the owner's call. It is only a float: the money stays the
 * customer's in their wallet, and they top up when it runs low.
 */
export const JOINING_FLOAT_DAYS = 3;

/** One weekly-menu row, as much of it as the money rules need. */
export interface MenuPrices {
  morning?: string;
  lunch?: string;
  dinner?: string;
  morningPrice?: number;
  lunchPrice?: number;
  dinnerPrice?: number;
}

/** Every priced meal on a package's menu, at wallet prices — one full cycle. */
function menuCycleTotal(menu: MenuPrices[]) {
  return menu.reduce(
    (sum, row) =>
      sum +
      (row.morning ? (row.morningPrice ?? 0) : 0) +
      (row.lunch ? (row.lunchPrice ?? 0) : 0) +
      (row.dinner ? (row.dinnerPrice ?? 0) : 0),
    0
  );
}

/**
 * JOINING_FLOAT_DAYS of food on a package's menu, at wallet prices.
 *
 * The menu holds one row per day, so this is the daily average times the float
 * — **not** the next three days. Friday lunch is ৳130 against ৳55 the rest of
 * the week, so charging the days that happen to come next would hand two people
 * who joined a day apart two different joining prices for the same thing. The
 * average is the same figure for everyone and stays right if the owner adds or
 * drops a day from the menu.
 *
 * A meal with no name is not on the menu that day and cannot be ordered, so it
 * is not counted — the same test Order.tsx uses before offering a meal. Wallet
 * prices, no COD surcharge: a subscriber pays from the wallet. Rounded up, so
 * the float covers the days rather than falling a taka short of them.
 */
export function joiningFoodTotal(menu: MenuPrices[]) {
  if (menu.length === 0) return 0;
  return Math.ceil((menuCycleTotal(menu) / menu.length) * JOINING_FLOAT_DAYS);
}

/**
 * The least a customer may send with their first subscription request.
 *
 * Only the fee is non-refundable. The food float becomes their wallet balance
 * on approval and the deposit is released when they return the box, so most of
 * this is still the customer's money.
 */
export function joiningMinimum(packagePrice: number, foodFloat: number) {
  return packagePrice + foodFloat + BOX_DEPOSIT;
}

/**
 * Cash on delivery costs this much more per meal than the menu price.
 *
 * The menu price is the wallet price. A meal paid in cash at the door — every
 * meal a non-subscriber orders, and anyone's guest meal — is charged this on
 * top. Admin-entered menu prices do not change: the surcharge is applied where
 * the meal is priced for the customer, so the order is stored and reported with
 * the amount they actually pay.
 */
export const COD_MEAL_SURCHARGE = 5;

/** What one meal costs the customer, given how they pay for it. */
export function mealPrice(menuPrice: number, pay: 'cash' | 'wallet') {
  // A meal with no price set is not a priced meal; a bare surcharge would read
  // as a ৳5 meal on the menu.
  if (pay === 'wallet' || menuPrice <= 0) return menuPrice;
  return menuPrice + COD_MEAL_SURCHARGE;
}
