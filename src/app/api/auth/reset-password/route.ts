import { body, fail, handler, ok } from '@/server/http';
import { byPhone } from '@/server/phone';
import User from '@/server/models/User';
import { MAX_ATTEMPTS, MIN_PASSWORD_LENGTH, codeMatches } from '@/server/passwordReset';

const CLEAR = { resetCodeHash: 1, resetCodeExpires: 1, resetCodeSentAt: 1, resetAttempts: 1 } as const;

/**
 * POST /api/auth/reset-password — public
 *
 * Checks the mailed code and sets the new password. A code works once, for
 * CODE_TTL_MINUTES, and is discarded after MAX_ATTEMPTS wrong guesses.
 */
export const POST = handler(async (req: Request) => {
  const { phoneNumber, code, password } = await body<{ phoneNumber?: string; code?: string; password?: string }>(
    req
  );
  const phone = String(phoneNumber ?? '').trim();
  const given = String(code ?? '').trim();
  const next = String(password ?? '');

  if (!phone || !/^\d{6}$/.test(given)) return fail('৬ সংখ্যার কোডটি দিন', 400);
  if (next.length < MIN_PASSWORD_LENGTH) {
    return fail(`পাসওয়ার্ড কমপক্ষে ${MIN_PASSWORD_LENGTH} অক্ষরের হতে হবে`, 400);
  }

  const user = await User.findOne(byPhone(phone)).select('+resetCodeHash +resetCodeExpires +resetAttempts');
  const expired = !user?.resetCodeHash || !user.resetCodeExpires || user.resetCodeExpires.getTime() < Date.now();
  if (!user || expired) {
    return fail('কোডের মেয়াদ শেষ বা কোডটি সঠিক নয়। নতুন কোড নিন।', 400, { expired: true });
  }

  if (!codeMatches(given, String(user._id), user.resetCodeHash!)) {
    const attempts = (user.resetAttempts ?? 0) + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await User.updateOne({ _id: user._id }, { $unset: CLEAR });
      return fail('অনেকবার ভুল কোড দেওয়া হয়েছে। নতুন কোড নিন।', 429, { expired: true });
    }
    await User.updateOne({ _id: user._id }, { $set: { resetAttempts: attempts } });
    return fail(`কোডটি মেলেনি। আর ${MAX_ATTEMPTS - attempts} বার চেষ্টা করতে পারবেন।`, 400);
  }

  // save() so the pre-save hook hashes the new password.
  user.password = next;
  user.resetCodeHash = undefined;
  user.resetCodeExpires = undefined;
  user.resetAttempts = undefined;
  await user.save();
  await User.updateOne({ _id: user._id }, { $unset: CLEAR });

  return ok({ message: 'পাসওয়ার্ড বদলানো হয়েছে। নতুন পাসওয়ার্ড দিয়ে লগইন করুন।' });
});
