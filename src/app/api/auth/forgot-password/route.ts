import { body, fail, handler, ok } from '@/server/http';
import { byPhone } from '@/server/phone';
import { sendMail } from '@/server/mail';
import User from '@/server/models/User';
import {
  CODE_TTL_MINUTES,
  RESEND_AFTER_SECONDS,
  hashCode,
  maskEmail,
  newCode,
  resetEmail,
} from '@/server/passwordReset';

/**
 * POST /api/auth/forgot-password — public
 *
 * Mails a 6-digit code when the account has an email. When it does not — or
 * when no account has this number — the answer is the same `channel: 'admin'`,
 * so the endpoint cannot be used to find out which numbers are registered.
 */
export const POST = handler(async (req: Request) => {
  const { phoneNumber } = await body<{ phoneNumber?: string }>(req);
  const phone = String(phoneNumber ?? '').trim();
  if (!phone) return fail('ফোন নাম্বার দিন', 400);

  const user = await User.findOne(byPhone(phone)).select('+resetCodeSentAt fullName email isActive');
  if (!user || !user.email || user.isActive === false) {
    return ok({ data: { channel: 'admin' } });
  }

  const sentAt = user.resetCodeSentAt?.getTime() ?? 0;
  const wait = Math.ceil((sentAt + RESEND_AFTER_SECONDS * 1000 - Date.now()) / 1000);
  if (wait > 0) {
    return fail(`নতুন কোডের জন্য ${wait} সেকেন্ড অপেক্ষা করুন`, 429, { retryAfter: wait });
  }

  const code = newCode();
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        resetCodeHash: hashCode(code, String(user._id)),
        resetCodeExpires: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000),
        resetCodeSentAt: new Date(),
        resetAttempts: 0,
      },
    }
  );

  try {
    const mail = resetEmail(user.fullName, code);
    await sendMail(user.email, mail.subject, mail.html, mail.text);
  } catch (error) {
    // Do not leave a live code behind that the customer never received.
    await User.updateOne(
      { _id: user._id },
      { $unset: { resetCodeHash: 1, resetCodeExpires: 1, resetCodeSentAt: 1, resetAttempts: 1 } }
    );
    console.error('[forgot-password] mail failed:', error instanceof Error ? error.message : error);
    // Don't strand the customer behind a broken mailbox: send them to
    // WhatsApp support, the same path as an account with no email.
    return ok({ data: { channel: 'admin' } });
  }

  return ok({
    data: {
      channel: 'email',
      email: maskEmail(user.email),
      expiresInMinutes: CODE_TTL_MINUTES,
      resendAfter: RESEND_AFTER_SECONDS,
    },
  });
});
