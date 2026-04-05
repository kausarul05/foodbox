'use client'

import React, { useState } from 'react'
import { 
  Package, 
  Calendar, 
  Phone, 
  MapPin, 
  Home, 
  CheckCircle, 
  CreditCard,
  Sparkles,
  Diamond,
  Star
} from 'lucide-react'

interface PackageOption {
  id: string
  name: string
  price: number
  features: string[]
}

export default function Order() {
  const [selectedPackage, setSelectedPackage] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [phoneNumber, setPhoneNumber] = useState<string>('')
  const [selectedZone, setSelectedZone] = useState<string>('')
  const [address, setAddress] = useState<string>('')
  const [subscription, setSubscription] = useState<boolean>(false)

  const packages: PackageOption[] = [
    {
      id: 'daily',
      name: 'ডেইলি প্যাকেজ',
      price: 350,
      features: ['১ দিনের খাবার', '৩ বেলা', 'নিয়মিত ডেলিভারি']
    },
    {
      id: 'weekly',
      name: 'উইকলি প্যাকেজ',
      price: 2200,
      features: ['৭ দিনের খাবার', '৩ বেলা', '১০% ছাড়', 'ফ্রি ডেলিভারি']
    },
    {
      id: 'golden',
      name: 'গোল্ডেন প্যাকেজ',
      price: 2500,
      features: ['৭ দিনের খাবার', '৩ বেলা', 'এক্সট্রা আইটেম', 'ফ্রি ডেলিভারি', 'প্রায়োরিটি সাপোর্ট']
    },
    {
      id: 'diamond',
      name: 'ডায়মন্ড প্যাকেজ',
      price: 3500,
      features: ['৭ দিনের খাবার', '৩ বেলা', 'এক্সট্রা ডেজার্ট', 'হট ব্যাগ', '২৪/৭ সাপোর্ট']
    }
  ]

  const zones = ['উত্তরা', 'ধানমন্ডি', 'গুলশান', 'বনানী', 'মিরপুর', 'মোহাম্মদপুর', 'পুরান ঢাকা', 'যাত্রাবাড়ী', 'নিউ মার্কেট', 'বসুন্ধরা']

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!subscription) {
      alert('দয়া করে সাবস্ক্রিপশন সিলেক্ট করুন')
      return
    }
    console.log({
      package: selectedPackage,
      date: selectedDate,
      phone: phoneNumber,
      zone: selectedZone,
      address: address,
      subscription
    })
    alert('অর্ডার সফলভাবে সম্পন্ন হয়েছে!')
  }

  const getPackageIcon = (id: string) => {
    switch(id) {
      case 'golden': return <Star className="w-5 h-5" />
      case 'diamond': return <Diamond className="w-5 h-5" />
      default: return <Package className="w-5 h-5" />
    }
  }

  return (
    <section className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white mb-4">
            <Package className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">অর্ডার করুন</h1>
          <p className="text-gray-600">আপনার পছন্দের খাবার এখনই অর্ডার করুন</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 md:p-8">
            {/* Package Selection */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-[#3B82F6]" /> 
                প্যাকেজ সিলেক্ট করুন
              </h2>
              
              {/* Package Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg.id)}
                    className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                      selectedPackage === pkg.id
                        ? 'border-[#3B82F6] bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-[#3B82F6] hover:bg-blue-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {getPackageIcon(pkg.id)}
                      <h3 className="font-bold text-gray-800 text-lg">{pkg.name}</h3>
                    </div>
                    <p className="text-2xl font-bold text-[#3B82F6] my-2">৳ {pkg.price}</p>
                    <ul className="text-xs text-gray-500 space-y-1">
                      {pkg.features.slice(0, 2).map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500" /> {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              {!selectedPackage && (
                <p className="text-red-400 text-sm mt-2">* দয়া করে একটি প্যাকেজ সিলেক্ট করুন</p>
              )}
            </div>

            {/* Date Selection */}
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">
                <Calendar className="w-4 h-4 inline mr-2 text-[#3B82F6]" /> 
                সিলেক্ট ডে / দিন নির্বাচন করুন
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent"
              />
              <p className="text-gray-400 text-sm mt-1">একটি তারিখ সিলেক্ট করুন অর্ডার শুরু করতে</p>
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
                ঠিকানা / এড্রেস
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                placeholder="বিস্তারিত ঠিকানা লিখুন..."
              />
            </div>

            {/* Subscription Checkbox */}
            <div className="mb-8">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={subscription}
                  onChange={(e) => setSubscription(e.target.checked)}
                  className="w-5 h-5 text-[#3B82F6] rounded focus:ring-[#3B82F6]"
                />
                <span className="text-gray-700">
                  সাবস্ক্রিপশন নিন (সাপ্তাহিক/মাসিক) - <span className="text-[#3B82F6] font-semibold">এক্সট্রা ছাড় পান!</span>
                </span>
              </label>
              {!subscription && (
                <p className="text-red-400 text-sm mt-2">⚠️ নো সাবস্ক্রিপশন (প্লিজ সাবস্ক্রাইব করুন)</p>
              )}
            </div>

            {/* Order Summary */}
            {selectedPackage && (
              <div className="bg-gradient-to-br from-[#3B82F6]/10 to-[#111827]/5 rounded-xl p-4 mb-6 border border-[#3B82F6]/20">
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#3B82F6]" /> 
                  অর্ডার সামারি
                </h3>
                <div className="space-y-1 text-sm">
                  <p className="flex justify-between">
                    <span className="text-gray-600">প্যাকেজ:</span>
                    <span className="font-semibold">{packages.find(p => p.id === selectedPackage)?.name}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-600">মূল্য:</span>
                    <span className="font-semibold">৳ {packages.find(p => p.id === selectedPackage)?.price}</span>
                  </p>
                  {subscription && (
                    <p className="flex justify-between text-green-600">
                      <span>সাবস্ক্রিপশন ছাড়:</span>
                      <span>- ৳ ২০০</span>
                    </p>
                  )}
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <p className="flex justify-between font-bold text-lg">
                      <span className='text-black'>মোট:</span>
                      <span className="text-[#3B82F6]">
                        ৳ {subscription 
                          ? (packages.find(p => p.id === selectedPackage)?.price || 0) - 200
                          : packages.find(p => p.id === selectedPackage)?.price
                        }
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              className="w-full bg-gradient-to-br from-[#3B82F6] to-[#111827] hover:shadow-xl text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-lg text-lg flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              অর্ডার কনফার্ম করুন
            </button>
          </div>
        </div>

        {/* Info Note */}
        <div className="text-center mt-6 text-gray-500 text-sm">
          <p>অর্ডার কনফার্ম হলে আমরা আপনার ফোন নাম্বারে কল/এসএমএস করবো</p>
          <p className="mt-1">ডেলিভারি টাইম: সকাল ৮টা - রাত ১০টা</p>
        </div>
      </div>
    </section>
  )
}