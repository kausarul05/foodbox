import { Types } from 'mongoose';
import Order, { type OrderStatus } from './models/Order';
import User from './models/User';

/**
 * Wallet orders are paid on delivery, not when they are placed.
 *
 * Placing an order *reserves* its price: the money stays in `walletBalance`
 * but cannot be spent on another order. Delivering it is what takes the money
 * out, one meal at a time. Cancelling releases the reservation, so there is
 * nothing to refund.
 *
 *   recharge ৳2000, order 7 days for ৳1300
 *     balance 2000 · reserved 1300 · available 700
 *   Monday's ৳50 breakfast is delivered
 *     balance 1950 · reserved 1250 · available 700
 *
 * `Order.walletCharged` tells the two eras apart:
 *   false      placed under this rule — reserved, not yet charged
 *   true       charged on delivery
 *   (missing)  placed before this rule existed, charged when ordered
 *
 * So only `walletCharged: false` is ever charged at delivery or counted as
 * reserved, and an older order is never charged twice. The field has no schema
 * default on purpose: Mongoose would apply it to those older rows on read.
 */

/** Statuses in which an order still holds money back. */
export const OPEN_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'out_for_delivery'];

export interface WalletSummary {
  /** Money actually in the wallet. */
  balance: number;
  /** Held by orders that are placed but not yet delivered. */
  reserved: number;
  /** What a new order can use: balance − reserved. */
  available: number;
  /** How many orders are holding `reserved`. */
  reservedOrders: number;
}

/** Reserved totals for many users at once, keyed by user id. */
export async function reservedByUser(userIds?: Types.ObjectId[]) {
  const rows = await Order.aggregate<{ _id: Types.ObjectId; reserved: number; count: number }>([
    {
      $match: {
        paymentMethod: 'wallet',
        walletCharged: false,
        status: { $in: OPEN_STATUSES },
        ...(userIds ? { userId: { $in: userIds } } : {}),
      },
    },
    { $group: { _id: '$userId', reserved: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), { reserved: r.reserved, count: r.count }]));
}

export async function walletSummary(userId: string | Types.ObjectId): Promise<WalletSummary> {
  const id = new Types.ObjectId(String(userId));
  const [user, reserved] = await Promise.all([User.findById(id).select('walletBalance'), reservedByUser([id])]);
  const balance = user?.walletBalance ?? 0;
  const held = reserved.get(String(id)) ?? { reserved: 0, count: 0 };
  return {
    balance,
    reserved: held.reserved,
    available: balance - held.reserved,
    reservedOrders: held.count,
  };
}

/**
 * Marks orders delivered and charges any wallet order that is still reserved.
 *
 * Each reserved wallet order is claimed with a conditional update before the
 * wallet is touched — `walletCharged: false` must still hold — so pressing
 * "delivered" twice, or two admins pressing it together, charges once.
 *
 * Returns how many orders were moved.
 */
export async function deliverOrders(ids: string[], from: readonly OrderStatus[]): Promise<number> {
  if (ids.length === 0) return 0;
  const match = { _id: { $in: ids }, status: { $in: [...from] } };

  const reserved = await Order.find({ ...match, paymentMethod: 'wallet', walletCharged: false }).select(
    '_id userId totalAmount'
  );

  let moved = 0;
  for (const order of reserved) {
    const claimed = await Order.findOneAndUpdate(
      { _id: order._id, status: { $in: [...from] }, walletCharged: false },
      { $set: { status: 'delivered', walletCharged: true, paymentStatus: 'paid' } }
    );
    if (!claimed) continue;
    await User.updateOne({ _id: order.userId }, { $inc: { walletBalance: -order.totalAmount } });
    moved++;
  }

  // Everything else: cash orders, and wallet orders already paid for.
  const rest = await Order.updateMany(
    { ...match, walletCharged: { $ne: false } },
    { $set: { status: 'delivered' } }
  );
  return moved + rest.modifiedCount;
}
