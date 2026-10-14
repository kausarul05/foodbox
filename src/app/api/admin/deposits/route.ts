import { Types } from 'mongoose';
import { requireAdmin } from '@/server/auth';
import { summariseDeposit } from '@/server/deposit';
import { handler, ok } from '@/server/http';
import DepositEvent from '@/server/models/DepositEvent';
import Subscription from '@/server/models/Subscription';
import User from '@/server/models/User';
import { reservedByUser } from '@/server/wallet';

/**
 * GET /api/admin/deposits — any admin
 *
 * Food-box deposits for every subscriber (anyone with a subscription, plus
 * anyone who has ever had a deposit), and the full deposit history, newest
 * first. One request, so the page does not fire a call per customer.
 */
export const GET = handler(async (req: Request) => {
  await requireAdmin(req);

  const subs = await Subscription.find().sort({ createdAt: -1 }).select('userId status packageName package');
  // Latest subscription per user.
  const latest = new Map<string, (typeof subs)[number]>();
  for (const s of subs) if (!latest.has(String(s.userId))) latest.set(String(s.userId), s);

  const users = await User.find({
    $or: [{ _id: { $in: [...latest.keys()].map((id) => new Types.ObjectId(id)) } }, { depositStatus: { $exists: true } }],
  }).select('fullName phoneNumber walletBalance depositStatus depositAmount');

  const [reserved, events] = await Promise.all([
    reservedByUser(users.map((u) => u._id)),
    DepositEvent.find().sort({ createdAt: -1 }).limit(500),
  ]);

  const rows = users.map((u) => {
    const balance = u.walletBalance ?? 0;
    const held = reserved.get(String(u._id))?.reserved ?? 0;
    const sub = latest.get(String(u._id));
    return {
      userId: u._id,
      fullName: u.fullName,
      phoneNumber: u.phoneNumber,
      balance,
      reserved: held,
      deposit: summariseDeposit(u, balance, held),
      subscription: sub ? { status: sub.status, packageName: sub.packageName || sub.package } : null,
    };
  });

  return ok({ data: { rows, events } });
});
