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
  Info,
  Users,
  PlusCircle
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
  morningPrice?: number;
  lunchPrice?: number;
  dinnerPrice?: number;
}

interface MealSelection {
  morning: boolean;
  lunch: boolean;
  dinner: boolean;
}

interface DayOrder {
  date: string;
  dayName: string;
  selfMeals: MealSelection;
  guestMeals: MealSelection;
  morningMeal?: string;
  lunchMeal?: string;
  dinnerMeal?: string;
  isExpanded: boolean;
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
  const [walletBalance, setWalletBalance] = useState(0);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showInsufficientBalanceModal, setShowInsufficientBalanceModal] = useState(false);
  const [dailyOrders, setDailyOrders] = useState<DayOrder[]>([]);
  const [enableGuestMeal, setEnableGuestMeal] = useState(false);
  const [mealsPerDay, setMealsPerDay] = useState<'1' | '2' | '3'>('3');
  const [selectedMealType, setSelectedMealType] = useState<'all' | 'morning' | 'lunch' | 'dinner'>('all');
  const [requiredAmount, setRequiredAmount] = useState(0);
  const [selectedMeals, setSelectedMeals] = useState({
    morning: true,  // সকাল ডিফল্ট true
    lunch: true,    // দুপুর ডিফল্ট true
    dinner: true    // রাত ডিফল্ট true
  });

  const mealPrices = {
    morning: 50,
    lunch: 80,
    dinner: 100
  };

  const deliveryChargePerDay = 15;
  const daysOfWeek = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

  const mealTypeOptions = [
    { value: 'all', label: 'সব বেলা', icon: null },
    { value: 'morning', label: 'সকাল', icon: Coffee },
    { value: 'lunch', label: 'দুপুর', icon: Sun },
    { value: 'dinner', label: 'রাত', icon: Moon },
  ];

  useEffect(() => {
    if (startDate && endDate && availableMenu.length > 0) {
      initializeDailyOrders();
    }
  }, [startDate, endDate, availableMenu, selectedMeals]);

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
        const activeSub = response.data.find((sub: any) => sub.status === 'active');
        if (activeSub) {
          setHasActiveSubscription(true);
          setSubscriptionData(activeSub);
          setWalletBalance(response.walletBalance || 0);
          await fetchMenu(activeSub.package);
        } else {
          setHasActiveSubscription(false);
          await fetchMenu('basic');
          setShowSubscriptionModal(true);
        }
      } else {
        setHasActiveSubscription(false);
        await fetchMenu('basic');
        setShowSubscriptionModal(true);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setHasActiveSubscription(false);
      await fetchMenu('basic');
      setShowSubscriptionModal(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenu = async (packageType: string) => {
    try {
      const response = await menuAPI.getMenuByPackage(packageType);
      if (response.success && response.data) {
        const menuWithPrices = response.data.map((item: any) => ({
          ...item,
          morningPrice: item.morningPrice || 50,
          lunchPrice: item.lunchPrice || 80,
          dinnerPrice: item.dinnerPrice || 100,
        }));
        setAvailableMenu(menuWithPrices);
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
      case 'morning': return { name: menu.morning, price: menu.morningPrice };
      case 'lunch': return { name: menu.lunch, price: menu.lunchPrice };
      case 'dinner': return { name: menu.dinner, price: menu.dinnerPrice };
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
      orders.push({
        date,
        dayName,
        selfMeals: selectedMeals,  // স্টেট থেকে নিবে
        guestMeals: { morning: false, lunch: false, dinner: false },
        morningMeal: getMealForDay(dayName, 'morning')?.name,
        lunchMeal: getMealForDay(dayName, 'lunch')?.name,
        dinnerMeal: getMealForDay(dayName, 'dinner')?.name,
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

  const updateSelfMeal = (date: string, mealType: keyof MealSelection) => {
    setDailyOrders(prev => prev.map(order => {
      if (order.date === date) {
        return {
          ...order,
          selfMeals: { ...order.selfMeals, [mealType]: !order.selfMeals[mealType] }
        };
      }
      return order;
    }));
  };

  const updateGuestMeal = (date: string, mealType: keyof MealSelection) => {
    setDailyOrders(prev => prev.map(order => {
      if (order.date === date) {
        return {
          ...order,
          guestMeals: { ...order.guestMeals, [mealType]: !order.guestMeals[mealType] }
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
    let selfMealPrice = 0;
    let guestMealPrice = 0;
    let selfDays = 0;
    let guestDays = 0;

    for (const order of dailyOrders) {
      let hasSelfMeal = false;
      let hasGuestMeal = false;

      if (order.selfMeals.morning) {
        const meal = getMealForDay(order.dayName, 'morning');
        selfMealPrice += meal?.price || 50;
        hasSelfMeal = true;
      }
      if (order.selfMeals.lunch) {
        const meal = getMealForDay(order.dayName, 'lunch');
        selfMealPrice += meal?.price || 80;
        hasSelfMeal = true;
      }
      if (order.selfMeals.dinner) {
        const meal = getMealForDay(order.dayName, 'dinner');
        selfMealPrice += meal?.price || 100;
        hasSelfMeal = true;
      }

      if (enableGuestMeal) {
        if (order.guestMeals.morning) {
          const meal = getMealForDay(order.dayName, 'morning');
          guestMealPrice += meal?.price || 50;
          hasGuestMeal = true;
        }
        if (order.guestMeals.lunch) {
          const meal = getMealForDay(order.dayName, 'lunch');
          guestMealPrice += meal?.price || 80;
          hasGuestMeal = true;
        }
        if (order.guestMeals.dinner) {
          const meal = getMealForDay(order.dayName, 'dinner');
          guestMealPrice += meal?.price || 100;
          hasGuestMeal = true;
        }
      }

      if (hasSelfMeal) selfDays++;
      if (hasGuestMeal) guestDays++;
    }

    const selfDeliveryCharge = hasActiveSubscription ? 0 : selfDays * deliveryChargePerDay;
    const guestDeliveryCharge = guestDays * deliveryChargePerDay;

    return {
      selfTotal: selfMealPrice + selfDeliveryCharge,
      guestTotal: guestMealPrice + guestDeliveryCharge,
      total: (selfMealPrice + selfDeliveryCharge) + (guestMealPrice + guestDeliveryCharge),
      selfMealPrice,
      guestMealPrice,
      selfDeliveryCharge,
      guestDeliveryCharge,
      selfDays,
      guestDays
    };
  };

  const handleLoginRedirect = () => router.push('/login');
  const handleSubscribeRedirect = () => {
    setShowSubscriptionModal(false);
    router.push('/subscription');
  };

  const handleAddMoneyRedirect = () => {
    setShowInsufficientBalanceModal(false);
    router.push('/dashboard/wallet');
  };

  const openConfirmModal = () => {
    const totals = calculateTotalPrice();
    if (totals.selfTotal === 0 && totals.guestTotal === 0) {
      toast.error('দয়া করে কমপক্ষে একটি খাবার নির্বাচন করুন');
      return;
    }

    if (hasActiveSubscription && totals.selfMealPrice > walletBalance) {
      setRequiredAmount(totals.selfMealPrice);
      setShowInsufficientBalanceModal(true);
      return;
    }

    setShowConfirmModal(true);
  };

  const handleZoneChange = (zoneId: string) => {
    setSelectedZone(zoneId);
  };

  const checkIfDateBlocked = async (date: string) => {
    try {
      const response = await orderAPI.checkDateBlocked(date);
      if (response.success && response.isBlocked) {
        toast.error(response.message || 'এই তারিখে ডেলিভারি বন্ধ আছে');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking blocked date:', error);
      return false;
    }
  };

  const handleSubmit = async () => {
    setShowConfirmModal(false);

    const dates = getDatesInRange(startDate, endDate);
    for (const date of dates) {
      const isBlocked = await checkIfDateBlocked(date);
      if (isBlocked) {
        toast.error(`${new Date(date).toLocaleDateString('bn-BD')} তারিখে মিল বন্ধ রয়েছে`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const orders = [];

      for (const order of dailyOrders) {
        // Self meals
        if (order.selfMeals.morning && order.morningMeal) {
          const meal = getMealForDay(order.dayName, 'morning');
          const orderData = {
            items: [{ name: order.morningMeal, price: meal?.price || 50, quantity: 1 }],
            totalAmount: meal?.price || 50,
            deliveryCharge: hasActiveSubscription ? 0 : deliveryChargePerDay,
            paymentMethod: hasActiveSubscription ? 'wallet' : 'cash',
            deliveryDate: order.date,
            deliveryTime: 'morning',
            address: address,
            zone: selectedZone,
            specialInstructions: '',
            package: subscriptionData?.packageName || 'Regular',
            orderType: 'self'
          };
          const orderResponse = await orderAPI.createOrder(orderData);
          if (orderResponse.success && orderResponse.walletBalance) {
            setWalletBalance(orderResponse.walletBalance);
          }
          orders.push(orderResponse);
        }

        if (order.selfMeals.lunch && order.lunchMeal) {
          const meal = getMealForDay(order.dayName, 'lunch');
          const orderData = {
            items: [{ name: order.lunchMeal, price: meal?.price || 80, quantity: 1 }],
            totalAmount: meal?.price || 80,
            deliveryCharge: hasActiveSubscription ? 0 : deliveryChargePerDay,
            paymentMethod: hasActiveSubscription ? 'wallet' : 'cash',
            deliveryDate: order.date,
            deliveryTime: 'lunch',
            address: address,
            zone: selectedZone,
            specialInstructions: '',
            package: subscriptionData?.packageName || 'Regular',
            orderType: 'self'
          };
          const orderResponse = await orderAPI.createOrder(orderData);
          if (orderResponse.success && orderResponse.walletBalance) {
            setWalletBalance(orderResponse.walletBalance);
          }
          orders.push(orderResponse);
        }

        if (order.selfMeals.dinner && order.dinnerMeal) {
          const meal = getMealForDay(order.dayName, 'dinner');
          const orderData = {
            items: [{ name: order.dinnerMeal, price: meal?.price || 100, quantity: 1 }],
            totalAmount: meal?.price || 100,
            deliveryCharge: hasActiveSubscription ? 0 : deliveryChargePerDay,
            paymentMethod: hasActiveSubscription ? 'wallet' : 'cash',
            deliveryDate: order.date,
            deliveryTime: 'dinner',
            address: address,
            zone: selectedZone,
            specialInstructions: '',
            package: subscriptionData?.packageName || 'Regular',
            orderType: 'self'
          };
          const orderResponse = await orderAPI.createOrder(orderData);
          if (orderResponse.success && orderResponse.walletBalance) {
            setWalletBalance(orderResponse.walletBalance);
          }
          orders.push(orderResponse);
        }

        // Guest meals (only if enabled)
        if (enableGuestMeal) {
          if (order.guestMeals.morning && order.morningMeal) {
            const meal = getMealForDay(order.dayName, 'morning');
            const orderData = {
              items: [{ name: order.morningMeal, price: meal?.price || 50, quantity: 1 }],
              totalAmount: meal?.price || 50,
              deliveryCharge: deliveryChargePerDay,
              paymentMethod: 'cash',
              deliveryDate: order.date,
              deliveryTime: 'morning',
              address: address,
              zone: selectedZone,
              specialInstructions: 'Guest Meal Order',
              package: 'Guest',
              orderType: 'guest'
            };
            const orderResponse = await orderAPI.createOrder(orderData);
            orders.push(orderResponse);
          }

          if (order.guestMeals.lunch && order.lunchMeal) {
            const meal = getMealForDay(order.dayName, 'lunch');
            const orderData = {
              items: [{ name: order.lunchMeal, price: meal?.price || 80, quantity: 1 }],
              totalAmount: meal?.price || 80,
              deliveryCharge: deliveryChargePerDay,
              paymentMethod: 'cash',
              deliveryDate: order.date,
              deliveryTime: 'lunch',
              address: address,
              zone: selectedZone,
              specialInstructions: 'Guest Meal Order',
              package: 'Guest',
              orderType: 'guest'
            };
            const orderResponse = await orderAPI.createOrder(orderData);
            orders.push(orderResponse);
          }

          if (order.guestMeals.dinner && order.dinnerMeal) {
            const meal = getMealForDay(order.dayName, 'dinner');
            const orderData = {
              items: [{ name: order.dinnerMeal, price: meal?.price || 100, quantity: 1 }],
              totalAmount: meal?.price || 100,
              deliveryCharge: deliveryChargePerDay,
              paymentMethod: 'cash',
              deliveryDate: order.date,
              deliveryTime: 'dinner',
              address: address,
              zone: selectedZone,
              specialInstructions: 'Guest Meal Order',
              package: 'Guest',
              orderType: 'guest'
            };
            const orderResponse = await orderAPI.createOrder(orderData);
            orders.push(orderResponse);
          }
        }
      }

      if (orders.length > 0) {
        const updatedUser = { ...userData, walletBalance };
        localStorage.setItem('userData', JSON.stringify(updatedUser));
        setUserData(updatedUser);

        toast.success(`${orders.length}টি অর্ডার সফলভাবে সম্পন্ন হয়েছে!`);

        // Reset
        const nextWeek = new Date(endDate);
        nextWeek.setDate(nextWeek.getDate() + 1);
        setStartDate(nextWeek.toISOString().split('T')[0]);
        const nextWeekEnd = new Date(nextWeek);
        nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);
        setEndDate(nextWeekEnd.toISOString().split('T')[0]);

        setEnableGuestMeal(false);
        initializeDailyOrders();
      }

    } catch (error: any) {
      console.error('Error placing order:', error);
      toast.error(error.message || 'অর্ডার করতে ব্যর্থ হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  const totals = calculateTotalPrice();

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

        {/* Insufficient Balance Modal */}
        {showInsufficientBalanceModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                  <h3 className="text-xl font-bold text-gray-800">অপর্যাপ্ত ওয়ালেট ব্যালেন্স</h3>
                </div>
                <button onClick={() => setShowInsufficientBalanceModal(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <p className="text-gray-700 mb-2">আপনার ওয়ালেটে পর্যাপ্ত টাকা নেই।</p>
                  <p className="text-sm text-gray-600">
                    প্রয়োজন: <span className="font-bold text-red-600">৳ {requiredAmount}</span><br />
                    বর্তমান ব্যালেন্স: <span className="font-bold text-[#3B82F6]">৳ {walletBalance}</span>
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3">
                  <p className="text-xs text-yellow-800">
                    💡 অনুগ্রহ করে আপনার ওয়ালেট রিচার্জ করুন। রিচার্জ করার পর আবার অর্ডার চেষ্টা করুন।
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowInsufficientBalanceModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  >
                    বাতিল
                  </button>
                  <button
                    onClick={handleAddMoneyRedirect}
                    className="flex-1 bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    {/* <PlusCircle size={18} /> */}
                    ওয়ালেট রিচার্জ করুন
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Modal */}
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 text-black">
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">অর্ডার কনফার্মেশন</h3>
                <button onClick={() => setShowConfirmModal(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-gray-600 font-semibold mb-2">আমার খাবার</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>খাবারের মূল্য:</span>
                      <span className="font-semibold">৳ {totals.selfMealPrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ডেলিভারি চার্জ:</span>
                      <span className="font-semibold">৳ {totals.selfDeliveryCharge}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-1 border-t">
                      <span>আমার মোট:</span>
                      <span className="text-[#3B82F6]">৳ {totals.selfTotal}</span>
                    </div>
                  </div>
                </div>

                {enableGuestMeal && totals.guestTotal > 0 && (
                  <div className="bg-green-50 rounded-xl p-4">
                    <p className="text-gray-600 font-semibold mb-2">গেস্ট খাবার</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>খাবারের মূল্য:</span>
                        <span className="font-semibold">৳ {totals.guestMealPrice}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ডেলিভারি চার্জ:</span>
                        <span className="font-semibold">৳ {totals.guestDeliveryCharge}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-1 border-t">
                        <span>গেস্ট মোট:</span>
                        <span className="text-green-600">৳ {totals.guestTotal}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-yellow-50 rounded-xl p-3">
                  <p className="text-sm text-yellow-800">ওয়ালেট ব্যালেন্স: ৳ {walletBalance}</p>
                  <p className="text-sm text-yellow-800 mt-1">ডেলিভারি ঠিকানা: {address}</p>
                  <p className="text-sm text-yellow-800">ফোন: {phoneNumber}</p>
                  {enableGuestMeal && (
                    <p className="text-sm text-yellow-800 mt-1">গেস্ট খাবারের টাকা ডেলিভারির সময় দিতে হবে</p>
                  )}
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

                {/* Meal Type Selection */}
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

                {/* Meals Per Day Selection */}
                {selectedMealType === 'all' && (
                  <div className="mb-6">
                    <label className="block text-gray-700 font-medium mb-2">
                      <Info className="w-4 h-4 inline mr-2 text-[#3B82F6]" />
                      কোন বেলার খাবার নিবেন? (একাধিক নির্বাচন করতে পারেন)
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedMeals(prev => ({ ...prev, morning: !prev.morning }))}
                        className={`py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${selectedMeals.morning
                          ? 'bg-[#3B82F6] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        <Coffee size={18} />
                        সকাল
                        {selectedMeals.morning && <CheckCircle size={16} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedMeals(prev => ({ ...prev, lunch: !prev.lunch }))}
                        className={`py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${selectedMeals.lunch
                          ? 'bg-[#3B82F6] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        <Sun size={18} />
                        দুপুর
                        {selectedMeals.lunch && <CheckCircle size={16} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedMeals(prev => ({ ...prev, dinner: !prev.dinner }))}
                        className={`py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${selectedMeals.dinner
                          ? 'bg-[#3B82F6] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        <Moon size={18} />
                        রাত
                        {selectedMeals.dinner && <CheckCircle size={16} />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      ✓ আপনার পছন্দ অনুযায়ী এক বা একাধিক বেলা নির্বাচন করতে পারেন
                    </p>
                  </div>
                )}

                {/* Guest Meal Toggle */}
                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-[#3B82F6]" />
                      <div>
                        <span className="font-semibold text-gray-800">গেস্ট মিল</span>
                        <p className="text-xs text-gray-500">অন্য কারো জন্য খাবার অর্ডার করতে চান?</p>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={enableGuestMeal}
                        onChange={(e) => setEnableGuestMeal(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-[#3B82F6] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </div>
                  </label>
                </div>

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

                {/* Daily Order Cards */}
                <div className="mb-6 space-y-3 max-h-[500px] overflow-y-auto">
                  <h3 className="font-semibold text-gray-800 mb-2 sticky top-0 bg-white py-2">দৈনিক খাবার নির্বাচন</h3>
                  {dailyOrders.map((order) => (
                    <div key={order.date} className="border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleDayExpand(order.date)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-gray-800">
                            {order.dayName} - {(() => {
                              const date = new Date(order.date);
                              const day = date.getDate();
                              const month = date.getMonth() + 1;
                              const year = date.getFullYear();
                              return `${day}/${month}/${year}`;
                            })()}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {/* Show self meal summary */}
                            {order.selfMeals.morning && '🌅 আমার '}
                            {order.selfMeals.lunch && '☀️ আমার '}
                            {order.selfMeals.dinner && '🌙 আমার '}
                            {/* Show guest meal summary if enabled */}
                            {enableGuestMeal && (
                              <>
                                {order.guestMeals.morning && '👥 গেস্ট সকাল '}
                                {order.guestMeals.lunch && '👥 গেস্ট দুপুর '}
                                {order.guestMeals.dinner && '👥 গেস্ট রাত '}
                              </>
                            )}
                            {!order.selfMeals.morning && !order.selfMeals.lunch && !order.selfMeals.dinner &&
                              (!enableGuestMeal || (!order.guestMeals.morning && !order.guestMeals.lunch && !order.guestMeals.dinner)) && 'কোন খাবার নির্বাচিত হয়নি'}
                          </div>
                        </div>
                        {order.isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>

                      {order.isExpanded && (
                        <div className="p-4 space-y-4 border-t border-gray-200">
                          {/* Self Meals */}
                          <div className="bg-blue-50 p-3 rounded-lg text-black">
                            <div className="flex items-center gap-2 mb-2">
                              <Wallet size={16} className="text-[#3B82F6]" />
                              <span className="font-semibold text-sm">আমার খাবার {hasActiveSubscription ? '(ওয়ালেট থেকে)' : '(ক্যাশ অন ডেলিভারি)'}</span>
                            </div>
                            <div className="space-y-2 text-black">
                              <label className="flex items-center justify-between p-2 hover:bg-white rounded-lg cursor-pointer">
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={order.selfMeals.morning}
                                    onChange={() => updateSelfMeal(order.date, 'morning')}
                                    className="w-5 h-5 text-[#3B82F6] rounded"
                                  />
                                  <Coffee size={18} className="text-amber-500" />
                                  <span className="text-gray-700">সকালের খাবার</span>
                                  <span className="text-xs text-gray-500">({order.morningMeal})</span>
                                </div>
                                <span className="text-[#3B82F6] font-semibold">৳{getMealForDay(order.dayName, 'morning')?.price || 50}</span>
                              </label>

                              <label className="flex items-center justify-between p-2 hover:bg-white rounded-lg cursor-pointer">
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={order.selfMeals.lunch}
                                    onChange={() => updateSelfMeal(order.date, 'lunch')}
                                    className="w-5 h-5 text-[#3B82F6] rounded"
                                  />
                                  <Sun size={18} className="text-yellow-500" />
                                  <span className="text-gray-700">দুপুরের খাবার</span>
                                  <span className="text-xs text-gray-500">({order.lunchMeal})</span>
                                </div>
                                <span className="text-[#3B82F6] font-semibold">৳{getMealForDay(order.dayName, 'lunch')?.price || 80}</span>
                              </label>

                              <label className="flex items-center justify-between p-2 hover:bg-white rounded-lg cursor-pointer">
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={order.selfMeals.dinner}
                                    onChange={() => updateSelfMeal(order.date, 'dinner')}
                                    className="w-5 h-5 text-[#3B82F6] rounded"
                                  />
                                  <Moon size={18} className="text-blue-500" />
                                  <span className="text-gray-700">রাতের খাবার</span>
                                  <span className="text-xs text-gray-500">({order.dinnerMeal})</span>
                                </div>
                                <span className="text-[#3B82F6] font-semibold">৳{getMealForDay(order.dayName, 'dinner')?.price || 100}</span>
                              </label>
                            </div>
                          </div>

                          {/* Guest Meals - Only show if enabled */}
                          {enableGuestMeal && (
                            <div className="bg-green-50 p-3 rounded-lg text-black">
                              <div className="flex items-center gap-2 mb-2">
                                <Users size={16} className="text-green-600" />
                                <span className="font-semibold text-sm">গেস্ট খাবার (ক্যাশ অন ডেলিভারি)</span>
                              </div>
                              <div className="space-y-2">
                                <label className="flex items-center justify-between p-2 hover:bg-white rounded-lg cursor-pointer">
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="checkbox"
                                      checked={order.guestMeals.morning}
                                      onChange={() => updateGuestMeal(order.date, 'morning')}
                                      className="w-5 h-5 text-green-600 rounded"
                                    />
                                    <Coffee size={18} className="text-amber-500" />
                                    <span className="text-gray-700">সকালের খাবার (গেস্ট)</span>
                                    <span className="text-xs text-gray-500">({order.morningMeal})</span>
                                  </div>
                                  <span className="text-green-600 font-semibold">৳{getMealForDay(order.dayName, 'morning')?.price || 50}</span>
                                </label>

                                <label className="flex items-center justify-between p-2 hover:bg-white rounded-lg cursor-pointer">
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="checkbox"
                                      checked={order.guestMeals.lunch}
                                      onChange={() => updateGuestMeal(order.date, 'lunch')}
                                      className="w-5 h-5 text-green-600 rounded"
                                    />
                                    <Sun size={18} className="text-yellow-500" />
                                    <span className="text-gray-700">দুপুরের খাবার (গেস্ট)</span>
                                    <span className="text-xs text-gray-500">({order.lunchMeal})</span>
                                  </div>
                                  <span className="text-green-600 font-semibold">৳{getMealForDay(order.dayName, 'lunch')?.price || 80}</span>
                                </label>

                                <label className="flex items-center justify-between p-2 hover:bg-white rounded-lg cursor-pointer">
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="checkbox"
                                      checked={order.guestMeals.dinner}
                                      onChange={() => updateGuestMeal(order.date, 'dinner')}
                                      className="w-5 h-5 text-green-600 rounded"
                                    />
                                    <Moon size={18} className="text-blue-500" />
                                    <span className="text-gray-700">রাতের খাবার (গেস্ট)</span>
                                    <span className="text-xs text-gray-500">({order.dinnerMeal})</span>
                                  </div>
                                  <span className="text-green-600 font-semibold">৳{getMealForDay(order.dayName, 'dinner')?.price || 100}</span>
                                </label>
                              </div>
                            </div>
                          )}
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
                      <span className="text-gray-600">আমার খাবারের মূল্য:</span>
                      <span className="font-semibold text-black">৳ {totals.selfMealPrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ডেলিভারি চার্জ ({totals.selfDays} দিন x ৳{deliveryChargePerDay}):</span>
                      <span className="font-semibold text-black">৳ {totals.selfDeliveryCharge}</span>
                    </div>
                    {enableGuestMeal && totals.guestMealPrice > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">গেস্ট খাবারের মূল্য:</span>
                          <span className="font-semibold text-black">৳ {totals.guestMealPrice}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">গেস্ট ডেলিভারি চার্জ:</span>
                          <span className="font-semibold text-black">৳ {totals.guestDeliveryCharge}</span>
                        </div>
                      </>
                    )}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-bold text-lg">
                        <span className="text-gray-800">সর্বমোট:</span>
                        <span className="text-[#3B82F6]">৳ {totals.total}</span>
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
                  {submitting ? 'অর্ডার প্রসেস হচ্ছে...' : `অর্ডার করুন (৳${totals.total})`}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Info Note */}
        <div className="text-center mt-6 text-gray-500 text-sm">
          <p>ডেলিভারি চার্জ: ৳{deliveryChargePerDay} প্রতি ডেলিভারি</p>
          <p className="mt-1">আমার খাবার {hasActiveSubscription ? 'ওয়ালেট থেকে কাটা হবে' : 'ক্যাশ অন ডেলিভারি'}</p>
          {enableGuestMeal && <p className="mt-1 text-green-600">গেস্ট খাবারের টাকা ডেলিভারির সময় দিতে হবে</p>}
          <p className="mt-1">ডেলিভারি টাইম: সকাল ৮টা - ১০টা, দুপুর ১২টা - ২টা, রাত ৭টা - ৯টা</p>
        </div>
      </div>
    </section>
  );
}