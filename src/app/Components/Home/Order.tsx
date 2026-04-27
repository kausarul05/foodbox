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
  Clock
} from 'lucide-react';
import { orderAPI, subscriptionAPI, menuAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface MealItem {
  name: string;
  price: number;
  quantity: number;
}

interface MenuItem {
  day: string;
  morning: string;
  lunch: string;
  dinner: string;
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
  const [orderSummary, setOrderSummary] = useState<any>(null);

  const zones = ['উত্তরা', 'ধানমন্ডি', 'গুলশান', 'বনানী', 'মিরপুর', 'মোহাম্মদপুর', 'পুরান ঢাকা', 'যাত্রাবাড়ী', 'নিউ মার্কেট', 'বসুন্ধরা'];

  // Set default dates
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    
    const end = new Date(today);
    end.setDate(end.getDate() + 6);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  // Check login and subscription status
  useEffect(() => {
    checkLoginStatus();
  }, []);

  // Update order summary when dates change
  useEffect(() => {
    if (startDate && endDate && availableMenu.length > 0) {
      calculateOrderSummary();
    }
  }, [startDate, endDate, availableMenu]);

  const checkLoginStatus = async () => {
    const token = localStorage.getItem('userToken');
    const user = localStorage.getItem('userData');

    if (token && user) {
      setIsLoggedIn(true);
      const userInfo = JSON.parse(user);
      setUserData(userInfo);

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
      console.log('Subscription response:', response);

      if (response.success && response.data) {
        const activeSub = response.data.find((sub: any) => sub.status === 'active');
        if (activeSub) {
          setHasActiveSubscription(true);
          setSubscriptionData(activeSub);
          await fetchMenu(activeSub.package);
        } else {
          setHasActiveSubscription(false);
        }
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setHasActiveSubscription(false);
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

  const getDayName = (date: string) => {
    const days = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
    const dayIndex = new Date(date).getDay();
    return days[dayIndex];
  };

  const getMealForDay = (dayName: string, mealType: string) => {
    const menu = availableMenu.find(m => m.day === dayName);
    if (!menu) return null;
    
    switch(mealType) {
      case 'morning': return menu.morning;
      case 'lunch': return menu.lunch;
      case 'dinner': return menu.dinner;
      default: return null;
    }
  };

  const calculateOrderSummary = () => {
    const dates = getDatesInRange(startDate, endDate);
    const mealTypes = ['morning', 'lunch', 'dinner'];
    const mealNames = { morning: 'সকালের খাবার', lunch: 'দুপুরের খাবার', dinner: 'রাতের খাবার' };
    
    let totalMeals = 0;
    let availableMeals = 0;
    const details = [];

    for (const date of dates) {
      const dayName = getDayName(date);
      const dayMeals = [];
      
      for (const mealType of mealTypes) {
        const meal = getMealForDay(dayName, mealType);
        totalMeals++;
        if (meal) {
          availableMeals++;
          dayMeals.push({ type: mealType, name: mealNames[mealType as keyof typeof mealNames], meal });
        }
      }
      
      if (dayMeals.length > 0) {
        details.push({ date, dayName, meals: dayMeals });
      }
    }

    setOrderSummary({
      totalDays: dates.length,
      totalMeals: availableMeals,
      expectedMeals: totalMeals,
      details,
      startDate,
      endDate
    });
  };

  const handleLoginRedirect = () => {
    router.push('/login');
  };

  const handleSubscribeRedirect = () => {
    router.push('/subscription');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoggedIn) {
      toast.error('অর্ডার করতে দয়া করে লগইন করুন');
      router.push('/login');
      return;
    }

    if (!hasActiveSubscription) {
      toast.error('অর্ডার করতে সক্রিয় সাবস্ক্রিপশন প্রয়োজন');
      router.push('/subscription');
      return;
    }

    if (!phoneNumber) {
      toast.error('দয়া করে ফোন নাম্বার দিন');
      return;
    }

    if (!selectedZone) {
      toast.error('দয়া করে জোন সিলেক্ট করুন');
      return;
    }

    if (!address) {
      toast.error('দয়া করে ঠিকানা দিন');
      return;
    }

    if (!startDate || !endDate) {
      toast.error('দয়া করে শুরু এবং শেষ তারিখ সিলেক্ট করুন');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('শেষ তারিখ শুরু তারিখের পরে হতে হবে');
      return;
    }

    try {
      setSubmitting(true);
      
      const dates = getDatesInRange(startDate, endDate);
      const mealTypes = ['morning', 'lunch', 'dinner'];
      const orders = [];

      for (const date of dates) {
        const dayName = getDayName(date);
        
        for (const mealType of mealTypes) {
          const meal = getMealForDay(dayName, mealType);
          
          if (meal) {
            const orderData = {
              items: [{ name: meal, price: 0, quantity: 1 }],
              totalAmount: 0,
              deliveryCharge: 0,
              paymentMethod: 'subscription',
              deliveryDate: date,
              deliveryTime: mealType,
              address: address,
              zone: selectedZone,
              specialInstructions: '',
              package: subscriptionData?.packageName || subscriptionData?.package,
            };

            const orderResponse = await orderAPI.createOrder(orderData);
            if (orderResponse.success) {
              orders.push(orderResponse.data);
            }
          }
        }
      }

      if (orders.length > 0) {
        toast.success(`${orders.length}টি অর্ডার সফলভাবে সম্পন্ন হয়েছে!`);
        
        // Reset to next week
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
    <section className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white mb-4">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">অর্ডার করুন</h1>
          <p className="text-gray-600">আপনার সাবস্ক্রিপশনের খাবার অর্ডার করুন</p>
        </div>

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

        {/* No Active Subscription */}
        {isLoggedIn && !hasActiveSubscription && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <div className="bg-red-100 p-4 rounded-full w-fit mx-auto mb-4">
              <AlertCircle className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">কোনো সক্রিয় সাবস্ক্রিপশন নেই</h2>
            <p className="text-gray-600 mb-6">অর্ডার করতে সক্রিয় সাবস্ক্রিপশন প্রয়োজন। অনুগ্রহ করে একটি প্যাকেজ সাবস্ক্রাইব করুন।</p>
            <button
              onClick={handleSubscribeRedirect}
              className="bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 mx-auto"
            >
              <Package size={20} />
              সাবস্ক্রাইব করুন
            </button>
          </div>
        )}

        {/* Order Form */}
        {isLoggedIn && hasActiveSubscription && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 md:p-8">
              <form onSubmit={handleSubmit}>
                {/* Active Subscription Info */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-green-800">সক্রিয় সাবস্ক্রিপশন</h3>
                      <p className="text-green-700 text-sm">
                        {subscriptionData?.packageName || subscriptionData?.package} প্যাকেজ
                      </p>
                      <p className="text-green-600 text-xs mt-1">
                        বৈধ: {new Date(subscriptionData?.startDate).toLocaleDateString('bn-BD')} - {new Date(subscriptionData?.endDate).toLocaleDateString('bn-BD')}
                      </p>
                    </div>
                  </div>
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

                {/* Order Summary */}
                {orderSummary && orderSummary.totalMeals > 0 && (
                  <div className="bg-blue-50 rounded-xl p-4 mb-6">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#3B82F6]" />
                      অর্ডার সামারি
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">মোট দিন:</span>
                        <span className="font-semibold text-black">{orderSummary.totalDays} দিন</span>
                      </div>
                      <div className="flex justify-between text-black">
                        <span className="text-gray-600">মোট খাবার:</span>
                        <span className="font-semibold text-green-600">{orderSummary.totalMeals} টি (সকাল, দুপুর, রাত)</span>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-bold text-lg">
                          <span className="text-gray-800">মোট মূল্য:</span>
                          <span className="text-[#3B82F6]">৳ ০ (সাবস্ক্রিপশনে অন্তর্ভুক্ত)</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Weekly Menu Preview */}
                    <details className="mt-3">
                      <summary className="text-sm text-[#3B82F6] cursor-pointer hover:underline">
                        সাপ্তাহিক মেনু দেখুন
                      </summary>
                      <div className="mt-3 space-y-2">
                        {orderSummary.details.map((day: any) => (
                          <div key={day.date} className="bg-white rounded-lg p-3 text-sm">
                            <div className="font-semibold text-gray-800">
                              {day.dayName} - {new Date(day.date).toLocaleDateString('bn-BD')}
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                              {day.meals.map((meal: any) => (
                                <div key={meal.type} className="text-gray-600">
                                  <span className="font-medium">{meal.name}:</span> {meal.meal}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}

                {/* Contact Information */}
                <div className="mb-6">
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
                <div className="mb-6">
                  <label className="block text-gray-700 font-medium mb-2">
                    <MapPin className="w-4 h-4 inline mr-2 text-[#3B82F6]" />
                    জোন / এলাকা
                  </label>
                  <select
                    value={selectedZone}
                    onChange={(e) => setSelectedZone(e.target.value)}
                    className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white"
                    required
                  >
                    <option value="">সিলেক্ট করুন</option>
                    {zones.map((zone) => (
                      <option key={zone} value={zone}>{zone}</option>
                    ))}
                  </select>
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
                  disabled={submitting || !orderSummary || orderSummary.totalMeals === 0}
                  className="w-full bg-gradient-to-br from-[#3B82F6] to-[#111827] hover:shadow-xl text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-lg text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  {submitting ? 'অর্ডার প্রসেস হচ্ছে...' : `${orderSummary?.totalMeals || 0}টি খাবার অর্ডার করুন`}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Info Note */}
        <div className="text-center mt-6 text-gray-500 text-sm">
          <p>অর্ডার কনফার্ম হলে প্রতিদিন সকাল, দুপুর ও রাতের খাবার ডেলিভারি করা হবে</p>
          <p className="mt-1">ডেলিভারি টাইম: সকাল ৮টা - ১০টা, দুপুর ১২টা - ২টা, রাত ৭টা - ৯টা</p>
          <p className="mt-1 text-[#3B82F6]">সাবস্ক্রিপশন সক্রিয় থাকলে ডেলিভারি চার্জ ফ্রি</p>
        </div>
      </div>
    </section>
  );
}