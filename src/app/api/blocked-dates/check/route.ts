import { body, handler, ok } from '@/server/http';
import BlockedDate from '@/server/models/BlockedDate';

// POST /api/blocked-dates/check — public
export const POST = handler(async (req: Request) => {
  const { date } = await body<{ date: string }>(req);

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const blocked = await BlockedDate.findOne({
    date: { $gte: start, $lt: end },
    isActive: true,
  });

  return ok({ isBlocked: !!blocked, message: blocked?.reason ?? null });
});
