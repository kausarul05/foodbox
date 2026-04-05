'use client';

import React from 'react';
import { User, MapPin, Phone, Package, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  // User data (will come from API/context)
  const userData = {
    fullName: 'kausar',
    phoneNumber: '+8801868703130',
    zone: 'Aqua',
    address: 'Mymensingh',
    walletBalance: 0,
    package: null,
    isSubscribed: false,
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-[#3B82F6] to-[#111827] p-2 rounded-xl">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">প্রোফাইল</h1>
            <p className="text-gray-500 text-sm">আপনার ব্যক্তিগত তথ্য</p>
          </div>
        </div>
      </div>

      {/* Profile Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-[#3B82F6]" />
            ব্যক্তিগত তথ্য
          </h2>
          <div className="space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <p className="text-gray-500 text-sm">পূর্ণ নাম</p>
              <p className="text-gray-800 font-medium">{userData.fullName}</p>
            </div>
            <div className="border-b border-gray-100 pb-3">
              <p className="text-gray-500 text-sm">জোন</p>
              <p className="text-gray-800 font-medium">{userData.zone}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">ওয়ালেট ব্যালেন্স</p>
              <p className="text-2xl font-bold text-[#3B82F6]">BDT {userData.walletBalance}</p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5 text-[#3B82F6]" />
            যোগাযোগের তথ্য
          </h2>
          <div className="space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <p className="text-gray-500 text-sm">ফোন নাম্বার</p>
              <p className="text-gray-800 font-medium">{userData.phoneNumber}</p>
            </div>
            <div className="border-b border-gray-100 pb-3">
              <p className="text-gray-500 text-sm">ঠিকানা</p>
              <p className="text-gray-800 font-medium">{userData.address}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">প্যাকেজ</p>
              <p className="text-gray-800 font-medium">{userData.package || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Status */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-start gap-4">
          <div className="bg-orange-100 p-3 rounded-xl">
            <Package className="w-6 h-6 text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-800 mb-1">
              {userData.isSubscribed ? '✅ সক্রিয় সাবস্ক্রিপশন' : '⚠️ নো অ্যাকটিভ সাবস্ক্রিপশন'}
            </h3>
            <p className="text-gray-600 mb-4">
              {userData.isSubscribed 
                ? 'আপনার সাবস্ক্রিপশন সক্রিয় আছে। আপনি এখন অর্ডার করতে পারবেন।' 
                : 'সরি, আপনার কোনো সক্রিয় সাবস্ক্রিপশন নেই। খাবার অর্ডার করতে অনুগ্রহ করে সাবস্ক্রাইব করুন।'}
            </p>
            {!userData.isSubscribed && (
              <Link href="/subscription">
                <button className="bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center gap-2">
                  <Package size={18} />
                  সাবস্ক্রাইব করুন
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Button */}
      <div className="flex justify-end">
        <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-medium transition-colors">
          প্রোফাইল এডিট করুন
        </button>
      </div>
    </div>
  );
}