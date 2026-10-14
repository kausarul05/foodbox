/** Seed rows used by POST /api/setup. Carried over from the Express setupRoutes. */

export const mymensinghZones = [
  { name: 'mymensingh_sadar', nameBn: 'ময়মনসিংহ সদর', deliveryCharge: 30, isActive: true, isCustom: false },
  { name: 'kewatkhali', nameBn: 'কেওয়াটখালী', deliveryCharge: 35, isActive: true, isCustom: false },
  { name: 'academic_more', nameBn: 'একাডেমিক মোড়', deliveryCharge: 30, isActive: true, isCustom: false },
  { name: 'notun_bazar', nameBn: 'নতুন বাজার', deliveryCharge: 30, isActive: true, isCustom: false },
  { name: 'town_hall', nameBn: 'টাউন হল', deliveryCharge: 30, isActive: true, isCustom: false },
  { name: 'ganginar_par', nameBn: 'গাঙ্গিনার পাড়', deliveryCharge: 35, isActive: true, isCustom: false },
  { name: 'choto_bazar', nameBn: 'ছোট বাজার', deliveryCharge: 30, isActive: true, isCustom: false },
  { name: 'bottola', nameBn: 'বটতলা', deliveryCharge: 30, isActive: true, isCustom: false },
  { name: 'maskanda', nameBn: 'মাসকান্দা', deliveryCharge: 40, isActive: true, isCustom: false },
  { name: 'valuka', nameBn: 'ভালুকা', deliveryCharge: 50, isActive: true, isCustom: false },
  { name: 'trishal', nameBn: 'ত্রিশাল', deliveryCharge: 50, isActive: true, isCustom: false },
  { name: 'muktagacha', nameBn: 'মুক্তাগাছা', deliveryCharge: 60, isActive: true, isCustom: false },
  { name: 'fulbaria', nameBn: 'ফুলবাড়ীয়া', deliveryCharge: 60, isActive: true, isCustom: false },
  { name: 'haluaghat', nameBn: 'হালুয়াঘাট', deliveryCharge: 70, isActive: true, isCustom: false },
  { name: 'gouripur', nameBn: 'গৌরীপুর', deliveryCharge: 70, isActive: true, isCustom: false },
  { name: 'ishwarganj', nameBn: 'ঈশ্বরগঞ্জ', deliveryCharge: 70, isActive: true, isCustom: false },
  { name: 'nandail', nameBn: 'নান্দাইল', deliveryCharge: 75, isActive: true, isCustom: false },
  { name: 'phulpur', nameBn: 'ফুলপুর', deliveryCharge: 75, isActive: true, isCustom: false },
];

// Subscription fee for 30 days — non-refundable. Meals are paid from the wallet.
const PACKAGE_COMMON = [
  'খাবারের দাম ওয়ালেট থেকে — ডেলিভারির পরেই কাটা হয়',
  'ফ্রি হোম ডেলিভারি',
  'খাবারের বক্স (১০০ টাকা ফেরতযোগ্য ডিপোজিট)',
];

export const defaultPackages = [
  {
    name: 'basic',
    title: 'বেসিক প্যাকেজ',
    price: 70,
    originalPrice: 70,
    features: ['৩০ দিনের সাবস্ক্রিপশন', 'বেসিক মেনু থেকে প্রতিদিন অর্ডার', ...PACKAGE_COMMON],
    duration: 30,
    discount: 0,
    isActive: true,
  },
  {
    name: 'standard',
    title: 'স্ট্যান্ডার্ড প্যাকেজ',
    price: 90,
    originalPrice: 90,
    features: [
      '৩০ দিনের সাবস্ক্রিপশন',
      'স্ট্যান্ডার্ড মেনু — আরও বেশি পদ',
      ...PACKAGE_COMMON,
      'সাবস্ক্রাইবার হোয়াটসঅ্যাপ গ্রুপে মেনুর আপডেট',
    ],
    duration: 30,
    discount: 0,
    isActive: true,
  },
  {
    name: 'premium',
    title: 'প্রিমিয়াম প্যাকেজ',
    price: 120,
    originalPrice: 120,
    features: [
      '৩০ দিনের সাবস্ক্রিপশন',
      'প্রিমিয়াম মেনু — সবচেয়ে বেশি ও বিশেষ পদ',
      ...PACKAGE_COMMON,
      'সাবস্ক্রাইবার হোয়াটসঅ্যাপ গ্রুপে মেনুর আপডেট',
      'প্রায়োরিটি সাপোর্ট',
    ],
    duration: 30,
    discount: 0,
    isActive: true,
  },
];

export const defaultMenuItems = [
  { day: 'শনিবার', morning: 'খিচুড়ি + ডিম', lunch: 'মুরগি ভুনা + ভাত + ডাল', dinner: 'মাছ ভাজা + ভাত + ডাল', morningPrice: 50, lunchPrice: 80, dinnerPrice: 100 },
  { day: 'রবিবার', morning: 'ভাত + ডাল + ভাজি', lunch: 'মাছ ভাজা + ভাত + ডাল', dinner: 'ডিম ভুনা + ভাত + ডাল', morningPrice: 50, lunchPrice: 80, dinnerPrice: 100 },
  { day: 'সোমবার', morning: 'খিচুড়ি + ডিম + সবজি', lunch: 'মুরগি রোস্ট + ভাত + ডাল', dinner: 'স্টিকি + ভাত + ডাল', morningPrice: 50, lunchPrice: 80, dinnerPrice: 100 },
  { day: 'মঙ্গলবার', morning: 'ভাত + ডাল + ভাজি + ডিম', lunch: 'মাছ ভাজা + ভাত + ডাল', dinner: 'ডিম ভুনা + ভাত + ডাল', morningPrice: 50, lunchPrice: 80, dinnerPrice: 100 },
  { day: 'বুধবার', morning: 'খিচুড়ি + ডিম', lunch: 'স্টিকি চিকেন + ভাত + ডাল', dinner: 'মুরগি ভুনা + ভাত + ডাল', morningPrice: 50, lunchPrice: 80, dinnerPrice: 100 },
  { day: 'বৃহস্পতিবার', morning: 'ডিম ভুনা + ভাত + ডাল + ভর্তা', lunch: 'মুরগি ভুনা + ভাত + ডাল', dinner: 'মাছ ভাজা + ভাত + ডাল', morningPrice: 50, lunchPrice: 80, dinnerPrice: 100 },
  { day: 'শুক্রবার', morning: 'বিরিয়ানি + ডিম', lunch: 'গরুর মাংস + পোলাও + ডাল', dinner: 'রুটি + মুরগি মুসল্লম + স্যালাড', morningPrice: 80, lunchPrice: 150, dinnerPrice: 130 },
] as const;
