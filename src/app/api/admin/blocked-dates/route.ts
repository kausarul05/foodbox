import { requireAdmin } from '@/server/auth';
import { body, handler, ok } from '@/server/http';
import BlockedDate from '@/server/models/BlockedDate';

// GET /api/admin/blocked-dates — including inactive ones
export const GET = handler(async (req: Request) => {
  await requireAdmin(req);
  const blockedDates = await BlockedDate.find().sort({ date: -1 });
  return ok({ data: blockedDates });
});

// POST /api/admin/blocked-dates
export const POST = handler(async (req: Request) => {
  const admin = await requireAdmin(req);
  const { date, reason } = await body(req);

  const blockedDate = await BlockedDate.create({
    date: new Date(date),
    reason:
      reason ||
      'অনিবার্য কারনবশত আজ মিল বন্ধ থাকবে, আগামীকাল থেকে স্বাভাবিক ভাবে মেন্যু অনুযায়ী অর্ডার সরবরাহ করা হবে।',
    addedBy: admin._id,
  });

  return ok({ data: blockedDate }, 201);
});
