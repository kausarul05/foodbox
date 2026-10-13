import Order from '@/server/models/Order';
import type { Types } from 'mongoose';

/**
 * How many guest meals one account may order in a calendar month.
 *
 * Guest meals are cash on delivery and need no subscription, which makes them
 * the one order type with nothing else holding it back — a single account could
 * put the whole kitchen's capacity on one address. The cap is counted per
 * delivery month, because that is the month the customer is thinking of when
 * they pick the dates.
 */
export const GUEST_MEAL_MONTHLY_LIMIT = 30;

/** First instant of the month `date` falls in, local time. */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

/** First instant of the following month, local time. */
export function startOfNextMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
}

/**
 * Guest meals already booked by this user for the month containing `date`.
 *
 * Cancelled orders do not count — a cancelled meal was never cooked, so holding
 * it against the quota would punish the customer twice.
 */
export async function countGuestMeals(userId: Types.ObjectId | string, date: Date): Promise<number> {
  return Order.countDocuments({
    userId,
    orderType: 'guest',
    status: { $ne: 'cancelled' },
    deliveryDate: { $gte: startOfMonth(date), $lt: startOfNextMonth(date) },
  });
}

export async function guestMealQuota(userId: Types.ObjectId | string, date: Date) {
  const used = await countGuestMeals(userId, date);
  return {
    limit: GUEST_MEAL_MONTHLY_LIMIT,
    used,
    remaining: Math.max(GUEST_MEAL_MONTHLY_LIMIT - used, 0),
  };
}
