/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Real API client for the customer site.
 *
 * The backend now lives in this same Next.js app under `src/app/api`, so every
 * path is relative and same-origin — no base URL and no CORS.
 */

/** The envelope every route in src/app/api returns. */
export interface ApiResponse {
  success: boolean;
  message?: string;
  count?: number;
  // Payload shape varies per endpoint; callers narrow it at the call site.
  data?: any;
  [key: string]: any;
}

const API_BASE_URL = '/api';

const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('userToken') : null;

const PUBLIC_AUTH = /^\/auth\/(login|register|forgot-password|reset-password)$/;

async function apiCall(endpoint: string, options: RequestInit = {}): Promise<ApiResponse> {
  // Sign-in screens never send the stored token: a stale one would turn a
  // wrong password (401) into a forced logout-and-reload below.
  const token = PUBLIC_AUTH.test(endpoint) ? null : getToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    // An expired or invalid token means the stored session is useless. Only
    // when a token was actually sent, though: a wrong password at login is
    // also a 401, and that must show its message, not reload the page.
    if (response.status === 401 && token && typeof window !== 'undefined') {
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      window.location.href = '/login';
    }
    // The envelope rides along as `error.data`, for fields like `retryAfter`.
    throw Object.assign(new Error(data.message || 'Something went wrong'), { data });
  }

  return data;
}

const post = (endpoint: string, payload: unknown) =>
  apiCall(endpoint, { method: 'POST', body: JSON.stringify(payload) });

const put = (endpoint: string, payload?: unknown) =>
  apiCall(endpoint, {
    method: 'PUT',
    ...(payload !== undefined && { body: JSON.stringify(payload) }),
  });

/* ------------------------------------------------------------------ */

export const menuAPI = {
  getMenuByPackage: (packageType: string) => apiCall(`/menu/package/${packageType}`),
};

export const packageAPI = {
  getAllPackages: () => apiCall('/packages'),
};

export const authAPI = {
  userLogin: (phoneNumber: string, password: string) =>
    post('/auth/login', { phoneNumber, password }),

  userRegister: (userData: Record<string, unknown>) => post('/auth/register', userData),

  getUserProfile: () => apiCall('/auth/profile'),

  updateUserProfile: (userData: Record<string, unknown>) => put('/auth/profile', userData),

  changePassword: (currentPassword: string, newPassword: string) =>
    put('/auth/change-password', { currentPassword, newPassword }),

  /** Mails a reset code, or answers `channel: 'admin'` when there is no email. */
  forgotPassword: (phoneNumber: string) => post('/auth/forgot-password', { phoneNumber }),

  resetPassword: (phoneNumber: string, code: string, password: string) =>
    post('/auth/reset-password', { phoneNumber, code, password }),

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
    }
  },
};

export const orderAPI = {
  createOrder: (orderData: Record<string, any>) => post('/orders', orderData),

  cancelOrder: (orderId: string, reason: string) => put(`/orders/${orderId}/cancel`, { reason }),

  /** Only works on a cancelled order — the API refuses anything else. */
  deleteOrder: (orderId: string) => apiCall(`/orders/${orderId}`, { method: 'DELETE' }),

  getMyOrders: () => apiCall('/orders/myorders'),

  /** Guest meals left this month. `month` is YYYY-MM; omitted means now. */
  getGuestQuota: (month?: string) =>
    apiCall(month ? `/orders/guest-quota?month=${month}` : '/orders/guest-quota'),

  checkDeadline: (deliveryDate: string, deliveryTime: string) =>
    post('/orders/check-deadline', { deliveryDate, deliveryTime }),

  checkDateBlocked: (date: string) => post('/blocked-dates/check', { date }),

  /** Every admin-blocked date, so the order form can rule them out up front
   *  instead of failing at submit. */
  getBlockedDates: () => apiCall('/blocked-dates'),
};

export const subscriptionAPI = {
  requestSubscription: (subscriptionData: Record<string, unknown>) =>
    post('/subscriptions', subscriptionData),

  getMySubscriptions: () => apiCall('/subscriptions/my'),
};

export const walletAPI = {
  getBalance: () => apiCall('/wallet/balance'),
};

export const transactionAPI = {
  getMyTransactions: () => apiCall('/wallet/transactions'),

  createRechargeRequest: (data: { amount: number; transactionId: string; paymentMethod: string }) =>
    post('/wallet/recharge', data),

  getPendingTransactions: () => apiCall('/admin/transactions/pending'),

  approveTransaction: (id: string) => put(`/admin/transactions/${id}/approve`),

  rejectTransaction: (id: string, reason: string) =>
    put(`/admin/transactions/${id}/reject`, { reason }),
};

export const zoneAPI = {
  getAllZones: () => apiCall('/zones'),

  getZoneById: (id: string) => apiCall(`/zones/${id}`),

  createZone: (zoneData: { name: string }) => post('/zones', zoneData),

  adminGetAllZones: () => apiCall('/admin/zones'),

  adminUpdateZone: (id: string, zoneData: Record<string, unknown>) =>
    put(`/admin/zones/${id}`, zoneData),

  adminDeleteZone: (id: string) => apiCall(`/admin/zones/${id}`, { method: 'DELETE' }),

  adminToggleZoneStatus: (id: string) => put(`/admin/zones/${id}/toggle`),
};

const api = {
  menu: menuAPI,
  packages: packageAPI,
  auth: authAPI,
  orders: orderAPI,
  subscriptions: subscriptionAPI,
  wallet: walletAPI,
  transactions: transactionAPI,
  zones: zoneAPI,
};

export default api;
