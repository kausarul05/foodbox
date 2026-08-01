/**
 * Mock API layer — NO NETWORK CALLS.
 *
 * The front-end is being redesigned before the backend is moved into this
 * project as Next.js route handlers. Until then every `*API` object below
 * resolves from `src/mock/data.ts` instead of hitting a server.
 *
 * The exported surface and response shapes are identical to the old Express
 * backend (see `src/lib/api.http.reference.js` for the original fetch client),
 * so swapping this file back to real `fetch` calls later touches nothing else.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  mockBlockedDates,
  mockOrders,
  mockPackages,
  mockSubscriptions,
  mockTransactions,
  mockUser,
  mockWeeklyMenu,
  mockZones,
  type MockOrder,
  type MockTransaction,
  type MockZone,
} from '@/mock/data';

/**
 * The Express backend always answered with `{ success, data, message? }` plus the
 * occasional extra top-level field. Keeping the envelope loose mirrors the old
 * untyped client so callers can read `message`, `walletBalance`, `isBlocked`, etc.
 */
export interface ApiResponse {
  success: boolean;
  data?: any;
  message?: string;
  count?: number;
  [key: string]: any;
}

/** Simulated network latency so loading states stay visible during design work. */
const LATENCY_MS = 250;

const delay = (payload: ApiResponse, ms = LATENCY_MS): Promise<ApiResponse> =>
  new Promise(resolve => setTimeout(() => resolve(payload), ms));

/** Deep clone so callers mutating results never corrupt the mock store. */
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const isBrowser = () => typeof window !== 'undefined';

/* ------------------------------------------------------------------ */
/* In-memory session state (resets on reload)                          */
/* ------------------------------------------------------------------ */

const orders: MockOrder[] = clone(mockOrders);
const transactions: MockTransaction[] = clone(mockTransactions);
const zones: MockZone[] = clone(mockZones);
let walletBalance = mockUser.walletBalance;

const nextId = (prefix: string) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

/* ------------------------------------------------------------------ */
/* Menu                                                                */
/* ------------------------------------------------------------------ */

export const menuAPI = {
  getMenuByPackage: (packageType: string) => {
    const data = mockWeeklyMenu[String(packageType).toLowerCase()] ?? [];
    return delay({ success: true, count: data.length, data: clone(data) });
  },
};

/* ------------------------------------------------------------------ */
/* Packages                                                            */
/* ------------------------------------------------------------------ */

export const packageAPI = {
  getAllPackages: () =>
    delay({ success: true, count: mockPackages.length, data: clone(mockPackages) }),
};

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

const authPayload = () => ({
  _id: mockUser._id,
  fullName: mockUser.fullName,
  email: mockUser.email,
  phoneNumber: mockUser.phoneNumber,
  zone: clone(mockUser.zone),
  address: mockUser.address,
  walletBalance,
  token: 'mock-jwt-token',
});

