'use client'

import React, { useState } from 'react'
import { 
  Star, 
  Diamond, 
  Sun, 
  Moon, 
  Coffee, 
  Calendar, 
  Sparkles,
  Crown,
  Utensils
} from 'lucide-react'

interface DayMeal {
  day: string
  morning?: string
  lunch?: string
  dinner?: string
}

const WeeklyMenu: React.FC = () => {
  const [selectedPackage, setSelectedPackage] = useState<'golden' | 'diamond'>('golden')

  // Get current day and next day in Bengali
  const getCurrentAndNextDay = () => {
    const days = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার']
    const today = new Date().getDay()
    const currentDay = days[today]
    const nextDay = days[(today + 1) % 7]
    return { currentDay, nextDay }
  }

  const { currentDay, nextDay } = getCurrentAndNextDay()

  // Golden Package Data
  const goldenData: DayMeal[] = [
    {
      day: 'শনিবার',
      morning: 'খিচুড়ি-ডিম/সবজি খিচুড়ি (৫০)',
      lunch: 'মুরগি-ভাত-ডাল (৫০)',
      dinner: 'মাছ-ভাত-ডাল (৫০)'
    },
    {
      day: 'রবিবার',
      morning: 'ভাত-ডাল-ভাজি/ভর্তা (৫০)',
      lunch: 'মাছ-ভাত-ডাল (৫০)',
      dinner: 'ডিম ভুনা-ভাত-ডাল (৫০)'
    },
    {
      day: 'সোমবার',
      morning: 'খিচুড়ি-ডিম/সবজি খিচুড়ি (৫০)',
      lunch: 'মুরগি-ভাত-ডাল (৫০)',
      dinner: 'স্টিকি-ভাত-ডাল (৫০)'
    },
    {
      day: 'মঙ্গলবার',
      morning: 'ভাত-ডাল-ভাজি/ভর্তা (৫০)',
      lunch: 'মাছ-ভাত-ডাল (৫০)',
      dinner: 'ডিম ভুনা-ভাত-ডাল (৫০)'
    },
    {
      day: 'বুধবার',
      morning: 'খিচুড়ি-ডিম/সবজি খিচুড়ি (৫০)',
      lunch: 'স্টিকি-ভাত-ডাল (৫০)',
      dinner: 'মুরগি-ভাত-ডাল (৫০)'
    },
    {
      day: 'বৃহস্পতিবার',
      morning: 'ডিম ভুনা-ভাত-ডাল+ভর্তা/ভাজি (৫০)',
      lunch: 'ডিম ভুনা-ভাত-ডাল (৫০)',
      dinner: 'মাছ-ভাত-ডাল (৫০)'
    },
    {
      day: 'শুক্রবার',
      morning: 'ভাত-ডাল-ভাজি/ভর্তা (৫০)',
      lunch: 'FoodBox Special Item (৫০)',
      dinner: 'স্টিকি-ভাত-ডাল (৫০)'
    }
  ]

  // Diamond Package Data
  const diamondData: DayMeal[] = [
    {
      day: 'শনিবার',
      morning: 'বিরিয়ানি + ডিম (১২০)',
      lunch: 'গরুর মাংস + পোলাও + ডাল (১৫০)',
      dinner: 'রুটি + মুরগি মুসল্লম + স্যালাড (১৩০)'
    },
    {
      day: 'রবিবার',
      morning: 'নুডুলস + ডিম + সসেজ (১০০)',
      lunch: 'খাসির মাংস + ভাত + ডাল (১৬০)',
      dinner: 'ফিশ ফ্রাই + ফ্রেঞ্চ ফ্রাই + ড্রিংকস (১৪০)'
    },
    {
      day: 'সোমবার',
      morning: 'পরোটা + গরুর মাংস (১১০)',
      lunch: 'চিকেন ফ্রাইড রাইস + ডিম (১৪০)',
      dinner: 'স্যুপ + স্পেশাল বার্গার (১২০)'
    },
    {
      day: 'মঙ্গলবার',
      morning: 'পাস্তা + চিজ + মাশরুম (৯০)',
      lunch: 'গরুর কিডনি ভুনা + ভাত + ডাল (১৫০)',
      dinner: 'গ্রিলড চিকেন + ভেজিটেবল (১৩০)'
    },
    {
      day: 'বুধবার',
      morning: 'ফুচকা + চটপটি (৮০)',
      lunch: 'ইলিশ মাছ + ভাত + ডাল (১৮০)',
      dinner: 'চিংড়ি মালাইকারি + ভাত (১৬০)'
    },
    {
      day: 'বৃহস্পতিবার',
      morning: 'কাচ্চি বিরিয়ানি (১৫০)',
      lunch: 'তেহারি + গরুর মাংস (১৪০)',
      dinner: 'পিৎজা + সফট ড্রিংকস (১৩০)'
    },
    {
      day: 'শুক্রবার',
      morning: 'বার্গার + ফ্রাই + কফি (১২০)',
      lunch: 'স্পেশাল ডায়মন্ড প্লেটার (২০০)',
      dinner: 'বুফে ডিনার (২৫০)'
    }
  ]

  // Get current data based on selected package
  const weeklyData = selectedPackage === 'golden' ? goldenData : diamondData

  // Get today's and tomorrow's menu
  const todayMenu = weeklyData.find(item => item.day === currentDay)
  const tomorrowMenu = weeklyData.find(item => item.day === nextDay)

  return (
    <section className="px-4 sm:px-8 md:px-[100px] lg:px-[150px] xl:px-[200px] py-[50px] md:py-[100px] bg-white">
      <div className="max-w-6xl mx-auto">

        {/* Full Weekly Menu Table */}
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800">
            {selectedPackage === 'golden' ? '✨ গোল্ডেন প্যাকেজের সাপ্তাহিক মেনু ✨' : '💎 ডায়মন্ড প্যাকেজের সাপ্তাহিক মেনু 💎'}
          </h2>
        </div>

        {/* Package Selection Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <button
            onClick={() => setSelectedPackage('golden')}
            className={`flex items-center justify-center gap-2 px-8 py-3 rounded-lg font-bold text-lg transition-all duration-300 ${
              selectedPackage === 'golden'
                ? 'bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white shadow-lg scale-105'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            <Star className="w-5 h-5" />
            ✨ গোল্ডেন প্যাকেজ ✨
          </button>
          <button
            onClick={() => setSelectedPackage('diamond')}
            className={`flex items-center justify-center gap-2 px-8 py-3 rounded-lg font-bold text-lg transition-all duration-300 ${
              selectedPackage === 'diamond'
                ? 'bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white shadow-lg scale-105'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            <Diamond className="w-5 h-5" />
            💎 ডায়মন্ড প্যাকেজ 💎
          </button>
        </div>

        {/* Meal Type Header */}
        <div className="grid grid-cols-4 bg-gray-800 text-white text-center font-bold rounded-t-lg overflow-hidden">
          <div className="p-3 border-r border-gray-600 text-sm sm:text-base font-bold flex items-center justify-center gap-2">
            <Calendar className="w-4 h-4" /> বার
          </div>
          <div className="p-3 border-r border-gray-600 text-sm sm:text-base font-bold flex items-center justify-center gap-2">
            <Coffee className="w-4 h-4" /> সকালের খাবার
          </div>
          <div className="p-3 border-r border-gray-600 text-sm sm:text-base font-bold flex items-center justify-center gap-2">
            <Sun className="w-4 h-4" /> দুপুরের খাবার
          </div>
          <div className="p-3 text-sm sm:text-base font-bold flex items-center justify-center gap-2">
            <Moon className="w-4 h-4" /> রাতের খাবার
          </div>
        </div>

        {/* Table Body */}
        <div className="border-x border-b border-gray-200 rounded-b-lg overflow-hidden">
          {weeklyData.map((item, index) => (
            <div 
              key={item.day}
              className={`grid grid-cols-4 ${
                index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
              } border-b border-gray-200 last:border-b-0 transition-colors`}
            >
              <div className={`p-3 border-r border-gray-200 font-bold text-gray-800 text-sm sm:text-base ${
                item.day === currentDay ? 'bg-blue-100 text-blue-800' : ''
              }`}>
                {item.day}
                {item.day === currentDay && (
                  <span className="ml-2 text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded">
                    আজ
                  </span>
                )}
              </div>
              <div className="p-3 border-r border-gray-200 text-gray-700 font-medium text-xs sm:text-sm">
                {item.morning}
              </div>
              <div className="p-3 border-r border-gray-200 text-gray-700 font-medium text-xs sm:text-sm">
                {item.lunch}
              </div>
              <div className="p-3 text-gray-700 font-medium text-xs sm:text-sm">
                {item.dinner}
              </div>
            </div>
          ))}
        </div>

        {/* Today's Menu & Tomorrow's Menu Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          {/* Today's Menu */}
          <div className="rounded-xl shadow-lg overflow-hidden border border-gray-200">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-6 h-6 text-yellow-300" />
                <h3 className="text-white text-xl font-bold text-center">
                  আজকের খাবারের মেনু - {currentDay}
                </h3>
              </div>
            </div>
            <div className="p-5 bg-white">
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg bg-gray-50">
                  <span className="font-bold w-full sm:w-28 text-blue-600 flex items-center gap-2">
                    <Coffee className="w-4 h-4" /> সকাল:
                  </span>
                  <span className="text-gray-700 font-medium">{todayMenu?.morning || 'N/A'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg bg-gray-50">
                  <span className="font-bold w-full sm:w-28 text-blue-600 flex items-center gap-2">
                    <Sun className="w-4 h-4" /> দুপুর:
                  </span>
                  <span className="text-gray-700 font-medium">{todayMenu?.lunch || 'N/A'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg bg-gray-50">
                  <span className="font-bold w-full sm:w-28 text-blue-600 flex items-center gap-2">
                    <Moon className="w-4 h-4" /> রাত:
                  </span>
                  <span className="text-gray-700 font-medium">{todayMenu?.dinner || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tomorrow's Menu */}
          <div className="rounded-xl shadow-lg overflow-hidden border border-gray-200">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
              <div className="flex items-center justify-center gap-2">
                <Crown className="w-6 h-6 text-yellow-300" />
                <h3 className="text-white text-xl font-bold text-center">
                  আগামিকালের খাবারের মেনু - {nextDay}
                </h3>
              </div>
            </div>
            <div className="p-5 bg-white">
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg bg-gray-50">
                  <span className="font-bold w-full sm:w-28 text-blue-600 flex items-center gap-2">
                    <Coffee className="w-4 h-4" /> সকাল:
                  </span>
                  <span className="text-gray-700 font-medium">{tomorrowMenu?.morning || 'N/A'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg bg-gray-50">
                  <span className="font-bold w-full sm:w-28 text-blue-600 flex items-center gap-2">
                    <Sun className="w-4 h-4" /> দুপুর:
                  </span>
                  <span className="text-gray-700 font-medium">{tomorrowMenu?.lunch || 'N/A'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg bg-gray-50">
                  <span className="font-bold w-full sm:w-28 text-blue-600 flex items-center gap-2">
                    <Moon className="w-4 h-4" /> রাত:
                  </span>
                  <span className="text-gray-700 font-medium">{tomorrowMenu?.dinner || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Button */}
        <div className="text-center mt-10">
          <button className={`flex items-center justify-center gap-2 mx-auto px-8 py-3 rounded-lg text-sm sm:text-base font-bold transition-all duration-300 shadow-lg ${
            selectedPackage === 'golden' 
              ? 'bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white hover:shadow-xl' 
              : 'bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white hover:shadow-xl'
          }`}>
            <Utensils className="w-5 h-5" />
            {selectedPackage === 'golden' ? '✨ গোল্ডেন প্যাকেজ অর্ডার করুন ✨' : '💎 ডায়মন্ড প্যাকেজ অর্ডার করুন 💎'}
          </button>
        </div>
      </div>
    </section>
  )
}

export default WeeklyMenu