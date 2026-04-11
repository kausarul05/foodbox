'use client';

import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Diamond, 
  Sun, 
  Moon, 
  Coffee, 
  Calendar, 
  Sparkles,
  Crown,
  Utensils,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { menuAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface DayMeal {
  _id?: string;
  day: string;
  morning?: string;
  lunch?: string;
  dinner?: string;
  package?: string;
  price?: number;
}

const WeeklyMenu: React.FC = () => {
  const [selectedPackage, setSelectedPackage] = useState<'golden' | 'diamond'>('golden');
  const [goldenData, setGoldenData] = useState<DayMeal[]>([]);
  const [diamondData, setDiamondData] = useState<DayMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [goldenError, setGoldenError] = useState<string | null>(null);
  const [diamondError, setDiamondError] = useState<string | null>(null);

  // Get current day and next day in Bengali
  const getCurrentAndNextDay = () => {
    const days = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
    const today = new Date().getDay();
    const currentDay = days[today];
    const nextDay = days[(today + 1) % 7];
    return { currentDay, nextDay };
  };

  const { currentDay, nextDay } = getCurrentAndNextDay();

  // Fetch menu data on load
  useEffect(() => {
    fetchGoldenMenu();
    fetchDiamondMenu();
  }, []);

  const fetchGoldenMenu = async () => {
    try {
      setGoldenError(null);
      const response = await menuAPI.getMenuByPackage('golden');
      console.log('Golden Menu:', response);
      
      if (response.success && response.data && response.data.length > 0) {
        const dayOrder = ['শনিবার', 'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার'];
        const sortedData = response.data.sort((a: DayMeal, b: DayMeal) => 
          dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)
        );
        setGoldenData(sortedData);
      } else {
        setGoldenError('গোল্ডেন প্যাকেজের মেনু পাওয়া যায়নি');
      }
    } catch (error: any) {
      console.error('Error fetching golden menu:', error);
      setGoldenError(error.message || 'গোল্ডেন প্যাকেজের মেনু লোড করতে ব্যর্থ হয়েছে');
    }
  };

  const fetchDiamondMenu = async () => {
    try {
      setDiamondError(null);
      const response = await menuAPI.getMenuByPackage('diamond');
      console.log('Diamond Menu:', response);
      
      if (response.success && response.data && response.data.length > 0) {
        const dayOrder = ['শনিবার', 'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার'];
        const sortedData = response.data.sort((a: DayMeal, b: DayMeal) => 
          dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)
        );
        setDiamondData(sortedData);
      } else {
        setDiamondError('ডায়মন্ড প্যাকেজের মেনু পাওয়া যায়নি');
      }
    } catch (error: any) {
      console.error('Error fetching diamond menu:', error);
      setDiamondError(error.message || 'ডায়মন্ড প্যাকেজের মেনু লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handlePackageChange = (pkg: 'golden' | 'diamond') => {
    setSelectedPackage(pkg);
  };

  const getCurrentData = () => {
    if (selectedPackage === 'golden') {
      return { data: goldenData, error: goldenError };
    } else {
      return { data: diamondData, error: diamondError };
    }
  };

  const { data: weeklyData, error: currentError } = getCurrentData();
  
  // Get today's and tomorrow's menu
  const todayMenu = weeklyData.find(item => item.day === currentDay);
  const tomorrowMenu = weeklyData.find(item => item.day === nextDay);

  // Show loading only on initial load
  if (loading && goldenData.length === 0 && diamondData.length === 0) {
    return (
      <section className="px-4 sm:px-8 md:px-[100px] lg:px-[150px] xl:px-[200px] py-[50px] md:py-[100px] bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="w-12 h-12 text-[#3B82F6] animate-spin mb-4" />
            <p className="text-gray-500 text-lg">মেনু লোড হচ্ছে...</p>
          </div>
        </div>
      </section>
    );
  }

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
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
          <button
            onClick={() => handlePackageChange('golden')}
            className={`flex items-center justify-center gap-2 px-8 py-3 rounded-lg font-bold text-lg transition-all duration-300 ${
              selectedPackage === 'golden'
                ? 'bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white shadow-lg scale-105'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            <Star className="w-5 h-5" />
            ✨ গোল্ডেন প্যাকেজ ✨
            {goldenError && selectedPackage === 'golden' && (
              <span className="ml-2 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded">No Data</span>
            )}
          </button>
          <button
            onClick={() => handlePackageChange('diamond')}
            className={`flex items-center justify-center gap-2 px-8 py-3 rounded-lg font-bold text-lg transition-all duration-300 ${
              selectedPackage === 'diamond'
                ? 'bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white shadow-lg scale-105'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            <Diamond className="w-5 h-5" />
            💎 ডায়মন্ড প্যাকেজ 💎
            {diamondError && selectedPackage === 'diamond' && (
              <span className="ml-2 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded">No Data</span>
            )}
          </button>
        </div>

        {/* Show error for current selected package */}
        {currentError ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
            <div className="bg-red-50 rounded-full p-4 mx-auto w-fit mb-4">
              <AlertCircle className="w-16 h-16 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">মেনু পাওয়া যায়নি</h2>
            <p className="text-gray-500 mb-6">{currentError}</p>
            <button
              onClick={() => {
                if (selectedPackage === 'golden') {
                  fetchGoldenMenu();
                } else {
                  fetchDiamondMenu();
                }
              }}
              className="bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-300"
            >
              আবার চেষ্টা করুন
            </button>
          </div>
        ) : weeklyData.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
            <div className="bg-yellow-50 rounded-full p-4 mx-auto w-fit mb-4">
              <AlertCircle className="w-16 h-16 text-yellow-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">কোনো মেনু নেই</h2>
            <p className="text-gray-500">এই প্যাকেজের জন্য এখনো কোনো মেনু যোগ করা হয়নি</p>
          </div>
        ) : (
          <>
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
                    {item.morning || 'N/A'}
                  </div>
                  <div className="p-3 border-r border-gray-200 text-gray-700 font-medium text-xs sm:text-sm">
                    {item.lunch || 'N/A'}
                  </div>
                  <div className="p-3 text-gray-700 font-medium text-xs sm:text-sm">
                    {item.dinner || 'N/A'}
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
              <button className="flex items-center justify-center gap-2 mx-auto px-8 py-3 rounded-lg text-sm sm:text-base font-bold transition-all duration-300 shadow-lg bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white hover:shadow-xl">
                <Utensils className="w-5 h-5" />
                {selectedPackage === 'golden' ? '✨ গোল্ডেন প্যাকেজ অর্ডার করুন ✨' : '💎 ডায়মন্ড প্যাকেজ অর্ডার করুন 💎'}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default WeeklyMenu;