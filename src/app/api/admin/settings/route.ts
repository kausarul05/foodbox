import { requireAdmin } from '@/server/auth';
import { body, handler, ok } from '@/server/http';
import Settings from '@/server/models/Settings';

const ALLOWED_UPDATES = [
  'siteName',
  'adminEmail',
  'phoneNumber',
  'deliveryCharge',
  'minOrderAmount',
  'maxOrderAmount',
  'notificationEmail',
  'notificationSMS',
  'notificationPush',
  'autoConfirmOrder',
] as const;

// GET /api/admin/settings
export const GET = handler(async (req: Request) => {
  await requireAdmin(req);
  return ok({ data: await Settings.getSettings() });
});

// PUT /api/admin/settings
export const PUT = handler(async (req: Request) => {
  await requireAdmin(req);
  const updates = await body(req);

  const patch: Record<string, unknown> = {};
  for (const field of ALLOWED_UPDATES) {
    if (updates[field] !== undefined) patch[field] = updates[field];
  }

  const current = await Settings.getSettings();
  const settings = await Settings.findByIdAndUpdate(current._id, patch, {
    new: true,
    runValidators: true,
  });

  return ok({ data: settings });
});
