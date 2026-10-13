import { requireAdmin } from '@/server/auth';
import { body, fail, handler, ok } from '@/server/http';
import ManualOrder from '@/server/models/ManualOrder';
import Order from '@/server/models/Order';

const isIdList = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((id) => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id));

/**
 * The only two moves an admin makes: confirm a pending order, then mark it
 * delivered. `preparing` and `out_for_delivery` are no longer offered, but
 * older rows may still hold them, so they count as confirmed.
 */
const FROM = {
  confirmed: ['pending'],
  delivered: ['confirmed', 'preparing', 'out_for_delivery'],
} as const;

/**
 * POST /api/admin/orders/batch-status — admin
 *
 * Moves one order or a whole slot (a date and a meal) a step forward. The
 * client sends the ids it is showing, so the slot is whatever the admin saw —
 * no server-side date maths to disagree with it.
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
  if (to !== 'confirmed' && to !== 'delivered') return fail('Invalid status', 400);
  if (!isIdList(orderIds) || !isIdList(manualIds)) return fail('Invalid order ids', 400);
  if (orderIds.length + manualIds.length === 0) return fail('No orders selected', 400);

  const from = { $in: [...FROM[to]] };
  const [orders, manual] = await Promise.all([
    Order.updateMany({ _id: { $in: orderIds }, status: from }, { $set: { status: to } }),
    ManualOrder.updateMany({ _id: { $in: manualIds }, status: from }, { $set: { status: to } }),
  ]);

  return ok({ data: { updated: orders.modifiedCount + manual.modifiedCount } });
});
