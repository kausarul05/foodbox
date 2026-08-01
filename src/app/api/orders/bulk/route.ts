import { requireUser } from '@/server/auth';
import { body, fail, handler, ok, type JsonBody } from '@/server/http';
import Order from '@/server/models/Order';
import User from '@/server/models/User';

// POST /api/orders/bulk — user; used when a subscription covers a date range
export const POST = handler(async (req: Request) => {
  const authUser = await requireUser(req);
  const { orders = [] } = await body<{ orders: JsonBody[] }>(req);

  const user = await User.findById(authUser._id);
  if (!user) return fail('User not found', 404);

  const created = [];
  for (const orderData of orders) {
    created.push(
      await Order.create({
        userId: authUser._id,
        userName: user.fullName,
        phoneNumber: user.phoneNumber,
        package: orderData.package || 'N/A',
        items: orderData.items,
        totalAmount: 0,
        deliveryCharge: 0,
        paymentMethod: 'subscription',
        paymentStatus: 'paid',
        deliveryDate: orderData.deliveryDate,
        deliveryTime: orderData.deliveryTime,
        address: orderData.address || user.address,
        zone: orderData.zone || user.zone,
        specialInstructions: orderData.specialInstructions,
      })
    );
  }

  return ok({ message: `${created.length} orders created successfully`, data: created }, 201);
});
