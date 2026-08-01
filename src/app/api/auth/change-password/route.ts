import { requireUser } from '@/server/auth';
import { body, fail, handler, ok } from '@/server/http';
import Admin from '@/server/models/Admin';
import User from '@/server/models/User';

// PUT /api/auth/change-password
export const PUT = handler(async (req: Request) => {
  const authUser = await requireUser(req);
  const { currentPassword, newPassword } = await body(req);

  // The same token id may belong to an Admin document.
  const account = (await User.findById(authUser._id)) ?? (await Admin.findById(authUser._id));
  if (!account) return fail('User not found', 404);

  if (!(await account.matchPassword(currentPassword))) {
    return fail('Current password is incorrect', 401);
  }

  account.password = newPassword;
  await account.save();

  return ok({ message: 'Password changed successfully' });
});
