import { requireUser } from '@/server/auth';
import { checkCancelDeadline } from '@/server/deadlines';
import { body, fail, handler, ok, type RouteContext } from '@/server/http';
import Order from '@/server/models/Order';
import User from '@/server/models/User';

// PUT /api/orders/:id/cancel — user
export const PUT = handler(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  const authUser = await requireUser(req);
  const { id } = await ctx.params;
  const { reason } = await body(req);

  const order = await Order.findById(id);
  if (!order) return fail('Order not found', 404);

  if (order.status !== 'pending' && order.status !== 'confirmed') {
    return fail('অর্ডারটি এই মুহূর্তে বাতিল করা যাচ্ছে না', 400);
  }

  const { canCancel, message } = checkCancelDeadline(
    new Date(order.deliveryDate),
    order.deliveryTime
  );
  if (!canCancel) return fail(message, 400, { deadline: true });

  order.status = 'cancelled';
  order.cancelledBy = authUser.role === 'admin' ? 'admin' : 'user';
  order.cancellationReason = reason;

  // Wallet orders are refunded to the balance.
  if (order.paymentMethod === 'wallet') {
    const owner = await User.findById(order.userId);
    if (owner) {
      owner.walletBalance += order.totalAmount;
      await owner.save();
    }
  }

  const updated = await order.save();
  return ok({ data: updated, message: 'অর্ডার বাতিল করা হয়েছে' });
});
