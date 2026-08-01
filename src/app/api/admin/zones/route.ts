import { requireAdmin } from '@/server/auth';
import { body, fail, handler, ok } from '@/server/http';
import Zone from '@/server/models/Zone';

// GET /api/admin/zones — every zone, including inactive/pending ones
export const GET = handler(async (req: Request) => {
  await requireAdmin(req);
  const zones = await Zone.find().sort({ createdAt: -1 });
  return ok({ count: zones.length, data: zones });
});

// POST /api/admin/zones
export const POST = handler(async (req: Request) => {
  const admin = await requireAdmin(req);
  const { name, nameBn, deliveryCharge } = await body<{
    name?: string;
    nameBn?: string;
    deliveryCharge?: number;
  }>(req);

  if (!name) return fail('জোনের নাম দিন', 400);

  const existing = await Zone.findOne({ name: name.toLowerCase().trim() });
  if (existing) return fail('এই জোন ইতিমধ্যে রয়েছে', 400);

  try {
    const zone = await Zone.create({
      name: name.toLowerCase().trim(),
      nameBn: nameBn || null,
      deliveryCharge: deliveryCharge || 50,
      isActive: true,
      isCustom: false,
      addedByAdmin: admin._id,
    });
    return ok({ data: zone }, 201);
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return fail('এই জোন ইতিমধ্যে রয়েছে', 400);
    }
    throw error;
  }
});
