import { requireUser } from '@/server/auth';
import { checkDeliveryDeadline } from '@/server/deadlines';
import { body, handler, ok } from '@/server/http';
import { bengaliDateNumeric, bengaliTime } from '@/lib/format';

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
      // Formatted explicitly rather than with toLocale*: the server's ICU data
      // decides that, so the same response could come back day/month/year on
      // one host and month/day/year on another.
      currentTime: bengaliTime(now),
      deliveryDate: bengaliDateNumeric(orderDate),
      deliveryTime,
    },
  });
});
