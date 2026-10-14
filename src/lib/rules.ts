/**
 * Money rules shared by the API and both UIs. Kept free of server imports so
 * client components can show the same numbers the server enforces.
 */

/** Food-box security deposit held from a subscriber's wallet (src/server/deposit.ts). */
export const BOX_DEPOSIT = 100;

/** Smallest wallet top-up. */
export const MIN_RECHARGE = 50;

/**
 * A customer's first top-up must be at least this much. "First" means they
 * have no approved top-up yet; after one is approved, MIN_RECHARGE applies.
 */
export const FIRST_RECHARGE_MIN = 1200;
