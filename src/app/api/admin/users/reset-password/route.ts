import { authorize, requireAdmin } from '@/server/auth';
import { body, fail, handler, ok } from '@/server/http';
import { byPhone } from '@/server/phone';
import User from '@/server/models/User';
import { tempPassword } from '@/server/passwordReset';

/**
 * POST /api/admin/users/reset-password — super_admin | manager
 *
 * For a customer with no email on file: sets a temporary password and returns
 * it once, for the admin to send on WhatsApp. It is not stored in plain text
 * anywhere and cannot be shown again.
 */
export const POST = handler(async (req: Request) => {
  authorize(await requireAdmin(req), 'super_admin', 'manager');
  const { phoneNumber } = await body<{ phoneNumber?: string }>(req);
  const phone = String(phoneNumber ?? '').trim();
  if (!phone) return fail('ফোন নাম্বার দিন', 400);

  const user = await User.findOne(byPhone(phone));
  if (!user) return fail('এই নাম্বারে কোনো অ্যাকাউন্ট নেই', 404);

  const password = tempPassword();
  user.password = password; // hashed by the pre-save hook
  await user.save();
  // Any code mailed earlier is now pointless.
  await User.updateOne(
    { _id: user._id },
    { $unset: { resetCodeHash: 1, resetCodeExpires: 1, resetCodeSentAt: 1, resetAttempts: 1 } }
  );

  return ok({
    data: {
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      whatsappNumber: user.whatsappNumber,
      tempPassword: password,
    },
  });
});
