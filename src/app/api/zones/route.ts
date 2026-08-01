import { body, fail, handler, ok } from '@/server/http';
import Zone from '@/server/models/Zone';

// GET /api/zones — public, active zones only
export const GET = handler(async () => {
  const zones = await Zone.find({ isActive: true }).sort({ createdAt: -1 });
  return ok({ count: zones.length, data: zones });
});

// POST /api/zones — a user proposing their own area; stays inactive until approved
export const POST = handler(async (req: Request) => {
  const { name } = await body<{ name?: string }>(req);

  if (!name?.trim()) return fail('জোনের নাম দিন', 400);

  const existing = await Zone.findOne({ name: name.toLowerCase().trim() });
  if (existing) return fail('এই জোন ইতিমধ্যে রয়েছে', 400);

  try {
    const zone = await Zone.create({
      name: name.toLowerCase().trim(),
      nameBn: null,
      deliveryCharge: 0,
      isActive: false,
      isCustom: true,
      addedBy: null,
    });

    return ok(
      { data: zone, message: 'জোন যোগ করা হয়েছে। অ্যাডমিন অনুমোদনের পর এটি সক্রিয় হবে।' },
      201
    );
  } catch (error) {
    // Racing requests can both pass the findOne check above.
    if ((error as { code?: number }).code === 11000) {
      return fail('এই জোন ইতিমধ্যে রয়েছে', 400);
    }
    throw error;
  }
});
