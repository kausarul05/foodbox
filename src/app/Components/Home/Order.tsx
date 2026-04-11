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
  ShoppingBag
} from 'lucide-react';
import { orderAPI, subscriptionAPI, authAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface PackageOption {
  _id: string;
  name: string;
  title: string;
  price: number;
  originalPrice: number;
  features: string[];
  isActive: boolean;
}

interface MealItem {
  name: string;
  price: number;
  quantity: number;
}

export default function OrderPage() {
  const router = useRouter();
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [subscription, setSubscription] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);

  const zones = ['উত্তরা', 'ধানমন্ডি', 'গুলশান', 'বনানী', 'মিরপুর', 'মোহাম্মদপুর', 'পুরান ঢাকা', 'যাত্রাবাড়ী', 'নিউ মার্কেট', 'বসুন্ধরা'];

  // Check login and subscription status on mount
  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    const token = localStorage.getItem('userToken');
    const user = localStorage.getItem('userData');
    
    if (token && user) {
      setIsLoggedIn(true);
      const userInfo = JSON.parse(user);
      setUserData(userInfo);
      
      // Auto-fill user data if available
      if (userInfo.phoneNumber) setPhoneNumber(userInfo.phoneNumber);
      if (userInfo.zone) setSelectedZone(userInfo.zone);
      if (userInfo.address) setAddress(userInfo.address);
      
      // Check subscription status
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
          setSelectedPackage(activeSub.package);
          setSubscription(true);
        } else {
          setHasActiveSubscription(false);
          setSubscription(false);
        }
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setHasActiveSubscription(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginRedirect = () => {
    router.push('/login');
  };

  const handleSubscribeRedirect = () => {
    router.push('/subscription');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user is logged in
    if (!isLoggedIn) {
      toast.error('অর্ডার করতে দয়া করে লগইন করুন');
      router.push('/login');
      return;
    }
    
    // Check if user has active subscription
    if (!hasActiveSubscription) {
      toast.error('অর্ডার করতে সক্রিয় সাবস্ক্রিপশন প্রয়োজন');
      router.push('/subscription');
      return;
    }
    
    // Validate required fields
    if (!selectedDate) {
      toast.error('দয়া করে ডেলিভারির তারিখ সিলেক্ট করুন');
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
    
    try {
      setSubmitting(true);
      
      // Get today's menu based on subscription package
      const today = new Date();
      const days = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
      const todayName = days[today.getDay()];
      
      // Create order items (this should come from your menu API)
      const orderItems: MealItem[] = [
        { name: `${subscriptionData?.packageName || subscriptionData?.package} Package - Today's Meal`, price: 0, quantity: 1 }
      ];
      
      const orderData = {
        items: orderItems,
        totalAmount: 0, // Subscription package amount
        deliveryCharge: 50,
        paymentMethod: 'subscription',
        deliveryDate: selectedDate,
        deliveryTime: 'lunch',
        address: address,
        zone: selectedZone,
        specialInstructions: '',
        package: subscriptionData?.packageName || subscriptionData?.package,
      };
      
      const orderResponse = await orderAPI.createOrder(orderData);
      
      if (orderResponse.success) {
        toast.success('অর্ডার সফলভাবে সম্পন্ন হয়েছে!');
        // Reset form
        setSelectedDate('');
      } else {
        toast.error(orderResponse.message || 'অর্ডার করতে ব্যর্থ হয়েছে');
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

        {/* Order Form - Only show when logged in and has active subscription */}
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
                    </div>
                  </div>
                </div>

                {/* Date Selection */}
                <div className="mb-6">
                  <label className="block text-gray-700 font-medium mb-2">
                    <Calendar className="w-4 h-4 inline mr-2 text-[#3B82F6]" /> 
                    ডেলিভারির তারিখ নির্বাচন করুন
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent"
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                  <p className="text-gray-400 text-sm mt-1">আপনার সাবস্ক্রিপশনের খাবার ডেলিভারির জন্য তারিখ নির্বাচন করুন</p>
                </div>

                {/* Phone Number */}
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

                {/* Order Summary */}
                <div className="bg-gradient-to-br from-[#3B82F6]/10 to-[#111827]/5 rounded-xl p-4 mb-6 border border-[#3B82F6]/20">
                  <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#3B82F6]" /> 
                    অর্ডার সামারি
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p className="flex justify-between">
                      <span className="text-gray-600">সাবস্ক্রিপশন প্যাকেজ:</span>
                      <span className="font-semibold text-black">{subscriptionData?.packageName || subscriptionData?.package}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-600">ডেলিভারি চার্জ:</span>
                      <span className="font-semibold text-black">ফ্রি</span>
                    </p>
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <p className="flex justify-between font-bold text-lg">
                        <span className="text-black">মোট:</span>
                        <span className="text-[#3B82F6]">৳ ০ (সাবস্ক্রিপশনে অন্তর্ভুক্ত)</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-br from-[#3B82F6] to-[#111827] hover:shadow-xl text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-lg text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  {submitting ? 'অর্ডার প্রসেস হচ্ছে...' : 'অর্ডার কনফার্ম করুন'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Info Note */}
        <div className="text-center mt-6 text-gray-500 text-sm">
          <p>অর্ডার কনফার্ম হলে আমরা আপনার ফোন নাম্বারে কল/এসএমএস করবো</p>
          <p className="mt-1">ডেলিভারি টাইম: সকাল ৮টা - রাত ১০টা</p>
          <p className="mt-1 text-[#3B82F6]">সাবস্ক্রিপশন সক্রিয় থাকলে ডেলিভারি চার্জ ফ্রি</p>
        </div>
      </div>
    </section>
  );
}