import { handler, ok } from '@/server/http';
import BlockedDate from '@/server/models/BlockedDate';

// GET /api/blocked-dates — public
export const GET = handler(async () => {
  const blockedDates = await BlockedDate.find({ isActive: true });
  return ok({ data: blockedDates });
});
