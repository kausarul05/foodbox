'use client';

import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Diamond, 
  CheckCircle, 
  Truck, 
  Coffee, 
  Home, 
  Gift, 
  Sparkles, 
  Crown, 
  Zap, 
  Shield,
  Loader2,
  AlertCircle,
  CreditCard,
  Wallet
} from 'lucide-react';
import { packageAPI, subscriptionAPI, authAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface PackageType {
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

export default function Packages() {
  const router = useRouter();
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('bkash');

  useEffect(() => {
    checkLoginStatus();
    fetchPackages();
  }, []);

  const checkLoginStatus = () => {
    const token = localStorage.getItem('userToken');
    if (token) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
  };

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await packageAPI.getAllPackages();
      console.log('Packages response:', response);
      
      if (response.success && response.data) {
        // Filter only active packages (golden and diamond)
        const activePackages = response.data.filter((pkg: PackageType) => pkg.isActive);
        setPackages(activePackages);
      } else {
        setPackages([]);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('প্যাকেজ লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = (pkg: PackageType) => {
    if (!isLoggedIn) {
      toast.error('সাবস্ক্রাইব করতে দয়া করে লগইন করুন');
      router.push('/login');
      return;
    }
    
    setSelectedPackage(pkg);
    setShowPaymentModal(true);
  };

  const handlePayment = async () => {
    if (!selectedPackage) return;
    
    try {
      setSubscribing(selectedPackage._id);
      
      const subscriptionData = {
        package: selectedPackage.name,
        paymentMethod: paymentMethod,
        address: '', // Will be taken from user profile
        zone: '', // Will be taken from user profile
      };
      
      const response = await subscriptionAPI.requestSubscription(subscriptionData);
      console.log('Subscription response:', response);
      
      if (response.success) {
        toast.success('সাবস্ক্রিপশন রিকোয়েস্ট সফল! অ্যাডমিন অনুমোদনের অপেক্ষায়');
        setShowPaymentModal(false);
        
        // Redirect to dashboard or subscription page
        setTimeout(() => {
          router.push('/dashboard/profile');
        }, 2000);
      } else {
        toast.error(response.message || 'সাবস্ক্রিপশন ব্যর্থ হয়েছে');
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(error.message || 'সাবস্ক্রিপশন ব্যর্থ হয়েছে');
    } finally {
      setSubscribing(null);
    }
  };

  if (loading) {
    return (
      <section className="px-4 sm:px-8 md:px-[100px] lg:px-[150px] xl:px-[200px] py-[50px] md:py-[100px] bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="w-12 h-12 text-[#3B82F6] animate-spin mb-4" />
            <p className="text-gray-500 text-lg">প্যাকেজ লোড হচ্ছে...</p>
          </div>
        </div>
      </section>
    );
  }

  if (packages.length === 0) {
    return (
      <section className="px-4 sm:px-8 md:px-[100px] lg:px-[150px] xl:px-[200px] py-[50px] md:py-[100px] bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="bg-red-50 rounded-full p-4 mx-auto w-fit mb-4">
              <AlertCircle className="w-16 h-16 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">কোনো প্যাকেজ পাওয়া যায়নি</h2>
            <p className="text-gray-500">বর্তমানে কোনো সক্রিয় প্যাকেজ নেই</p>
          </div>
        </div>
      </section>
    );
  }

  // Find golden and diamond packages
  const goldenPackage = packages.find(pkg => pkg.name === 'golden');
  const diamondPackage = packages.find(pkg => pkg.name === 'diamond');

  return (
    <section className="px-4 sm:px-8 md:px-[100px] lg:px-[150px] xl:px-[200px] py-[50px] md:py-[100px] bg-white">
      <div className='max-w-6xl mx-auto'>
        {/* Section Header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">আমাদের প্যাকেজসমূহ</h2>
          <p className="text-gray-500">আপনার প্রয়োজন অনুযায়ী প্যাকেজ সিলেক্ট করুন</p>
        </div>

        {/* Package Cards - Golden & Diamond */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Golden Package */}
          {goldenPackage && (
            <div className="border-2 border-[#3B82F6] rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="bg-gradient-to-br from-[#3B82F6] to-[#111827] px-6 py-5 text-center">
                <div className="flex justify-center mb-2">
                  <Star className="w-10 h-10 text-yellow-300" />
                </div>
                <h3 className="text-white text-2xl font-bold">✨ {goldenPackage.title} ✨</h3>
                <p className="text-blue-200 text-sm">সপ্তাহিক স্পেশাল অফার</p>
              </div>
              <div className="p-6 bg-gradient-to-br from-blue-50 to-white">
                <ul className="space-y-3 mb-6">
                  {goldenPackage.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-gray-700">
                      {idx === 0 && <Truck className="w-5 h-5 text-[#3B82F6]" />}
                      {idx === 1 && <Coffee className="w-5 h-5 text-[#3B82F6]" />}
                      {idx === 2 && <Home className="w-5 h-5 text-[#3B82F6]" />}
                      {idx === 3 && <Gift className="w-5 h-5 text-[#3B82F6]" />}
                      <span className="font-medium">⭐ {feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="text-center pt-4 border-t border-blue-100">
                  <div className="mb-3">
                    <span className="text-3xl font-bold text-[#3B82F6]">৳ {goldenPackage.price}</span>
                    <span className="text-gray-400 line-through ml-3">৳ {goldenPackage.originalPrice}</span>
                  </div>
                  <button
                    onClick={() => handleSubscribe(goldenPackage)}
                    disabled={subscribing === goldenPackage._id}
                    className="w-full bg-gradient-to-br from-[#3B82F6] to-[#111827] hover:shadow-lg text-white font-bold py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {subscribing === goldenPackage._id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                    {subscribing === goldenPackage._id ? 'সাবস্ক্রাইব হচ্ছে...' : 'গোল্ডেন প্যাকেজ সাবস্ক্রাইব করুন'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Diamond Package */}
          {diamondPackage && (
            <div className="border-2 border-[#3B82F6] rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 relative">
              <div className="absolute top-4 right-4 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                BEST SELLER
              </div>
              <div className="bg-gradient-to-br from-[#3B82F6] to-[#111827] px-6 py-5 text-center">
                <div className="flex justify-center mb-2">
                  <Diamond className="w-10 h-10 text-blue-300" />
                </div>
                <h3 className="text-white text-2xl font-bold">💎 {diamondPackage.title} 💎</h3>
                <p className="text-blue-200 text-sm">প্রিমিয়াম সার্ভিস</p>
              </div>
              <div className="p-6 bg-gradient-to-br from-blue-50 to-white">
                <ul className="space-y-3 mb-6">
                  {diamondPackage.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-gray-700">
                      {idx === 0 && <Truck className="w-5 h-5 text-[#3B82F6]" />}
                      {idx === 1 && <Coffee className="w-5 h-5 text-[#3B82F6]" />}
                      {idx === 2 && <Home className="w-5 h-5 text-[#3B82F6]" />}
                      {idx === 3 && <Gift className="w-5 h-5 text-[#3B82F6]" />}
                      {idx === 4 && <Shield className="w-5 h-5 text-[#3B82F6]" />}
                      <span className="font-medium">💎 {feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="text-center pt-4 border-t border-blue-100">
                  <div className="mb-3">
                    <span className="text-3xl font-bold text-[#3B82F6]">৳ {diamondPackage.price}</span>
                    <span className="text-gray-400 line-through ml-3">৳ {diamondPackage.originalPrice}</span>
                  </div>
                  <button
                    onClick={() => handleSubscribe(diamondPackage)}
                    disabled={subscribing === diamondPackage._id}
                    className="w-full bg-gradient-to-br from-[#3B82F6] to-[#111827] hover:shadow-lg text-white font-bold py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {subscribing === diamondPackage._id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Crown className="w-5 h-5" />
                    )}
                    {subscribing === diamondPackage._id ? 'সাবস্ক্রাইব হচ্ছে...' : 'ডায়মন্ড প্যাকেজ সাবস্ক্রাইব করুন'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Extra Info */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm flex items-center justify-center gap-2">
            <Zap className="w-4 h-4 text-[#3B82F6]" />
            উভয় প্যাকেজেই রয়েছে স্পেশাল ডিসকাউন্ট
            <Zap className="w-4 h-4 text-[#3B82F6]" />
          </p>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedPackage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">সাবস্ক্রিপশন কনফার্মেশন</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Package Info */}
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm text-gray-600">আপনি সাবস্ক্রাইব করতে যাচ্ছেন:</p>
                <p className="font-bold text-lg text-[#3B82F6]">{selectedPackage.title}</p>
                <p className="text-2xl font-bold">৳ {selectedPackage.price}</p>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  <CreditCard className="w-4 h-4 inline mr-2 text-[#3B82F6]" />
                  পেমেন্ট মেথড
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                >
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="rocket">Rocket</option>
                  <option value="bank">ব্যাংক ট্রান্সফার</option>
                </select>
              </div>

              {/* Info Note */}
              <div className="bg-yellow-50 rounded-xl p-3">
                <p className="text-xs text-yellow-800">
                  ⚠️ সাবস্ক্রিপশন রিকোয়েস্ট পাঠানোর পর অ্যাডমিন অনুমোদন দিলে আপনার সাবস্ক্রিপশন এক্টিভ হবে।
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  বাতিল
                </button>
                <button
                  onClick={handlePayment}
                  disabled={subscribing === selectedPackage._id}
                  className="flex-1 bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {subscribing === selectedPackage._id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wallet className="w-4 h-4" />
                  )}
                  {subscribing === selectedPackage._id ? 'প্রসেসিং...' : 'কনফার্ম করুন'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}