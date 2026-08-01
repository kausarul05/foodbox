/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Real API client for the customer site.
 *
 * The backend now lives in this same Next.js app under `src/app/api`, so every
 * path is relative and same-origin — no base URL and no CORS.
 */

import type { ApiResponse } from './api.mock';

const API_BASE_URL = '/api';

const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('userToken') : null;

async function apiCall(endpoint: string, options: RequestInit = {}): Promise<ApiResponse> {
  const token = getToken();

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
    // An expired or invalid token means the stored session is useless.
    if (response.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      window.location.href = '/login';
    }
    throw new Error(data.message || 'Something went wrong');
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

  getMyOrders: () => apiCall('/orders/myorders'),

  checkDeadline: (deliveryDate: string, deliveryTime: string) =>
    post('/orders/check-deadline', { deliveryDate, deliveryTime }),

  checkDateBlocked: (date: string) => post('/blocked-dates/check', { date }),
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