export const authAPI = {
  /** Accepts any credentials while mocking. */
  userLogin: (phoneNumber: string, _password: string) =>
    delay({ success: true, data: { ...authPayload(), phoneNumber } }),

  userRegister: (userData: Record<string, unknown>) =>
    delay({ success: true, data: { ...authPayload(), ...userData } }),

  getUserProfile: () => {
    const { token: _token, ...profile } = authPayload();
    return delay({ success: true, data: profile });
  },

  updateUserProfile: (userData: Record<string, unknown>) => {
    const { token: _token, ...profile } = authPayload();
    const zone =
      typeof userData.zone === 'string'
        ? zones.find(z => z._id === userData.zone) ?? profile.zone
        : profile.zone;
    return delay({ success: true, data: { ...profile, ...userData, zone: clone(zone) } });
  },

  logout: () => {
    if (isBrowser()) {
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
    }
  },
};

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export const orderAPI = {
  createOrder: (orderData: Record<string, any>) => {
    const zone = zones.find(z => z._id === orderData.zone) ?? zones[0];
    // Callers send either `meals` or the flatter `items` shape; accept both.
    const meals: MockOrder['meals'] =
      orderData.meals ??
      (orderData.items ?? []).map((item: any) => ({
        type: item.type === 'guest' ? 'guest' : 'self',
        meal: item.name ?? item.meal ?? '',
        price: Number(item.price ?? 0),
        quantity: Number(item.quantity ?? 1),
      }));

    const order: MockOrder = {
      _id: nextId('order'),
      orderNumber: `FB-${10250 + orders.length}`,
      userId: mockUser._id,
      phoneNumber: orderData.phoneNumber ?? mockUser.phoneNumber,
      address: orderData.address ?? mockUser.address,
      zone: clone(zone),
      package: orderData.package ?? 'basic',
      deliveryDate: orderData.deliveryDate ?? new Date().toISOString(),
      deliveryTime: orderData.deliveryTime ?? 'lunch',
      meals,
      totalAmount: Number(orderData.totalAmount ?? 0),
      deliveryCharge: Number(orderData.deliveryCharge ?? zone.deliveryCharge),
      paymentMethod: orderData.paymentMethod ?? 'wallet',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    orders.unshift(order);
    if (order.paymentMethod === 'wallet') {
      walletBalance = Math.max(0, walletBalance - order.totalAmount);
    }

    return delay({ success: true, data: clone(order), walletBalance });
  },

  cancelOrder: (orderId: string, reason: string) => {
    const order = orders.find(o => o._id === orderId);
    if (!order) {
      return delay({ success: false, message: 'অর্ডার পাওয়া যায়নি', data: null });
    }
    order.status = 'cancelled';
    order.cancelReason = reason;
    if (order.paymentMethod === 'wallet') {
      walletBalance += order.totalAmount;
    }
    return delay({ success: true, data: clone(order) });
  },

  getMyOrders: () => delay({ success: true, count: orders.length, data: clone(orders) }),

  /** Mock always allows ordering. */
  checkDeadline: (_deliveryDate: string, _deliveryTime: string) =>
    delay({ success: true, isWithinDeadline: true, message: '' }),

  checkDateBlocked: (date: string) => {
    const blocked = mockBlockedDates.includes(String(date).slice(0, 10));
    return delay({
      success: true,
      isBlocked: blocked,
      message: blocked ? 'এই তারিখে ডেলিভারি বন্ধ আছে' : '',
    });
  },
};

/* ------------------------------------------------------------------ */
/* Subscriptions                                                       */
/* ------------------------------------------------------------------ */

const subscriptions = clone(mockSubscriptions);

export const subscriptionAPI = {
  requestSubscription: (subscriptionData: Record<string, unknown>) => {
    const subscription = {
      _id: nextId('sub'),
      userId: mockUser._id,
      package: String(subscriptionData.package ?? 'basic'),
      paymentMethod: String(subscriptionData.paymentMethod ?? 'bkash'),
      address: String(subscriptionData.address ?? mockUser.address),
      zone: String(subscriptionData.zone ?? mockUser.zone._id),
      status: 'pending' as const,
      startDate: null,
      endDate: null,
      createdAt: new Date().toISOString(),
    };
    subscriptions.unshift(subscription);
    return delay({ success: true, data: clone(subscription) });
  },

  // Note: the old backend returned walletBalance alongside the list.
  getMySubscriptions: () =>
    delay({ success: true, data: clone(subscriptions), walletBalance }),
};

/* ------------------------------------------------------------------ */
/* Wallet & transactions                                               */
/* ------------------------------------------------------------------ */

export const walletAPI = {
  getBalance: () => delay({ success: true, data: { balance: walletBalance } }),
};

export const transactionAPI = {
  getMyTransactions: () =>
    delay({ success: true, count: transactions.length, data: clone(transactions) }),

  createRechargeRequest: (data: { amount: number; transactionId: string; paymentMethod: string }) => {
    if (transactions.some(t => t.transactionId === data.transactionId)) {
      return delay({
        success: false,
        message: 'এই ট্রানজেকশন আইডি ইতিমধ্যে ব্যবহার করা হয়েছে',
        data: null,
      });
    }
    const transaction: MockTransaction = {
      _id: nextId('txn'),
      userId: mockUser._id,
      userName: mockUser.fullName,
      amount: Number(data.amount),
      transactionId: data.transactionId,
      paymentMethod: data.paymentMethod,
      status: 'pending',
      type: 'recharge',
      createdAt: new Date().toISOString(),
    };
    transactions.unshift(transaction);
    return delay({ success: true, data: clone(transaction) });
  },

  getPendingTransactions: () =>
    delay({ success: true, data: clone(transactions.filter(t => t.status === 'pending')) }),

  approveTransaction: (id: string) => {
    const transaction = transactions.find(t => t._id === id);
    if (transaction) {
      transaction.status = 'approved';
      if (transaction.type === 'recharge') walletBalance += transaction.amount;
    }
    return delay({ success: true, data: transaction ? clone(transaction) : null });
  },

  rejectTransaction: (id: string, reason: string) => {
    const transaction = transactions.find(t => t._id === id);
    if (transaction) {
      transaction.status = 'rejected';
      transaction.rejectReason = reason;
    }
    return delay({ success: true, data: transaction ? clone(transaction) : null });
  },
};

/* ------------------------------------------------------------------ */
/* Zones                                                               */
/* ------------------------------------------------------------------ */

export const zoneAPI = {
  getAllZones: () => delay({ success: true, count: zones.length, data: clone(zones) }),

  getZoneById: (id: string) => {
    const zone = zones.find(z => z._id === id);
    return delay(
      zone
        ? { success: true, data: clone(zone) }
        : { success: false, message: 'জোন পাওয়া যায়নি', data: null }
    );
  },

  createZone: (zoneData: { name: string }) => {
    const name = zoneData.name.trim().toLowerCase();
    const existing = zones.find(z => z.name === name);
    if (existing) {
      return delay({ success: false, message: 'এই জোন ইতিমধ্যে রয়েছে', data: clone(existing) });
    }
    const zone: MockZone = {
      _id: nextId('zone'),
      name,
      nameBn: zoneData.name.trim(),
      deliveryCharge: 60,
      isActive: true,
      isCustom: true,
    };
    zones.push(zone);
    return delay({ success: true, data: clone(zone) });
  },

  adminGetAllZones: () => delay({ success: true, count: zones.length, data: clone(zones) }),

  adminUpdateZone: (id: string, zoneData: Partial<MockZone>) => {
    const zone = zones.find(z => z._id === id);
    if (zone) Object.assign(zone, zoneData);
    return delay({ success: true, data: zone ? clone(zone) : null });
  },

  adminDeleteZone: (id: string) => {
    const index = zones.findIndex(z => z._id === id);
    if (index >= 0) zones.splice(index, 1);
    return delay({ success: true, message: 'জোন মুছে ফেলা হয়েছে' });
  },

  adminToggleZoneStatus: (id: string) => {
    const zone = zones.find(z => z._id === id);
    if (zone) zone.isActive = !zone.isActive;
    return delay({ success: true, data: zone ? clone(zone) : null });
  },
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
