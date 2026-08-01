import { generateToken } from '@/server/auth';
import { body, fail, handler, ok } from '@/server/http';
import User from '@/server/models/User';
import Zone from '@/server/models/Zone';

// POST /api/auth/register
export const POST = handler(async (req: Request) => {
  const { fullName, phoneNumber, email, password, zone, zoneName, address } = await body(req);

  const userExists = await User.findOne({ $or: [{ phoneNumber }, { email }] });
  if (userExists) {
    return fail('User already exists with this phone number or email', 400);
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
    email,
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
        zone: user.zone,
        address: user.address,
        walletBalance: user.walletBalance,
        token: generateToken(user._id.toString()),
      },
    },
    201
  );
});
