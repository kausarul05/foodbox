import { requireAdmin } from '@/server/auth';
import { body, handler, ok } from '@/server/http';
import ManualOrder from '@/server/models/ManualOrder';
import Zone from '@/server/models/Zone';

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

  /*
   * The delivery charge is the zone's, exactly as POST /api/orders reads it.
   * It was `deliveryCharge || 15` until 17 Nov 2026, and the staff form never
   * sends one — so every phone order would have been recorded at 15 while the
   * site charged the zone's rate (5 in every zone today). A hard-coded rate in
   * one of two places that sell the same food is a number that drifts.
   */
  const zoneDoc = zone ? await Zone.findById(zone).catch(() => null) : null;
  const charge = Number.isFinite(Number(deliveryCharge))
    ? Number(deliveryCharge)
    : (zoneDoc?.deliveryCharge ?? 0);

  const order = await ManualOrder.create({
    customerName,
    phoneNumber,
    address,
    zone,
    items,
    totalAmount,
    deliveryCharge: charge,
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
