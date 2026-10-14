import Order from '@/server/models/Order';
import type { Types } from 'mongoose';

/**
 * Guest meals one account may order in a calendar month: at most 21 meals,
 * spread over at most 7 different days.
 *
 * Guest meals are cash on delivery and need no subscription, which makes them
 * the one order type with nothing else holding it back — a single account could
 * put the whole kitchen's capacity on one address. The cap is counted per
 * delivery month, because that is the month the customer is thinking of when
 * they pick the dates.
 */
export const GUEST_MEAL_MONTHLY_LIMIT = 21;
export const GUEST_DAYS_MONTHLY_LIMIT = 7;

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
export async function countGuestMeals(
  userId: Types.ObjectId | string,
  date: Date
): Promise<{ meals: number; days: string[] }> {
  const rows = await Order.find(
    {
      userId,
      orderType: 'guest',
      status: { $ne: 'cancelled' },
      deliveryDate: { $gte: startOfMonth(date), $lt: startOfNextMonth(date) },
    },
    { deliveryDate: 1 }
  ).lean();
  // deliveryDate is stored as midnight UTC of the day, so the ISO date is the day.
  const days = [...new Set(rows.map((r) => new Date(r.deliveryDate).toISOString().slice(0, 10)))].sort();
  return { meals: rows.length, days };
}

export async function guestMealQuota(userId: Types.ObjectId | string, date: Date) {
  const { meals, days } = await countGuestMeals(userId, date);
  return {
    limit: GUEST_MEAL_MONTHLY_LIMIT,
    used: meals,
    remaining: Math.max(GUEST_MEAL_MONTHLY_LIMIT - meals, 0),
    daysLimit: GUEST_DAYS_MONTHLY_LIMIT,
    /** YYYY-MM-DD days that already have a guest meal — another meal on one of these uses no new day. */
    usedDays: days,
    daysRemaining: Math.max(GUEST_DAYS_MONTHLY_LIMIT - days.length, 0),
  };
}
