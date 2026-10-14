import { requireAdmin } from '@/server/auth';
import { body, fail, handler, ok } from '@/server/http';
import ManualOrder from '@/server/models/ManualOrder';
import Order from '@/server/models/Order';
import { deliverOrders } from '@/server/wallet';

const isIdList = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((id) => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id));

/**
 * Every move an admin makes. `preparing` and `out_for_delivery` are no longer
 * offered, but older rows may still hold them, so they count as confirmed.
 *
 * `returned` is a cash order the customer did not take. It can follow a
 * delivery too — "all delivered" is often pressed before the rider is back —
 * and a mistaken return can be put back to delivered.
 */
const FROM = {
  confirmed: ['pending'],
  delivered: ['confirmed', 'preparing', 'out_for_delivery', 'returned'],
  returned: ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'],
} as const;

type Step = keyof typeof FROM;

/**
 * POST /api/admin/orders/batch-status — admin
 *
 * Moves one order or a whole slot (a date and a meal). The client sends the
 * ids it is showing, so the slot is whatever the admin saw — no server-side
 * date maths to disagree with it.
 *
 * An order that changed between loading the page and pressing the button (a
 * customer cancelled it, say) no longer matches `FROM` and is left alone.
 */
export const POST = handler(async (req: Request) => {
  await requireAdmin(req);
  const { orderIds = [], manualIds = [], to } = (await body(req)) as {
    orderIds?: unknown;
    manualIds?: unknown;
    to?: unknown;
  };
  if (typeof to !== 'string' || !(to in FROM)) return fail('Invalid status', 400);
  if (!isIdList(orderIds) || !isIdList(manualIds)) return fail('Invalid order ids', 400);
  if (orderIds.length + manualIds.length === 0) return fail('No orders selected', 400);

  const step = to as Step;
  const match = {
    status: { $in: [...FROM[step]] },
    // Only cash can come back. A wallet order is charged on delivery and a
    // bKash one was paid up front; "returned" would keep that money while
    // dropping it from revenue.
    ...(step === 'returned' ? { paymentMethod: 'cash' as const } : {}),
  };
  const [orders, manual] = await Promise.all([
    // Delivering a wallet order is what charges it, so that path goes
    // through the wallet helper rather than a bare status update.
    step === 'delivered'
      ? deliverOrders(orderIds, FROM.delivered)
      : Order.updateMany({ _id: { $in: orderIds }, ...match }, { $set: { status: step } }).then(
          (r) => r.modifiedCount
        ),
    ManualOrder.updateMany({ _id: { $in: manualIds }, ...match }, { $set: { status: step } }).then(
      (r) => r.modifiedCount
    ),
  ]);

  return ok({ data: { updated: orders + manual } });
});
