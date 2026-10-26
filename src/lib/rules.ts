/**
 * Money rules shared by the API and both UIs. Kept free of server imports so
 * client components can show the same numbers the server enforces.
 */

/** Food-box security deposit held from a subscriber's wallet (src/server/deposit.ts). */
export const BOX_DEPOSIT = 100;

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
 */
export const JOINING_FLOAT_DAYS = 7;

/** One weekly-menu row, as much of it as the money rules need. */
export interface MenuPrices {
  morning?: string;
  lunch?: string;
  dinner?: string;
  morningPrice?: number;
  lunchPrice?: number;
  dinnerPrice?: number;
}

/**
 * What every meal on a package's weekly menu costs, at wallet prices.
 *
 * The menu holds one row per day, so this is JOINING_FLOAT_DAYS worth of all
 * three meals. A meal with no name is not on the menu that day and cannot be
 * ordered, so it is not counted — the same test Order.tsx uses before offering
 * a meal. Wallet prices, with no COD surcharge: a subscriber pays from the
 * wallet.
 */
export function weekMealTotal(menu: MenuPrices[]) {
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
 * The least a customer may send with their first subscription request.
 *
 * Only the fee is non-refundable. The food float becomes their wallet balance
 * on approval and the deposit is released when they return the box, so most of
 * this is still the customer's money.
 */
export function joiningMinimum(packagePrice: number, weekMeals: number) {
  return packagePrice + weekMeals + BOX_DEPOSIT;
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
