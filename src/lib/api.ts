/**
 * Customer-site API client.
 *
 * Set `NEXT_PUBLIC_USE_MOCK=true` in .env.local to run the whole front-end off
 * `src/mock/data.ts` with no network calls — that's the mode to use while the UI
 * is being redesigned. Anything else (or unset) hits the real route handlers in
 * `src/app/api`.
 *
 * Both implementations export the same names and the same response envelope, so
 * flipping the flag never requires touching a component.
 */

import * as httpApi from './api.http';
import * as mockApi from './api.mock';

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

const impl = USE_MOCK ? mockApi : httpApi;

export type { ApiResponse } from './api.mock';

export const menuAPI = impl.menuAPI;
export const packageAPI = impl.packageAPI;
export const authAPI = impl.authAPI;
export const orderAPI = impl.orderAPI;
export const subscriptionAPI = impl.subscriptionAPI;
export const walletAPI = impl.walletAPI;
export const transactionAPI = impl.transactionAPI;
export const zoneAPI = impl.zoneAPI;

export default impl.default;
