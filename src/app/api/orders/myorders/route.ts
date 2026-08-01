import { requireUser } from '@/server/auth';
import { handler, ok } from '@/server/http';
import Order from '@/server/models/Order';

// GET /api/orders/myorders — user
export const GET = handler(async (req: Request) => {
  const user = await requireUser(req);
  const orders = await Order.find({ userId: user._id }).sort({ createdAt: -1 });
  return ok({ count: orders.length, data: orders });
});
