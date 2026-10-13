import { requireUser } from '@/server/auth';
import { handler, ok } from '@/server/http';
import { walletSummary } from '@/server/wallet';

// GET /api/wallet/balance — user
//
// `balance` is what is in the wallet; `reserved` is held by orders not yet
// delivered; `available` is what a new order can use. See src/server/wallet.ts.
export const GET = handler(async (req: Request) => {
  const authUser = await requireUser(req);
  return ok({ data: await walletSummary(authUser._id) });
});
