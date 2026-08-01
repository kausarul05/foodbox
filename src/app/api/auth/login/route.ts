import { generateToken } from '@/server/auth';
import { body, fail, handler, ok } from '@/server/http';
import User from '@/server/models/User';

// POST /api/auth/login
export const POST = handler(async (req: Request) => {
  const { phoneNumber, password } = await body(req);

  const user = await User.findOne({ phoneNumber });
  if (!user || !(await user.matchPassword(password))) {
    return fail('Invalid phone number or password', 401);
  }

  return ok({
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
  });
});
