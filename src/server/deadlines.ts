import type { DeliveryTime } from './models/Order';

/**
 * Ordering / cancellation cut-offs, extracted from the three copies that lived in
 * orderController (createOrder, checkDeadline, cancelOrder).
 *
 * Rules:
 *   - lunch   → order by 8:30 AM the same day
 *   - dinner  → order by 1:00 PM the same day
 *   - morning → order by 10:00 PM the day before
 *
 * NOTE: `Order.isWithinDeadline()` in the model uses 2:30 PM for dinner. Nothing
 * calls it, so these controller values are the ones that actually apply.
 */

export const LUNCH_DEADLINE_MINUTES = 8 * 60 + 30; // 08:30
export const DINNER_DEADLINE_MINUTES = 13 * 60; // 13:00
export const MORNING_DEADLINE_MINUTES = 22 * 60; // 22:00 previous day

export interface DeadlineResult {
  isWithinDeadline: boolean;
  message: string;
  deadlineTime: string;
}

function minutesNow(now: Date) {
  return now.getHours() * 60 + now.getMinutes();
}

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export function checkDeliveryDeadline(
  deliveryDate: Date,
  deliveryTime: DeliveryTime | undefined,
  now = new Date()
): DeadlineResult {
  const current = minutesNow(now);
  const isToday = sameDay(deliveryDate, now);
  const isTomorrow = sameDay(deliveryDate, new Date(now.getTime() + 24 * 60 * 60 * 1000));

  if (isToday) {
    switch (deliveryTime) {
      case 'lunch':
        return current > LUNCH_DEADLINE_MINUTES
          ? {
              isWithinDeadline: false,
              message: 'দুপুরের খাবারের জন্য আজ সকাল ৮:৩০ এর মধ্যে অর্ডার করতে হবে',
              deadlineTime: 'সকাল ৮:৩০ টা',
            }
          : { isWithinDeadline: true, message: 'দুপুরের খাবার অর্ডার করা যাবে', deadlineTime: 'সকাল ৮:৩০ টা' };

      case 'dinner':
        return current > DINNER_DEADLINE_MINUTES
          ? {
              isWithinDeadline: false,
              message: 'রাতের খাবারের জন্য আজ দুপুর ১:০০ টার মধ্যে অর্ডার করতে হবে',
              deadlineTime: 'দুপুর ১:০০ টা',
            }
          : { isWithinDeadline: true, message: 'রাতের খাবার অর্ডার করা যাবে', deadlineTime: 'দুপুর ১:০০ টা' };

      case 'morning':
        return {
          isWithinDeadline: false,
          message: 'সকালের খাবারের জন্য আগের দিন রাত ১০টার মধ্যে অর্ডার করতে হবে',
          deadlineTime: 'রাত ১০:০০ টা (আগের দিন)',
        };
    }
  } else if (isTomorrow && deliveryTime === 'morning') {
    return current > MORNING_DEADLINE_MINUTES
      ? {
          isWithinDeadline: false,
          message: 'সকালের খাবারের জন্য আজ রাত ১০:০০ টার মধ্যে অর্ডার করতে হবে',
          deadlineTime: 'রাত ১০:০০ টা',
        }
      : {
          isWithinDeadline: true,
          message: 'সকালের খাবার অর্ডার করা যাবে',
          deadlineTime: 'রাত ১০:০০ টা (আগের দিন)',
        };
  }

  return { isWithinDeadline: true, message: '', deadlineTime: '' };
}

/** Cancellation shares the ordering cut-offs, with cancel-specific wording. */
export function checkCancelDeadline(
  deliveryDate: Date,
  deliveryTime: DeliveryTime | undefined,
  now = new Date()
): { canCancel: boolean; message: string } {
  const current = minutesNow(now);

  if (sameDay(deliveryDate, now)) {
    switch (deliveryTime) {
      case 'lunch':
        if (current > LUNCH_DEADLINE_MINUTES) {
          return {
            canCancel: false,
            message: 'দুপুরের খাবার বাতিলের সময় পার হয়ে গেছে (সকাল ৮:৩০ এর মধ্যে বাতিল করতে হবে)',
          };
        }
        break;
      case 'dinner':
        if (current > DINNER_DEADLINE_MINUTES) {
          return {
            canCancel: false,
            message: 'রাতের খাবার বাতিলের সময় পার হয়ে গেছে (দুপুর ১:০০ টার মধ্যে বাতিল করতে হবে)',
          };
        }
        break;
      case 'morning':
        return {
          canCancel: false,
          message: 'সকালের খাবার আজকের জন্য বাতিল করা যাবে না (আগের দিন রাত ১০টার মধ্যে বাতিল করতে হবে)',
        };
    }
  } else if (
    sameDay(deliveryDate, new Date(now.getTime() + 24 * 60 * 60 * 1000)) &&
    deliveryTime === 'morning' &&
    current > MORNING_DEADLINE_MINUTES
  ) {
    return {
      canCancel: false,
      message: 'সকালের খাবার বাতিলের সময় পার হয়ে গেছে (রাত ১০:০০ টার মধ্যে বাতিল করতে হবে)',
    };
  }

  return { canCancel: true, message: '' };
}

/** The kitchen closes on the 2nd and last Friday of every month. */
export function isClosedFriday(date: Date): boolean {
  const year = date.getFullYear();
  const month = date.getMonth();
  const fridays: number[] = [];

  for (let day = 1; day <= 31; day++) {
    const d = new Date(year, month, day);
    if (d.getMonth() !== month) break;
    if (d.getDay() === 5) fridays.push(d.getDate());
  }

  return date.getDate() === fridays[1] || date.getDate() === fridays[fridays.length - 1];
}
