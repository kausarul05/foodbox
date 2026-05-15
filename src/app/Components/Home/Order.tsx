'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Calendar,
  Phone,
  MapPin,
  Home,
  CheckCircle,
  CreditCard,
  Loader2,
  LogIn,
  AlertCircle,
  ShoppingBag,
  Clock,
  Wallet,
  Truck,
  Crown,
  X,
  Coffee,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { orderAPI, subscriptionAPI, menuAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import ZoneSelect from '@/components/ui/ZoneSelect';

interface MenuItem {
  day: string;
  morning: string;
  lunch: string;
  dinner: string;
}

interface MealSelection {
  morning: boolean;
  lunch: boolean;
  dinner: boolean;
}

interface DayOrder {
  date: string;
  dayName: string;
  meals: MealSelection;
  morningMeal?: string;
  lunchMeal?: string;
  dinnerMeal?: string;
  isExpanded: boolean;
}

interface MealPrice {
  morning: number;
  lunch: number;
  dinner: number;
}

export default function OrderPage() {
  const router = useRouter();
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [availableMenu, setAvailableMenu] = useState<MenuItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'cod'>('cod');
  const [walletBalance, setWalletBalance] = useState(0);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [dailyOrders, setDailyOrders] = useState<DayOrder[]>([]);
  const [mealsPerDay, setMealsPerDay] = useState<'1' | '2' | '3'>('3');
  const [selectedMealType, setSelectedMealType] = useState<'all' | 'morning' | 'lunch' | 'dinner'>('all');
  //  const [selectedZone, setSelectedZone] = useState('');

  const mealPrices: MealPrice = {
    morning: 50,
    lunch: 80,
    dinner: 100
  };

  const deliveryChargePerDay = 15;
  const daysOfWeek = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

  const zones = ['উত্তরা', 'ধানমন্ডি', 'গুলশান', 'বনানী', 'মিরপুর', 'মোহাম্মদপুর', 'পুরান ঢাকা', 'যাত্রাবাড়ী', 'নিউ মার্কেট', 'বসুন্ধরা'];

  // Meal type options
  const mealTypeOptions = [
    { value: 'all', label: 'সব বেলা', icon: null },
    { value: 'morning', label: 'সকাল', icon: Coffee },
    { value: 'lunch', label: 'দুপুর', icon: Sun },
    { value: 'dinner', label: 'রাত', icon: Moon },
  ];

  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    setStartDate(tomorrow.toISOString().split('T')[0]);

    const end = new Date(tomorrow);
    end.setDate(end.getDate() + 6);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  useEffect(() => {
    if (startDate && endDate && availableMenu.length > 0) {
      initializeDailyOrders();
    }
  }, [startDate, endDate, availableMenu, mealsPerDay, selectedMealType]);

  const checkLoginStatus = async () => {
    const token = localStorage.getItem('userToken');
    const user = localStorage.getItem('userData');

    if (token && user) {
      setIsLoggedIn(true);
      const userInfo = JSON.parse(user);
      setUserData(userInfo);
      setWalletBalance(userInfo.walletBalance || 0);

      if (userInfo.phoneNumber) setPhoneNumber(userInfo.phoneNumber);
      if (userInfo.zone) setSelectedZone(userInfo.zone);
      if (userInfo.address) setAddress(userInfo.address);

      await checkSubscriptionStatus();
    } else {
      setIsLoggedIn(false);
      setLoading(false);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      const response = await subscriptionAPI.getMySubscriptions();
      if (response.success && response.data) {
        console.log("response data", response?.walletBalance)
        const activeSub = response.data.find((sub: any) => sub.status === 'active');
        if (activeSub) {
          setHasActiveSubscription(true);
          setSubscriptionData(activeSub);
          setWalletBalance(response.walletBalance || 0);
          await fetchMenu(activeSub.package);
          setPaymentMethod('wallet');
        } else {
          setHasActiveSubscription(false);
          await fetchMenu('golden');
          setPaymentMethod('cod');
          setShowSubscriptionModal(true);
        }
      } else {
        setHasActiveSubscription(false);
        await fetchMenu('golden');
        setPaymentMethod('cod');
        setShowSubscriptionModal(true);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setHasActiveSubscription(false);
      await fetchMenu('golden');
      setPaymentMethod('cod');
      setShowSubscriptionModal(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenu = async (packageType: string) => {
    try {
      const response = await menuAPI.getMenuByPackage(packageType);
      if (response.success && response.data) {
        setAvailableMenu(response.data);
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
    }
  };

  const getDayName = (date: string) => {
    const dayIndex = new Date(date).getDay();
    return daysOfWeek[dayIndex];
  };

  const getMealForDay = (dayName: string, mealType: string) => {
    const menu = availableMenu.find(m => m.day === dayName);
    if (!menu) return null;
    switch (mealType) {
      case 'morning': return menu.morning;
      case 'lunch': return menu.lunch;
      case 'dinner': return menu.dinner;
      default: return null;
    }
  };

  const getDatesInRange = (start: string, end: string) => {
    const dates = [];
    let currentDate = new Date(start);
    const endDate = new Date(end);
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate).toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  };

  const initializeDailyOrders = () => {
    const dates = getDatesInRange(startDate, endDate);
    const orders: DayOrder[] = [];

    for (const date of dates) {
      const dayName = getDayName(date);
      let meals: MealSelection = { morning: false, lunch: false, dinner: false };

      if (selectedMealType === 'morning') {
        meals = { morning: true, lunch: false, dinner: false };
      } else if (selectedMealType === 'lunch') {
        meals = { morning: false, lunch: true, dinner: false };
      } else if (selectedMealType === 'dinner') {
        meals = { morning: false, lunch: false, dinner: true };
      } else if (mealsPerDay === '3') {
        meals = { morning: true, lunch: true, dinner: true };
      } else if (mealsPerDay === '2') {
        meals = { morning: true, lunch: true, dinner: false };
      } else if (mealsPerDay === '1') {
        meals = { morning: true, lunch: false, dinner: false };
      }

      orders.push({
        date,
        dayName,
        meals,
        morningMeal: getMealForDay(dayName, 'morning') || undefined,
        lunchMeal: getMealForDay(dayName, 'lunch') || undefined,
        dinnerMeal: getMealForDay(dayName, 'dinner') || undefined,
        isExpanded: false,
      });
    }
    setDailyOrders(orders);
  };

  const toggleDayExpand = (date: string) => {
    setDailyOrders(prev => prev.map(order =>
      order.date === date ? { ...order, isExpanded: !order.isExpanded } : order
    ));
  };

  const updateMealSelection = (date: string, mealType: keyof MealSelection) => {
    setDailyOrders(prev => prev.map(order => {
      if (order.date === date) {
        return {
          ...order,
          meals: { ...order.meals, [mealType]: !order.meals[mealType] }
        };
      }
      return order;
    }));
  };

  const updateMealsPerDay = (value: '1' | '2' | '3') => {
    setMealsPerDay(value);
    setSelectedMealType('all');
  };

  const updateSelectedMealType = (value: 'all' | 'morning' | 'lunch' | 'dinner') => {
    setSelectedMealType(value);
    if (value !== 'all') {
      setMealsPerDay('1');
    }
  };

  const calculateTotalPrice = () => {
    let totalMealPrice = 0;
    let totalDeliveryCharge = 0;
    let daysWithOrders = 0;

    for (const order of dailyOrders) {
      let hasAnyMeal = false;
      if (order.meals.morning) {
        totalMealPrice += mealPrices.morning;
        hasAnyMeal = true;
      }
      if (order.meals.lunch) {
        totalMealPrice += mealPrices.lunch;
        hasAnyMeal = true;
      }
      if (order.meals.dinner) {
        totalMealPrice += mealPrices.dinner;
        hasAnyMeal = true;
      }
      if (hasAnyMeal) {
        daysWithOrders++;
      }
    }

    totalDeliveryCharge = daysWithOrders * deliveryChargePerDay;

    return {
      mealPrice: totalMealPrice,
      deliveryCharge: totalDeliveryCharge,
      total: totalMealPrice + totalDeliveryCharge,
      daysWithOrders
    };
  };

  const handleLoginRedirect = () => router.push('/login');
  const handleSubscribeRedirect = () => {
    setShowSubscriptionModal(false);
    router.push('/subscription');
  };

  const openConfirmModal = () => {
    const total = calculateTotalPrice().total;
    if (total === 0) {
      toast.error('দয়া করে কমপক্ষে একটি খাবার নির্বাচন করুন');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleZoneChange = (zoneId: string, customZoneName?: string) => {
    setSelectedZone(zoneId);
  };

  const handleSubmit = async () => {
    setShowConfirmModal(false);

    try {
      setSubmitting(true);
      const orders = [];

      for (const order of dailyOrders) {
        const meals = [];
        if (order.meals.morning && order.morningMeal) {
          meals.push({
            name: order.morningMeal,
            price: mealPrices.morning,
            quantity: 1,
            time: 'morning'
          });
        }
        if (order.meals.lunch && order.lunchMeal) {
          meals.push({
            name: order.lunchMeal,
            price: mealPrices.lunch,
            quantity: 1,
            time: 'lunch'
          });
        }
        if (order.meals.dinner && order.dinnerMeal) {
          meals.push({
            name: order.dinnerMeal,
            price: mealPrices.dinner,
            quantity: 1,
            time: 'dinner'
          });
        }

        for (const meal of meals) {
          const orderData = {
            items: [{ name: meal.name, price: meal.price, quantity: 1 }],
            totalAmount: meal.price,
            deliveryCharge: 0,
            paymentMethod: hasActiveSubscription ? 'wallet' : 'cash',
            deliveryDate: order.date,
            deliveryTime: meal.time,
            address: address,
            zone: selectedZone,
            specialInstructions: '',
            package: subscriptionData?.packageName || 'Regular',
          };

          const orderResponse = await orderAPI.createOrder(orderData);
          if (orderResponse.success) {
            orders.push(orderResponse.data);
            if (orderResponse.walletBalance) {
              setWalletBalance(orderResponse.walletBalance);
              const updatedUser = { ...userData, walletBalance: orderResponse.walletBalance };
              localStorage.setItem('userData', JSON.stringify(updatedUser));
              setUserData(updatedUser);
            }
          }
        }
      }

      if (orders.length > 0) {
        toast.success(`${orders.length}টি অর্ডার সফলভাবে সম্পন্ন হয়েছে!`);

        // Reset dates to next week
        const nextWeek = new Date(endDate);
        nextWeek.setDate(nextWeek.getDate() + 1);
        setStartDate(nextWeek.toISOString().split('T')[0]);
        const nextWeekEnd = new Date(nextWeek);
        nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);
        setEndDate(nextWeekEnd.toISOString().split('T')[0]);
      } else {
        toast.error('কোনো অর্ডার তৈরি করা যায়নি');
      }

    } catch (error: any) {
      console.error('Error placing order:', error);
      toast.error(error.message || 'অর্ডার করতে ব্যর্থ হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPrice = calculateTotalPrice();

  if (loading) {
    return (
      <section className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="w-12 h-12 text-[#3B82F6] animate-spin mb-4" />
            <p className="text-gray-500 text-lg">লোড হচ্ছে...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gray-50 py-8 px-4 mt-10 md:mt-5">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white mb-4">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">অর্ডার করুন</h1>
          <p className="text-gray-600">আপনার পছন্দের খাবার অর্ডার করুন</p>
        </div>

        {/* Subscription Prompt Modal */}
        {showSubscriptionModal && !hasActiveSubscription && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Crown className="w-6 h-6 text-[#3B82F6]" />
                  <h3 className="text-xl font-bold text-gray-800">সাবস্ক্রিপশন অফার!</h3>
                </div>
                <button onClick={() => setShowSubscriptionModal(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X size={20} />
                </button>
              </div>
              <div className="text-center mb-6">
                <div className="bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white p-4 rounded-xl mb-4">
                  <p className="text-lg font-bold">সাবস্ক্রাইব করুন এবং ছাড় নিন!</p>
                  <p className="text-sm mt-2">সাবস্ক্রিপশন নিলে অর্ডারে ছাড় + ফ্রি ডেলিভারি</p>
                </div>
                <ul className="text-left space-y-2 text-gray-600">
                  <li className="flex items-center gap-2">✓ সপ্তাহের ৭ দিন ডেলিভারি</li>
                  <li className="flex items-center gap-2">✓ প্রতিদিন ৩ বেলা খাবার</li>
                  <li className="flex items-center gap-2">✓ ফ্রি হোম ডেলিভারি</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSubscriptionModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  পরবর্তীতে
                </button>
                <button
                  onClick={handleSubscribeRedirect}
                  className="flex-1 bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white py-2 rounded-lg font-semibold"
                >
                  সাবস্ক্রাইব করুন
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Order Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">অর্ডার কনফার্মেশন</h3>
                <button onClick={() => setShowConfirmModal(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-gray-600">অর্ডার বিবরণ:</p>
                  <div className="mt-2 space-y-1 text-black">
                    <div className="flex justify-between">
                      <span>খাবারের মূল্য:</span>
                      <span className="font-semibold">৳ {totalPrice.mealPrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ডেলিভারি চার্জ:</span>
                      <span className="font-semibold">৳ {totalPrice.deliveryCharge}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-bold">
                        <span>মোট:</span>
                        <span className="text-[#3B82F6]">৳ {totalPrice.total}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 rounded-xl p-3">
                  <p className="text-sm text-yellow-800">পেমেন্ট মেথড: {hasActiveSubscription ? 'ওয়ালেট' : 'ক্যাশ অন ডেলিভারি'}</p>
                  <p className="text-sm text-yellow-800 mt-1">ডেলিভারি ঠিকানা: {address}</p>
                  <p className="text-sm text-yellow-800">ফোন: {phoneNumber}</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  বাতিল
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white py-2 rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'অর্ডার নিশ্চিত করুন'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Login Required */}
        {!isLoggedIn && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 text-center">
            <div className="bg-yellow-100 p-4 rounded-full w-fit mx-auto mb-4">
              <LogIn className="w-12 h-12 text-yellow-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">লগইন প্রয়োজন</h2>
            <p className="text-gray-600 mb-6">অর্ডার করতে অনুগ্রহ করে আপনার অ্যাকাউন্টে লগইন করুন</p>
            <button
              onClick={handleLoginRedirect}
              className="bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 mx-auto"
            >
              <LogIn size={20} />
              লগইন করুন
            </button>
          </div>
        )}

        {/* Order Form */}
        {isLoggedIn && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6">
              <form onSubmit={(e) => { e.preventDefault(); openConfirmModal(); }}>
                {/* User Info & Wallet */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-gray-600 text-sm">স্বাগতম,</p>
                      <p className="font-semibold text-gray-800">{userData?.fullName}</p>
                    </div>
                    {hasActiveSubscription && (
                      <div className="text-right">
                        <p className="text-gray-600 text-sm flex items-center gap-1">
                          <Wallet size={14} /> ওয়ালেট ব্যালেন্স
                        </p>
                        <p className="text-2xl font-bold text-[#3B82F6]">৳ {walletBalance}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Meal Type Selection - Single Meal Option */}
                <div className="mb-6">
                  <label className="block text-gray-700 font-medium mb-2">
                    <Info className="w-4 h-4 inline mr-2 text-[#3B82F6]" />
                    খাবার নির্বাচন
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {mealTypeOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateSelectedMealType(option.value as any)}
                          className={`py-2 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-1 ${selectedMealType === option.value
                            ? 'bg-[#3B82F6] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                          {Icon && <Icon size={14} />}
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Meals Per Day Selection - Only show when 'all' is selected */}
                {selectedMealType === 'all' && (
                  <div className="mb-6">
                    <label className="block text-gray-700 font-medium mb-2">
                      প্রতিদিন কত বেলা খাবার নিবেন?
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => updateMealsPerDay('1')}
                        className={`py-2 rounded-lg font-semibold transition-all ${mealsPerDay === '1' ? 'bg-[#3B82F6] text-white' : 'bg-gray-100 text-gray-700'}`}
                      >
                        ১ বেলা (সকাল)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateMealsPerDay('2')}
                        className={`py-2 rounded-lg font-semibold transition-all ${mealsPerDay === '2' ? 'bg-[#3B82F6] text-white' : 'bg-gray-100 text-gray-700'}`}
                      >
                        ২ বেলা (সকাল+দুপুর)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateMealsPerDay('3')}
                        className={`py-2 rounded-lg font-semibold transition-all ${mealsPerDay === '3' ? 'bg-[#3B82F6] text-white' : 'bg-gray-100 text-gray-700'}`}
                      >
                        ৩ বেলা (সকাল+দুপুর+রাত)
                      </button>
                    </div>
                  </div>
                )}

                {/* Date Range Selection */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">
                      <Calendar className="w-4 h-4 inline mr-2 text-[#3B82F6]" />
                      শুরু তারিখ
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">
                      <Calendar className="w-4 h-4 inline mr-2 text-[#3B82F6]" />
                      শেষ তারিখ
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                      min={startDate}
                      required
                    />
                  </div>
                </div>

                {/* Daily Order Cards - Collapsible */}
                <div className="mb-6 space-y-3 max-h-[500px] overflow-y-auto">
                  <h3 className="font-semibold text-gray-800 mb-2 sticky top-0 bg-white py-2">দৈনিক খাবার নির্বাচন</h3>
                  {dailyOrders.map((order) => (
                    <div key={order.date} className="border border-gray-200 rounded-xl overflow-hidden">
                      {/* Collapsible Header */}
                      <button
                        type="button"
                        onClick={() => toggleDayExpand(order.date)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-gray-800">
                            {order.dayName} - {new Date(order.date).toLocaleDateString('bn-BD')}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {order.meals.morning && '🌅 সকাল '}
                            {order.meals.lunch && '☀️ দুপুর '}
                            {order.meals.dinner && '🌙 রাত '}
                            {!order.meals.morning && !order.meals.lunch && !order.meals.dinner && 'কোন খাবার নির্বাচিত হয়নি'}
                          </div>
                        </div>
                        {order.isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>

                      {/* Collapsible Content */}
                      {order.isExpanded && (
                        <div className="p-4 space-y-3 border-t border-gray-200">
                          {/* Morning */}
                          <label className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={order.meals.morning}
                                onChange={() => updateMealSelection(order.date, 'morning')}
                                className="w-5 h-5 text-[#3B82F6] rounded"
                              />
                              <Coffee size={18} className="text-amber-500" />
                              <span className="text-gray-700">সকালের খাবার</span>
                              <span className="text-sm text-gray-500">({order.morningMeal})</span>
                            </div>
                            <span className="text-[#3B82F6] font-semibold">৳{mealPrices.morning}</span>
                          </label>

                          {/* Lunch */}
                          <label className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={order.meals.lunch}
                                onChange={() => updateMealSelection(order.date, 'lunch')}
                                className="w-5 h-5 text-[#3B82F6] rounded"
                              />
                              <Sun size={18} className="text-yellow-500" />
                              <span className="text-gray-700">দুপুরের খাবার</span>
                              <span className="text-sm text-gray-500">({order.lunchMeal})</span>
                            </div>
                            <span className="text-[#3B82F6] font-semibold">৳{mealPrices.lunch}</span>
                          </label>

                          {/* Dinner */}
                          <label className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={order.meals.dinner}
                                onChange={() => updateMealSelection(order.date, 'dinner')}
                                className="w-5 h-5 text-[#3B82F6] rounded"
                              />
                              <Moon size={18} className="text-blue-500" />
                              <span className="text-gray-700">রাতের খাবার</span>
                              <span className="text-sm text-gray-500">({order.dinnerMeal})</span>
                            </div>
                            <span className="text-[#3B82F6] font-semibold">৳{mealPrices.dinner}</span>
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Order Summary */}
                <div className="bg-blue-50 rounded-xl p-4 mb-6">
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#3B82F6]" />
                    অর্ডার সামারি
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">খাবারের মূল্য:</span>
                      <span className="font-semibold text-black">৳ {totalPrice.mealPrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ডেলিভারি চার্জ ({totalPrice.daysWithOrders} দিন x ৳{deliveryChargePerDay}):</span>
                      <span className="font-semibold text-black">৳ {totalPrice.deliveryCharge}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-bold text-lg">
                        <span className="text-gray-800">মোট মূল্য:</span>
                        <span className="text-[#3B82F6]">৳ {totalPrice.total}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">
                    <Phone className="w-4 h-4 inline mr-2 text-[#3B82F6]" />
                    ফোন নাম্বার
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                    placeholder="+8801XXXXXXXXX"
                    required
                  />
                </div>

                {/* Zone Selection */}
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">
                    <MapPin className="w-4 h-4 inline mr-2 text-[#3B82F6]" />
                    জোন / এলাকা
                  </label>
                  <ZoneSelect
                    value={selectedZone}
                    onChange={handleZoneChange}
                    required
                    label="জোন / এলাকা"
                  />
                </div>

                {/* Address */}
                <div className="mb-6">
                  <label className="block text-gray-700 font-medium mb-2">
                    <Home className="w-4 h-4 inline mr-2 text-[#3B82F6]" />
                    ডেলিভারি ঠিকানা
                  </label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                    placeholder="বিস্তারিত ঠিকানা লিখুন..."
                    required
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-br from-[#3B82F6] to-[#111827] hover:shadow-xl text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-lg text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  {submitting ? 'অর্ডার প্রসেস হচ্ছে...' : `অর্ডার করুন (৳${totalPrice.total})`}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Info Note */}
        <div className="text-center mt-6 text-gray-500 text-sm">
          <p>ডেলিভারি চার্জ: ৳{deliveryChargePerDay} প্রতি ডেলিভারি</p>
          <p className="mt-1">ডেলিভারি টাইম: সকাল ৮টা - ১০টা, দুপুর ১২টা - ২টা, রাত ৭টা - ৯টা</p>
          {!hasActiveSubscription && <p className="mt-1 text-orange-600">পেমেন্ট: ক্যাশ অন ডেলিভারি</p>}
        </div>
      </div>
    </section>
  );
}