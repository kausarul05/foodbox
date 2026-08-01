/**
 * Mock data for front-end development.
 *
 * Shapes here mirror the Mongoose models in the old `foodbox-backend` project,
 * so when the backend is ported into `src/app/api/*` the components need no change.
 */

export interface MockZone {
  _id: string;
  name: string;
  nameBn: string | null;
  deliveryCharge: number;
  isActive: boolean;
  isCustom: boolean;
}

export interface MockPackage {
  _id: string;
  name: string;
  title: string;
  price: number;
  originalPrice: number;
  features: string[];
  duration: number;
  discount: number;
  isActive: boolean;
}

export interface MockMenuDay {
  _id: string;
  day: string;
  package: string;
  morning: string;
  lunch: string;
  dinner: string;
  morningPrice: number;
  lunchPrice: number;
  dinnerPrice: number;
  isActive: boolean;
}

export interface MockUser {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  zone: MockZone;
  address: string;
  walletBalance: number;
  role: 'user' | 'admin';
  isActive: boolean;
}

export interface MockOrder {
  _id: string;
  orderNumber: string;
  userId: string;
  phoneNumber: string;
  address: string;
  zone: MockZone;
  package: string;
  deliveryDate: string;
  deliveryTime: 'morning' | 'lunch' | 'dinner';
  meals: { type: 'self' | 'guest'; meal: string; price: number; quantity: number }[];
  totalAmount: number;
  deliveryCharge: number;
  paymentMethod: string;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  cancelReason?: string;
  createdAt: string;
}

