'use client'

import React from 'react'

interface MealItem {
  item: string
  price?: string
}

interface DayMeal {
  day: string
  morning?: string
  lunch?: string
  dinner?: string
  notes?: string
}

const WeeklyMenu: React.FC = () => {
  const weeklyData: DayMeal[] = [
    {
      day: 'শনিবার',
      morning: 'ছোট মাছের তরকারি + ভাত + ডাল (৫০)',
      lunch: 'ভাত + ডাল + মুরগী ভুনা (৫০)',
      dinner: 'ভাত + ডাল + মুরগী ভুনা (৫০)'
    },
    {
      day: 'রবিবার',
      morning: 'সবজি খিচুড়ি + ডিম ভুনা (৫০)',
      lunch: 'গরুর কলিজা ভুনা + ভাত + ডাল (৫০)',
      dinner: 'গরুর মাংস ভুনা + ভাত + ডাল (৫০)'
    },
    {
      day: 'সোমবার',
      morning: 'ডিম ভুনা + ভাত + ডাল (৫০)',
      lunch: 'ভাত + ডাল + মুরগী ভুনা (৫০)',
      dinner: 'গরুর মাংস ভুনা + ভাত + ডাল (৫০)'
    },
    {
      day: 'মঙ্গলবার',
      morning: 'ছোট মাছের তরকারি + ভাত + ডাল (৫০)',
      lunch: 'গরুর মাংস ভুনা + ভাত + ডাল (৫০)',
      dinner: 'মুরগী ভুনা + ভাত + ডাল (৫০)'
    },
    {
      day: 'বুধবার',
      morning: 'ডিম ভুনা + ভাত + ডাল (৫০)',
      lunch: 'গরুর মাংস ভুনা + ভাত + ডাল (৫০)',
      dinner: 'মুরগী ভুনা + ভাত + ডাল (৫০)'
    },
    {
      day: 'বৃহস্পতিবার',
      morning: 'সবজি খিচুড়ি + ডিম ভুনা (৫০)',
      lunch: 'গরুর কলিজা ভুনা + ভাত + ডাল (৫০)',
      dinner: 'গরুর মাংস ভুনা + ভাত + ডাল (৫০)'
    },
    {
      day: 'শুক্রবার',
      morning: 'ছোট মাছের তরকারি + ভাত + ডাল (৫০)',
      lunch: 'গরুর মাংস ভুনা + ভাত + ডাল (৫০)',
      dinner: 'মুরগী ভুনা + ভাত + ডাল (৫০)'
    }
  ]

  return (
    <section className="px-[200px] py-[100px] bg-white">
      <div className="">
        {/* Header */}
        <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-800 mb-4">
          সাপ্তাহিক খাবারের মেনু
        </h2>

        {/* Meal Type Header - Exact match */}
        <div className="grid grid-cols-4 bg-orange-500 text-white text-center font-medium">
          <div className="p-3 border-r border-orange-400 text-sm sm:text-base">বার</div>
          <div className="p-3 border-r border-orange-400 text-sm sm:text-base">সকালের খাবার</div>
          <div className="p-3 border-r border-orange-400 text-sm sm:text-base">দুপুরের খাবার</div>
          <div className="p-3 text-sm sm:text-base">রাতের খাবার</div>
        </div>

        {/* Table Body */}
        <div className="border-x border-b border-gray-200">
          {weeklyData.map((item, index) => (
            <div 
              key={item.day}
              className={`grid grid-cols-4 ${
                index % 2 === 0 ? 'bg-white' : 'bg-orange-50'
              } border-b border-gray-200 last:border-b-0`}
            >
              {/* Day Column */}
              <div className="p-3 border-r border-gray-200 font-medium text-gray-800 text-sm sm:text-base">
                {item.day}
              </div>
              
              {/* Morning Meal */}
              <div className="p-3 border-r border-gray-200 text-gray-700 text-xs sm:text-sm">
                {item.morning}
              </div>
              
              {/* Lunch Meal */}
              <div className="p-3 border-r border-gray-200 text-gray-700 text-xs sm:text-sm">
                {item.lunch}
              </div>
              
              {/* Dinner Meal */}
              <div className="p-3 text-gray-700 text-xs sm:text-sm">
                {item.dinner}
              </div>
            </div>
          ))}
        </div>

        {/* Order Button */}
        <div className="text-center mt-6">
          <button className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-2 rounded-lg text-sm sm:text-base font-medium transition-colors">
            অর্ডার করুন
          </button>
        </div>
      </div>
    </section>
  )
}

export default WeeklyMenu