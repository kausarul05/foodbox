import { handler, ok } from '@/server/http';

// POST /api/auth/logout — tokens are stateless, so this is just an acknowledgement.
export const POST = handler(async () => ok({ message: 'Logged out successfully' }));
