import { generateToken } from '@/server/auth';
import { body, fail, handler, ok } from '@/server/http';
import User from '@/server/models/User';
import Zone from '@/server/models/Zone';
import { byPhone, normalizePhone } from '@/server/phone';

// POST /api/auth/register
export const POST = handler(async (req: Request) => {
  const {
    fullName,
    phoneNumber: rawPhone,
    whatsappNumber,
    email,
    password,
    zone,
    zoneName,
    address,
  } = await body(req);

  /**
   * Email is optional; WhatsApp is not.
   *
   * Most customers have no email, and the WhatsApp number is what gets them
   * into the subscriber group — so that is the one we insist on. An empty
   * string has to become `undefined`: the unique index on email is sparse, and
   * a sparse index still stores '' , so two blank emails would collide.
   */
  const cleanEmail = typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : undefined;
  // Stored as 01XXXXXXXXX whatever shape was typed — see src/server/phone.ts.
  const phoneNumber = normalizePhone(rawPhone);
  const cleanWhatsapp = typeof whatsappNumber === 'string' ? normalizePhone(whatsappNumber) : '';

  if (!cleanWhatsapp) {
    return fail('হোয়াটসঅ্যাপ নাম্বার দিতে হবে', 400);
  }

  // Built up conditionally: `{ email: undefined }` is stripped by mongoose, which
  // would leave `$or: [{ phoneNumber }, {}]` — and `{}` matches every document,
  // so every signup without an email would be rejected as already existing.
  // byPhone, so "01…" still clashes with an older "+8801…" account.
  const clashes: Record<string, unknown>[] = [byPhone(phoneNumber)];
  if (cleanEmail) clashes.push({ email: cleanEmail });

  const userExists = await User.findOne({ $or: clashes });
  if (userExists) {
    return fail(
      normalizePhone(userExists.phoneNumber) === phoneNumber
        ? 'এই ফোন নাম্বার দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে'
        : 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে',
      400
    );
  }

  let finalZoneId = zone;

  // The signup form sends `custom_*` when the user typed their own area name.
  if (typeof zone === 'string' && zone.startsWith('custom_') && zoneName) {
    const existingZone = await Zone.findOne({
      name: { $regex: new RegExp(`^${String(zoneName).trim()}$`, 'i') },
    });

    finalZoneId = existingZone
      ? existingZone._id
      : (
          await Zone.create({
            name: String(zoneName).toLowerCase().trim(),
            nameBn: null,
            deliveryCharge: 0,
            isActive: false, // stays hidden until an admin approves it
            isCustom: true,
            addedBy: null,
          })
        )._id;
  }

  const user = await User.create({
    fullName,
    phoneNumber,
    whatsappNumber: cleanWhatsapp,
    email: cleanEmail,
    password,
    zone: finalZoneId,
    address,
  });

  if (typeof zone === 'string' && zone.startsWith('custom_') && zoneName) {
    await Zone.findByIdAndUpdate(finalZoneId, { addedBy: user._id });
  }

  return ok(
    {
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        whatsappNumber: user.whatsappNumber,
        zone: user.zone,
        address: user.address,
        walletBalance: user.walletBalance,
        token: generateToken(user._id.toString()),
      },
    },
    201
  );
});
