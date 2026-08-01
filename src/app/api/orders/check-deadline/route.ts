import { requireUser } from '@/server/auth';
import { checkDeliveryDeadline } from '@/server/deadlines';
import { body, handler, ok } from '@/server/http';

// POST /api/orders/check-deadline — user
export const POST = handler(async (req: Request) => {
  await requireUser(req);
  const { deliveryDate, deliveryTime } = await body(req);

  const orderDate = new Date(deliveryDate);
  const now = new Date();
  const result = checkDeliveryDeadline(orderDate, deliveryTime, now);

  return ok({
    data: {
      ...result,
      currentTime: now.toLocaleTimeString('bn-BD'),
      deliveryDate: orderDate.toLocaleDateString('bn-BD'),
      deliveryTime,
    },
  });
});
