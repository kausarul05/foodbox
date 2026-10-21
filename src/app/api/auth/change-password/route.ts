import { requireAccount } from '@/server/auth';
import { body, fail, handler, ok } from '@/server/http';
import Admin from '@/server/models/Admin';
import User from '@/server/models/User';
import { MIN_PASSWORD_LENGTH } from '@/server/passwordReset';

// PUT /api/auth/change-password
//
// Used by the customer profile (e.g. to replace a temporary password an admin
// issued) and by admin Settings.
export const PUT = handler(async (req: Request) => {
  const authUser = await requireAccount(req);
  const { currentPassword, newPassword } = await body<{ currentPassword?: string; newPassword?: string }>(req);

  const next = String(newPassword ?? '');
  if (next.length < MIN_PASSWORD_LENGTH) {
    return fail(`নতুন পাসওয়ার্ড কমপক্ষে ${MIN_PASSWORD_LENGTH} অক্ষরের হতে হবে`, 400);
  }

  // Re-read with the password: the guard strips it, matchPassword needs it.
  const account = (await User.findById(authUser._id)) ?? (await Admin.findById(authUser._id));
  if (!account) return fail('User not found', 404);

  // 400, not 401: both API clients treat 401 as "session expired" and log the
  // person out, which a mistyped current password must not do.
  if (!(await account.matchPassword(String(currentPassword ?? '')))) {
    return fail('বর্তমান পাসওয়ার্ড সঠিক নয়', 400);
  }

  account.password = next;
  await account.save();

  return ok({ message: 'পাসওয়ার্ড বদলানো হয়েছে' });
});
