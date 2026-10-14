import { Types } from 'mongoose';
import DepositEvent from './models/DepositEvent';
import User, { type DepositStatus } from './models/User';

/**
 * Food-box security deposit.
 *
 * Every subscriber's meals come in a FoodBox box. While they have one, ৳200 of
 * their wallet is *held* — it stays in `walletBalance` but cannot be spent on
 * orders (src/server/wallet.ts subtracts it from `available`).
 *
 *   hold    box handed over: status → active, ৳200 held. Done automatically
 *           when a subscription is approved, or by an admin for subscribers
 *           who already had a box before this existed.
 *   refund  box came back fine: status → refunded, hold released. No money
 *           moves — it never left the wallet; it is simply spendable again.
 *   deduct  box lost or broken: status → deducted, the amount (৳200 unless
 *           the admin says less) leaves the wallet; anything held beyond that
 *           is released.
 *
 * A wallet with less than ৳200 still gets the hold. `available` then goes
 * negative, which is the "deposit due" state: the next top-up fills the
 * deposit before any of it can be spent on orders. A deduction from a wallet
 * that short can take the balance below zero, which reads as money owed.
 *
 * Each change is one conditional update on the user document, so two admins
 * pressing the same button at once act once; and every change writes a
 * DepositEvent, which is the history the admin panel shows.
 */

export const BOX_DEPOSIT = 200;

export interface DepositSummary {
  status: DepositStatus;
  /** Held while active — normally BOX_DEPOSIT, otherwise 0. */
  required: number;
  /** How much of `required` the wallet actually covers right now. */
  frozen: number;
  /** `required − frozen`: what the next top-up has to fill first. */
  due: number;
}

export function depositOf(user: { depositStatus?: DepositStatus; depositAmount?: number } | null | undefined) {
  const status: DepositStatus = user?.depositStatus ?? 'none';
  return { status, held: status === 'active' ? (user?.depositAmount ?? BOX_DEPOSIT) : 0 };
}

/**
 * Splits a held deposit into the part the wallet covers and the part still due.
 * Orders placed earlier have the first claim on the balance.
 */
export function summariseDeposit(
  user: { depositStatus?: DepositStatus; depositAmount?: number } | null | undefined,
  balance: number,
  reserved: number
): DepositSummary {
  const { status, held } = depositOf(user);
  const frozen = Math.min(held, Math.max(balance - reserved, 0));
  return { status, required: held, frozen, due: held - frozen };
}

interface Actor {
  id?: Types.ObjectId | string;
  name: string;
}

async function record(
  user: { _id: Types.ObjectId; fullName: string; phoneNumber?: string },
  type: 'hold' | 'deduct' | 'refund',
  amount: number,
  by: Actor,
  reason?: string
) {
  await DepositEvent.create({
    userId: user._id,
    userName: user.fullName,
    phoneNumber: user.phoneNumber ?? '',
    type,
    amount,
    reason: reason?.trim() || undefined,
    byAdminId: by.id,
    byAdminName: by.name,
  });
}

export type DepositResult = { ok: true; amount: number } | { ok: false; message: string };

/** Hand over a box: start holding the deposit. No-op if one is already held. */
export async function holdDeposit(userId: Types.ObjectId | string, by: Actor, reason?: string): Promise<DepositResult> {
  const user = await User.findOneAndUpdate(
    { _id: userId, depositStatus: { $ne: 'active' } },
    { $set: { depositStatus: 'active', depositAmount: BOX_DEPOSIT } },
    { new: true }
  );
  if (!user) {
    const exists = await User.exists({ _id: userId });
    return { ok: false, message: exists ? 'এই গ্রাহকের ডিপোজিট আগে থেকেই নেওয়া আছে' : 'গ্রাহক পাওয়া যায়নি' };
  }
  // A server still holding the User schema from before deposits existed (a dev
  // server not restarted) drops these fields without a word. Writing the
  // history line anyway would claim a hold that never happened.
  if (user.depositStatus !== 'active') {
    throw new Error('Server is running an outdated User model — restart it and try again');
  }
  await record(user, 'hold', BOX_DEPOSIT, by, reason);
  return { ok: true, amount: BOX_DEPOSIT };
}

/** Box returned in good shape: release the hold. */
export async function refundDeposit(userId: Types.ObjectId | string, by: Actor, reason?: string): Promise<DepositResult> {
  const before = await User.findOneAndUpdate(
    { _id: userId, depositStatus: 'active' },
    { $set: { depositStatus: 'refunded', depositAmount: 0 } },
    { new: false }
  );
  if (!before) return { ok: false, message: 'এই গ্রাহকের কোনো চালু ডিপোজিট নেই' };
  const amount = before.depositAmount ?? BOX_DEPOSIT;
  await record(before, 'refund', amount, by, reason);
  return { ok: true, amount };
}

/** Box lost or broken: take `amount` (default the whole deposit) out of the wallet. */
export async function deductDeposit(
  userId: Types.ObjectId | string,
  by: Actor,
  reason: string,
  amount?: number
): Promise<DepositResult> {
  if (!reason?.trim()) return { ok: false, message: 'কাটার কারণ লিখুন' };

  const current = await User.findById(userId).select('depositStatus depositAmount');
  const { status, held } = depositOf(current);
  if (!current) return { ok: false, message: 'গ্রাহক পাওয়া যায়নি' };
  if (status !== 'active') return { ok: false, message: 'এই গ্রাহকের কোনো চালু ডিপোজিট নেই' };

  const take = amount === undefined ? held : Math.round(amount);
  if (!Number.isFinite(take) || take <= 0 || take > held) {
    return { ok: false, message: `কাটার পরিমাণ ১ থেকে ${held} টাকার মধ্যে হতে হবে` };
  }

  // Conditional on the deposit still being exactly what was just read, so a
  // refund or a second deduction in between makes this one a no-op.
  const before = await User.findOneAndUpdate(
    { _id: userId, depositStatus: 'active', depositAmount: current.depositAmount },
    { $set: { depositStatus: 'deducted', depositAmount: 0 }, $inc: { walletBalance: -take } },
    { new: false }
  );
  if (!before) return { ok: false, message: 'ডিপোজিট এইমাত্র বদলেছে, পাতা রিফ্রেশ করে আবার দেখুন' };
  await record(before, 'deduct', take, by, reason);
  return { ok: true, amount: take };
}
