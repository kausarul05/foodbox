import { requireAdmin } from '@/server/auth';
import { body, handler, ok } from '@/server/http';
import ManualOrder from '@/server/models/ManualOrder';

// POST /api/admin/manual-orders — phone/walk-in orders entered by staff
export const POST = handler(async (req: Request) => {
  const admin = await requireAdmin(req);
  const {
    customerName,
    phoneNumber,
    address,
    zone,
    items,
    totalAmount,
    deliveryCharge,
    paymentMethod,
    deliveryDate,
    deliveryTime,
    specialInstructions,
  } = await body(req);

  const order = await ManualOrder.create({
    customerName,
    phoneNumber,
    address,
    zone,
    items,
    totalAmount,
    deliveryCharge: deliveryCharge || 15,
    paymentMethod: paymentMethod || 'cash',
    deliveryDate,
    deliveryTime,
    specialInstructions,
    addedBy: admin._id,
  });

  return ok({ data: order }, 201);
});

// GET /api/admin/manual-orders
export const GET = handler(async (req: Request) => {
  await requireAdmin(req);

  const params = new URL(req.url).searchParams;
  const status = params.get('status');
  const startDate = params.get('startDate');
  const endDate = params.get('endDate');

  const query: Record<string, unknown> = {};
  if (status) query.status = status;
  if (startDate && endDate) {
    query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const orders = await ManualOrder.find(query).sort({ createdAt: -1 });
  return ok({ count: orders.length, data: orders });
});