export interface MockSubscription {
  _id: string;
  userId: string;
  package: string;
  paymentMethod: string;
  address: string;
  zone: string;
  status: 'pending' | 'active' | 'expired' | 'rejected';
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

export interface MockTransaction {
  _id: string;
  userId: string;
  userName: string;
  amount: number;
  transactionId: string;
  paymentMethod: string;
  status: 'pending' | 'approved' | 'rejected';
  type: 'recharge' | 'order' | 'refund';
  rejectReason?: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Zones                                                               */
/* ------------------------------------------------------------------ */

export const mockZones: MockZone[] = [
  { _id: 'zone_1', name: 'uttara', nameBn: 'উত্তরা', deliveryCharge: 40, isActive: true, isCustom: false },
  { _id: 'zone_2', name: 'mirpur', nameBn: 'মিরপুর', deliveryCharge: 50, isActive: true, isCustom: false },
  { _id: 'zone_3', name: 'dhanmondi', nameBn: 'ধানমন্ডি', deliveryCharge: 50, isActive: true, isCustom: false },
  { _id: 'zone_4', name: 'gulshan', nameBn: 'গুলশান', deliveryCharge: 60, isActive: true, isCustom: false },
  { _id: 'zone_5', name: 'banani', nameBn: 'বনানী', deliveryCharge: 60, isActive: true, isCustom: false },
  { _id: 'zone_6', name: 'mohammadpur', nameBn: 'মোহাম্মদপুর', deliveryCharge: 50, isActive: true, isCustom: false },
  { _id: 'zone_7', name: 'bashundhara', nameBn: 'বসুন্ধরা', deliveryCharge: 70, isActive: true, isCustom: false },
  { _id: 'zone_8', name: 'motijheel', nameBn: 'মতিঝিল', deliveryCharge: 70, isActive: true, isCustom: false },
];

/* ------------------------------------------------------------------ */
/* Packages                                                            */
/* ------------------------------------------------------------------ */

export const mockPackages: MockPackage[] = [
  {
    _id: 'pkg_basic',
    name: 'basic',
    title: 'বেসিক প্যাকেজ',
    price: 3500,
    originalPrice: 4200,
    features: [
      'প্রতিদিন ১ বেলা খাবার',
      'হোম ডেলিভারি ফ্রি',
      'সাপ্তাহিক মেনু পরিবর্তন',
      '২৪/৭ সাপোর্ট',
    ],
    duration: 30,
    discount: 17,
    isActive: true,
  },
  {
    _id: 'pkg_golden',
    name: 'golden',
    title: 'গোল্ডেন প্যাকেজ',
    price: 6500,
    originalPrice: 8000,
    features: [
      'প্রতিদিন ২ বেলা খাবার',
      'হোম ডেলিভারি ফ্রি',
      'এক্সট্রা আইটেম সপ্তাহে ২ দিন',
      'সাপ্তাহিক মেনু পরিবর্তন',
      '২৪/৭ সাপোর্ট',
    ],
    duration: 30,
    discount: 19,
    isActive: true,
  },
  {
    _id: 'pkg_premium',
    name: 'premium',
    title: 'প্রিমিয়াম প্যাকেজ',
    price: 9500,
    originalPrice: 12000,
    features: [
      'প্রতিদিন ৩ বেলা খাবার',
      'প্রায়োরিটি হোম ডেলিভারি',
      'এক্সট্রা আইটেম প্রতিদিন',
      'কাস্টম মেনু রিকোয়েস্ট',
      'গেস্ট মিল ডিসকাউন্ট',
      '২৪/৭ সাপোর্ট',
    ],
    duration: 30,
    discount: 21,
    isActive: true,
  },
];

/* ------------------------------------------------------------------ */
/* Weekly menu — keyed by package name                                 */
/* ------------------------------------------------------------------ */

const DAYS = ['শনিবার', 'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার'];

type MenuSeed = [morning: string, lunch: string, dinner: string];

const menuSeeds: Record<string, MenuSeed[]> = {
  basic: [
    ['পরোটা, ডিম ভাজি', 'ভাত, মুরগির ঝোল, ডাল', 'রুটি, সবজি, ডাল'],
    ['খিচুড়ি, আচার', 'ভাত, রুই মাছ, ডাল', 'রুটি, ডিম কারি'],
    ['রুটি, সবজি', 'ভাত, মুরগির রোস্ট, ডাল', 'রুটি, আলু ভাজি, ডাল'],
    ['পরোটা, ডাল ভুনা', 'ভাত, তেলাপিয়া মাছ, ডাল', 'রুটি, সবজি খিচুড়ি'],
    ['ভুনা খিচুড়ি', 'ভাত, গরুর মাংস, ডাল', 'রুটি, ডিম ভুনা'],
    ['নান রুটি, ডিম', 'ভাত, মুরগির কারি, ডাল', 'রুটি, মিক্সড সবজি'],
    ['পরোটা, সবজি', 'ভাত, ইলিশ মাছ, ডাল', 'রুটি, ডাল, সালাদ'],
  ],
  golden: [
    ['পরোটা, ডিম ভাজি, চা', 'ভাত, মুরগির রোস্ট, ডাল, সালাদ', 'রুটি, বিফ কারি, সবজি'],
    ['ভুনা খিচুড়ি, ডিম, আচার', 'ভাত, রুই মাছ ভুনা, ডাল, সালাদ', 'পোলাও, চিকেন কারি'],
    ['নান রুটি, চিকেন কিমা', 'ভাত, গরুর মাংস ভুনা, ডাল', 'রুটি, ডিম কারি, সবজি'],
    ['পরোটা, ডাল ভুনা, ডিম', 'ভাত, চিংড়ি মালাইকারি, ডাল', 'রুটি, সবজি, ডাল, সালাদ'],
    ['লুচি, আলুর দম', 'ভাত, খাসির মাংস, ডাল', 'পোলাও, ডিম কারি'],
    ['পরোটা, চিকেন ঝাল ফ্রাই', 'ভাত, ইলিশ মাছ, ডাল, সালাদ', 'রুটি, বিফ ভুনা'],
    ['খিচুড়ি, গরুর মাংস', 'কাচ্চি বিরিয়ানি, বোরহানি', 'রুটি, মিক্সড সবজি, ডাল'],
  ],
  premium: [
    ['পরোটা, চিকেন কিমা, ডিম, চা', 'কাচ্চি বিরিয়ানি, বোরহানি, সালাদ', 'নান, বিফ শিক কাবাব, সালাদ'],
    ['লুচি, আলুর দম, মিষ্টি', 'ভাত, চিংড়ি মালাইকারি, ডাল, সালাদ', 'পোলাও, চিকেন রোস্ট, বোরহানি'],
    ['নান রুটি, চিকেন কষা, চা', 'ভাত, খাসির রেজালা, ডাল, সালাদ', 'তেহারি, ডিম কারি, সালাদ'],
    ['পরোটা, বিফ ভুনা, ডিম', 'ভাত, ইলিশ ভাপা, ডাল, সালাদ', 'নান, চিকেন টিক্কা, সালাদ'],
    ['ভুনা খিচুড়ি, গরুর মাংস', 'মোরগ পোলাও, ডিম, সালাদ', 'রুটি, খাসির মাংস, সবজি'],
    ['পরোটা, চিকেন ঝাল ফ্রাই, চা', 'ভাত, রুই মাছ দোপেঁয়াজা, ডাল', 'কাচ্চি বিরিয়ানি, বোরহানি'],
    ['লুচি, মাংস, মিষ্টি', 'ভাত, চিংড়ি ভুনা, ডাল, সালাদ', 'পোলাও, বিফ কারি, সালাদ'],
  ],
};

const menuPrices: Record<string, [number, number, number]> = {
  basic: [60, 120, 90],
  golden: [90, 180, 140],
  premium: [130, 260, 200],
};

export const mockWeeklyMenu: Record<string, MockMenuDay[]> = Object.fromEntries(
  Object.entries(menuSeeds).map(([pkg, seeds]) => [
    pkg,
    seeds.map((seed, i) => ({
      _id: `menu_${pkg}_${i}`,
      day: DAYS[i],
      package: pkg,
      morning: seed[0],
      lunch: seed[1],
      dinner: seed[2],
      morningPrice: menuPrices[pkg][0],
      lunchPrice: menuPrices[pkg][1],
      dinnerPrice: menuPrices[pkg][2],
      isActive: true,
    })),
  ])
);

/* ------------------------------------------------------------------ */
/* Signed-in user                                                      */
/* ------------------------------------------------------------------ */

export const mockUser: MockUser = {
  _id: 'user_1',
  fullName: 'কাউসারুল ইসলাম',
  email: 'kauser@example.com',
  phoneNumber: '01711223344',
  zone: mockZones[0],
  address: 'বাড়ি ১২, রোড ৭, সেক্টর ৪, উত্তরা, ঢাকা',
  walletBalance: 2450,
  role: 'user',
  isActive: true,
};

/* ------------------------------------------------------------------ */
/* Orders / subscriptions / transactions                               */
/* ------------------------------------------------------------------ */

const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

export const mockOrders: MockOrder[] = [
  {
    _id: 'order_1',
    orderNumber: 'FB-10241',
    userId: mockUser._id,
    phoneNumber: mockUser.phoneNumber,
    address: mockUser.address,
    zone: mockZones[0],
    package: 'golden',
    deliveryDate: daysFromNow(1),
    deliveryTime: 'lunch',
    meals: [{ type: 'self', meal: 'ভাত, মুরগির রোস্ট, ডাল, সালাদ', price: 180, quantity: 1 }],
    totalAmount: 220,
    deliveryCharge: 40,
    paymentMethod: 'wallet',
    status: 'confirmed',
    createdAt: daysFromNow(-1),
  },
  {
    _id: 'order_2',
    orderNumber: 'FB-10238',
    userId: mockUser._id,
    phoneNumber: mockUser.phoneNumber,
    address: mockUser.address,
    zone: mockZones[0],
    package: 'golden',
    deliveryDate: daysFromNow(-2),
    deliveryTime: 'dinner',
    meals: [
      { type: 'self', meal: 'পোলাও, চিকেন কারি', price: 140, quantity: 1 },
      { type: 'guest', meal: 'পোলাও, চিকেন কারি', price: 140, quantity: 2 },
    ],
    totalAmount: 460,
    deliveryCharge: 40,
    paymentMethod: 'wallet',
    status: 'delivered',
    createdAt: daysFromNow(-3),
  },
  {
    _id: 'order_3',
    orderNumber: 'FB-10230',
    userId: mockUser._id,
    phoneNumber: mockUser.phoneNumber,
    address: mockUser.address,
    zone: mockZones[0],
    package: 'basic',
    deliveryDate: daysFromNow(-6),
    deliveryTime: 'morning',
    meals: [{ type: 'self', meal: 'পরোটা, ডিম ভাজি', price: 60, quantity: 1 }],
    totalAmount: 100,
    deliveryCharge: 40,
    paymentMethod: 'cod',
    status: 'cancelled',
    cancelReason: 'পরিকল্পনা পরিবর্তন হয়েছে',
    createdAt: daysFromNow(-7),
  },
];

export const mockSubscriptions: MockSubscription[] = [
  {
    _id: 'sub_1',
    userId: mockUser._id,
    package: 'golden',
    paymentMethod: 'bkash',
    address: mockUser.address,
    zone: mockZones[0]._id,
    status: 'active',
    startDate: daysFromNow(-10),
    endDate: daysFromNow(20),
    createdAt: daysFromNow(-11),
  },
];

export const mockTransactions: MockTransaction[] = [
  {
    _id: 'txn_1',
    userId: mockUser._id,
    userName: mockUser.fullName,
    amount: 3000,
    transactionId: 'BKS7X92MQ1',
    paymentMethod: 'bkash',
    status: 'approved',
    type: 'recharge',
    createdAt: daysFromNow(-10),
  },
  {
    _id: 'txn_2',
    userId: mockUser._id,
    userName: mockUser.fullName,
    amount: 460,
    transactionId: 'ORD-10238',
    paymentMethod: 'wallet',
    status: 'approved',
    type: 'order',
    createdAt: daysFromNow(-3),
  },
  {
    _id: 'txn_3',
    userId: mockUser._id,
    userName: mockUser.fullName,
    amount: 1000,
    transactionId: 'NGD44K1L09',
    paymentMethod: 'nagad',
    status: 'pending',
    type: 'recharge',
    createdAt: daysFromNow(-1),
  },
];

/** Dates the kitchen is closed — used by the order deadline checks. */
export const mockBlockedDates: string[] = [];
