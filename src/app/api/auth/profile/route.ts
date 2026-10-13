import { requireUser } from '@/server/auth';
import { body, fail, handler, ok } from '@/server/http';
import User from '@/server/models/User';
import Zone from '@/server/models/Zone';
import { byPhone, normalizePhone } from '@/server/phone';

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
  if (updates.phoneNumber) {
    const phone = normalizePhone(updates.phoneNumber);
    // The unique index only catches the exact same string; this also catches
    // the same number saved in another shape (+8801… vs 01…).
    const taken = await User.exists({ ...byPhone(phone), _id: { $ne: user._id } });
    if (taken) return fail('এই ফোন নাম্বার অন্য একটি অ্যাকাউন্টে ব্যবহার হচ্ছে', 400);
    user.phoneNumber = phone;
  }
  if (updates.whatsappNumber) user.whatsappNumber = normalizePhone(updates.whatsappNumber);
  if (updates.zone) user.zone = updates.zone;
  if (updates.address) user.address = updates.address;
  // Email is optional and is what forgot-password mails the code to. An empty
  // string removes it. (The password is not changeable here — that goes
  // through /api/auth/change-password, which checks the current one.)
  if (typeof updates.email === 'string') {
    const email = updates.email.trim().toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('সঠিক ইমেইল দিন', 400);
    user.email = email || undefined;
  }

  let updated;
  try {
    updated = await user.save();
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return fail('এই ইমেইল বা ফোন নাম্বার অন্য একটি অ্যাকাউন্টে ব্যবহার হচ্ছে', 400);
    }
    throw error;
  }

  return ok({
    data: {
      _id: updated._id,
      fullName: updated.fullName,
      email: updated.email,
      phoneNumber: updated.phoneNumber,
      whatsappNumber: updated.whatsappNumber,
      zone: await Zone.findById(updated.zone).select('name nameBn deliveryCharge'),
      address: updated.address,
      walletBalance: updated.walletBalance,
    },
  });
});
