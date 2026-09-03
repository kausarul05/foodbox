/**
 * Customer-site API client.
 *
 * There is exactly one implementation: the real one, talking to the route
 * handlers in `src/app/api`. The previous mock/real switch and its fixtures
 * were removed — every value the UI shows now comes from the database, so
 * there is no code path that can render invented data.
 */

export type { ApiResponse } from './api.http';

export {
  menuAPI,
  packageAPI,
  authAPI,
  orderAPI,
  subscriptionAPI,
  walletAPI,
  transactionAPI,
  zoneAPI,
  default,
} from './api.http';
