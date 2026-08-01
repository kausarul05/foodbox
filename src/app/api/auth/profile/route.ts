import { requireUser } from '@/server/auth';
import { body, fail, handler, ok } from '@/server/http';
import User from '@/server/models/User';
import Zone from '@/server/models/Zone';

// GET /api/auth/profile
export const GET = handler(async (req: Request) => {
  const authUser = await requireUser(req);

  const user = await User.findById(authUser._id).select('-password');
  if (!user) return fail('User not found', 404);

  // The client expects the full zone object, not just its id.
  const userData = {
    ...user.toObject(),
    zone: user.zone ? await Zone.findById(user.zone) : null,
  };

  return ok({ data: userData });
});

// PUT /api/auth/profile
export const PUT = handler(async (req: Request) => {
  const authUser = await requireUser(req);
  const updates = await body(req);

  const user = await User.findById(authUser._id);
  if (!user) return fail('User not found', 404);

  if (updates.fullName) user.fullName = updates.fullName;
  if (updates.phoneNumber) user.phoneNumber = updates.phoneNumber;
  if (updates.zone) user.zone = updates.zone;
  if (updates.address) user.address = updates.address;
  if (updates.password) user.password = updates.password;

  const updated = await user.save();

  return ok({
    data: {
      _id: updated._id,
      fullName: updated.fullName,
      email: updated.email,
      phoneNumber: updated.phoneNumber,
      zone: await Zone.findById(updated.zone).select('name nameBn deliveryCharge'),
      address: updated.address,
      walletBalance: updated.walletBalance,
    },
  });
});
