'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  AlertCircle,
  Package,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { menuAPI, packageAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface DayMeal {
  _id?: string;
  day: string;
  morning?: string;
  lunch?: string;
  dinner?: string;
  morningPrice?: number;
  lunchPrice?: number;
  dinnerPrice?: number;
  package?: string;
}

interface PackageType {
  _id: string;
  name: string;
  title: string;
  price: number;
  originalPrice: number;
  features: string[];
  isActive: boolean;
}

const WeeklyMenu: React.FC = () => {
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [menuData, setMenuData] = useState<{ [key: string]: DayMeal[] }>({});
  const [loading, setLoading] = useState(true);
  const [menuLoading, setMenuLoading] = useState(false);
  const [packageErrors, setPackageErrors] = useState<{ [key: string]: string | null }>({});
  const [showAllDays, setShowAllDays] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get current day and next day in Bengali
  const getCurrentAndNextDay = () => {
    const days = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
    const today = new Date().getDay();
    const currentDay = days[today];
    const nextDay = days[(today + 1) % 7];
    return { currentDay, nextDay };
  };

  const { currentDay, nextDay } = getCurrentAndNextDay();

  // Fetch packages on load
  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await packageAPI.getAllPackages();
      console.log('Packages response:', response);
      
      if (response.success && response.data && response.data.length > 0) {
        const activePackages = response.data.filter((pkg: PackageType) => pkg.isActive);
        setPackages(activePackages);
        if (activePackages.length > 0) {
          const firstPackageId = activePackages[0]._id;
          setSelectedPackageId(firstPackageId);
          // Fetch menu for first package immediately
          await fetchMenuForPackage(firstPackageId);
        }
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('প্যাকেজ লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuForPackage = async (packageId: string) => {
    try {
      setMenuLoading(true);
      const pkg = packages.find(p => p._id === packageId);
      if (!pkg) return;
      
      setPackageErrors(prev => ({ ...prev, [packageId]: null }));
      const response = await menuAPI.getMenuByPackage(pkg.name);
      console.log(`Menu for ${pkg.name}:`, response);
      
      if (response.success && response.data && response.data.length > 0) {
        const dayOrder = ['শনিবার', 'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার'];
        const sortedData = response.data.sort((a: DayMeal, b: DayMeal) => 
          dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)
        );
        setMenuData(prev => ({ ...prev, [packageId]: sortedData }));
      } else {
        setPackageErrors(prev => ({ ...prev, [packageId]: 'মেনু পাওয়া যায়নি' }));
        setMenuData(prev => ({ ...prev, [packageId]: [] }));
      }
    } catch (error: any) {
      console.error(`Error fetching menu for package:`, error);
      setPackageErrors(prev => ({ ...prev, [packageId]: error.message || 'মেনু লোড করতে ব্যর্থ হয়েছে' }));
      setMenuData(prev => ({ ...prev, [packageId]: [] }));
    } finally {
      setMenuLoading(false);
    }
  };

  const handlePackageChange = async (packageId: string) => {
    setSelectedPackageId(packageId);
    setShowAllDays(false);
    if (!menuData[packageId]) {
      await fetchMenuForPackage(packageId);
    }
  };

  const selectedPackage = packages.find(p => p._id === selectedPackageId);
  const currentMenu = selectedPackageId ? menuData[selectedPackageId] || [] : [];
  const currentError = selectedPackageId ? packageErrors[selectedPackageId] : null;

  // Get today's and tomorrow's menu
  const todayMenu = currentMenu.find(item => item.day === currentDay);
  const tomorrowMenu = currentMenu.find(item => item.day === nextDay);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <section className="px-4 py-8 md:py-12 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="w-12 h-12 text-[#3B82F6] animate-spin mb-4" />
            <p className="text-gray-500 text-lg">লোড হচ্ছে...</p>
          </div>
        </div>
      </section>
    );
  }

  if (packages.length === 0) {
    return (
      <section className="px-4 py-8 md:py-12 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 text-center border border-gray-200">
            <div className="bg-yellow-50 rounded-full p-4 mx-auto w-fit mb-4">
              <Package className="w-16 h-16 text-yellow-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">কোনো প্যাকেজ নেই</h2>
            <p className="text-gray-500">বর্তমানে কোনো সক্রিয় প্যাকেজ নেই</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-6 md:py-12 bg-gray-50 min-h-screen lg:mt-28 pt-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800">
            আমাদের প্যাকেজসমূহ
          </h1>
          <p className="text-gray-500 text-sm md:text-base mt-2">
            আপনার পছন্দের প্যাকেজ সিলেক্ট করে মেনু দেখুন
          </p>
        </div>

        {/* Package Selection - Horizontal Scroll on Mobile */}
        <div className="relative mb-8">
          {/* <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 lg:hidden">
            <button
              onClick={scrollLeft}
              className="bg-white shadow-md rounded-full p-2 hover:bg-gray-100 transition"
            >
              <ChevronLeft size={20} />
            </button>
          </div> */}
          <div
            ref={scrollRef}
            className="flex overflow-x-auto scrollbar-hide gap-3 pb-4 px-8 lg:px-0 lg:justify-center lg:flex-wrap lg:overflow-visible"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {packages.map((pkg) => (
              <button
                key={pkg._id}
                onClick={() => handlePackageChange(pkg._id)}
                className={`flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-lg font-bold text-sm md:text-lg transition-all duration-300 ${
                  selectedPackageId === pkg._id
                    ? 'bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white shadow-lg scale-105'
                    : 'bg-white text-gray-600 hover:bg-gray-100 shadow-md'
                }`}
              >
                {pkg.name.toLowerCase().includes('golden') ? <Star className="w-4 h-4 md:w-5 md:h-5" /> : <Diamond className="w-4 h-4 md:w-5 md:h-5" />}
                {pkg.title}
              </button>
            ))}
          </div>
          {/* <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 lg:hidden">
            <button
              onClick={scrollRight}
              className="bg-white shadow-md rounded-full p-2 hover:bg-gray-100 transition"
            >
              <ChevronRight size={20} />
            </button>
          </div> */}
        </div>

        {/* Menu Content */}
        {menuLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-10 h-10 text-[#3B82F6] animate-spin mb-3" />
            <p className="text-gray-500">মেনু লোড হচ্ছে...</p>
          </div>
        ) : currentError ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 text-center border border-gray-200">
            <div className="bg-red-50 rounded-full p-4 mx-auto w-fit mb-4">
              <AlertCircle className="w-16 h-16 text-red-500" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">মেনু পাওয়া যায়নি</h2>
            <p className="text-gray-500 mb-6">{currentError}</p>
            <button
              onClick={() => fetchMenuForPackage(selectedPackageId)}
              className="bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition"
            >
              আবার চেষ্টা করুন
            </button>
          </div>
        ) : currentMenu.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 text-center border border-gray-200">
            <div className="bg-yellow-50 rounded-full p-4 mx-auto w-fit mb-4">
              <AlertCircle className="w-16 h-16 text-yellow-500" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">কোনো মেনু নেই</h2>
            <p className="text-gray-500">এই প্যাকেজের জন্য এখনো কোনো মেনু যোগ করা হয়নি</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View - Hidden on Mobile */}
            <div className="hidden md:block bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-[#3B82F6] to-[#111827]">
                    <tr>
                      <th className="px-4 py-3 text-left text-white font-semibold">দিন</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">সকালের খাবার</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">দাম</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">দুপুরের খাবার</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">দাম</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">রাতের খাবার</th>
                      <th className="px-4 py-3 text-left text-white font-semibold">দাম</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentMenu.map((item, index) => (
                      <tr key={item.day} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className={`px-4 py-3 font-semibold text-gray-800 ${item.day === currentDay ? 'bg-blue-50 text-blue-800' : ''}`}>
                          {item.day}
                          {item.day === currentDay && (
                            <span className="ml-2 text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded">আজ</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{item.morning || 'N/A'}</td>
                        <td className="px-4 py-3 text-[#3B82F6] font-semibold">৳ {item.morningPrice || 0}</td>
                        <td className="px-4 py-3 text-gray-700">{item.lunch || 'N/A'}</td>
                        <td className="px-4 py-3 text-[#3B82F6] font-semibold">৳ {item.lunchPrice || 0}</td>
                        <td className="px-4 py-3 text-gray-700">{item.dinner || 'N/A'}</td>
                        <td className="px-4 py-3 text-[#3B82F6] font-semibold">৳ {item.dinnerPrice || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View - Visible only on mobile */}
            <div className="md:hidden space-y-4">
              {/* Today's Special Highlight */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                  <span className="font-semibold">আজকের স্পেশাল</span>
                </div>
                <p className="text-sm opacity-90">{currentDay}</p>
              </div>

              {/* Days List */}
              {currentMenu.map((item) => (
                <div
                  key={item.day}
                  className={`bg-white rounded-xl shadow-md overflow-hidden ${item.day === currentDay ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className={`px-4 py-3 ${item.day === currentDay ? 'bg-blue-50' : 'bg-gray-50'} border-b`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-800">{item.day}</span>
                      {item.day === currentDay && (
                        <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">আজ</span>
                      )}
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {/* Morning Meal */}
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Coffee className="w-4 h-4 text-amber-500" />
                          <span className="text-sm font-medium text-gray-600">সকাল</span>
                        </div>
                        <p className="text-gray-800 text-sm">{item.morning || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[#3B82F6] font-bold">৳ {item.morningPrice || 0}</span>
                      </div>
                    </div>
                    {/* Lunch Meal */}
                    <div className="flex justify-between items-start pt-2 border-t border-gray-100">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Sun className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm font-medium text-gray-600">দুপুর</span>
                        </div>
                        <p className="text-gray-800 text-sm">{item.lunch || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[#3B82F6] font-bold">৳ {item.lunchPrice || 0}</span>
                      </div>
                    </div>
                    {/* Dinner Meal */}
                    <div className="flex justify-between items-start pt-2 border-t border-gray-100">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Moon className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium text-gray-600">রাত</span>
                        </div>
                        <p className="text-gray-800 text-sm">{item.dinner || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[#3B82F6] font-bold">৳ {item.dinnerPrice || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Today's & Tomorrow's Menu Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-6 md:mt-8">
              {/* Today's Menu */}
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 md:px-6 md:py-4">
                  <div className="flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-yellow-300" />
                    <h3 className="text-white font-bold text-base md:text-xl text-center">
                      আজকের খাবার - {currentDay}
                    </h3>
                  </div>
                </div>
                <div className="p-4 md:p-5 space-y-3">
                  <div className="flex justify-between items-center p-2 md:p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Coffee className="w-4 h-4 text-amber-500" />
                      <span className="font-medium text-gray-700 text-sm md:text-base">সকাল:</span>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-800 text-sm md:text-base">{todayMenu?.morning || 'N/A'}</p>
                      <p className="text-[#3B82F6] font-bold text-sm md:text-base">৳ {todayMenu?.morningPrice || 0}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-2 md:p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Sun className="w-4 h-4 text-yellow-500" />
                      <span className="font-medium text-gray-700 text-sm md:text-base">দুপুর:</span>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-800 text-sm md:text-base">{todayMenu?.lunch || 'N/A'}</p>
                      <p className="text-[#3B82F6] font-bold text-sm md:text-base">৳ {todayMenu?.lunchPrice || 0}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-2 md:p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Moon className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-gray-700 text-sm md:text-base">রাত:</span>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-800 text-sm md:text-base">{todayMenu?.dinner || 'N/A'}</p>
                      <p className="text-[#3B82F6] font-bold text-sm md:text-base">৳ {todayMenu?.dinnerPrice || 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tomorrow's Menu */}
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 md:px-6 md:py-4">
                  <div className="flex items-center justify-center gap-2">
                    <Crown className="w-5 h-5 md:w-6 md:h-6 text-yellow-300" />
                    <h3 className="text-white font-bold text-base md:text-xl text-center">
                      আগামীকালের খাবার - {nextDay}
                    </h3>
                  </div>
                </div>
                <div className="p-4 md:p-5 space-y-3">
                  <div className="flex justify-between items-center p-2 md:p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Coffee className="w-4 h-4 text-amber-500" />
                      <span className="font-medium text-gray-700 text-sm md:text-base">সকাল:</span>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-800 text-sm md:text-base">{tomorrowMenu?.morning || 'N/A'}</p>
                      <p className="text-[#3B82F6] font-bold text-sm md:text-base">৳ {tomorrowMenu?.morningPrice || 0}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-2 md:p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Sun className="w-4 h-4 text-yellow-500" />
                      <span className="font-medium text-gray-700 text-sm md:text-base">দুপুর:</span>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-800 text-sm md:text-base">{tomorrowMenu?.lunch || 'N/A'}</p>
                      <p className="text-[#3B82F6] font-bold text-sm md:text-base">৳ {tomorrowMenu?.lunchPrice || 0}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-2 md:p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Moon className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-gray-700 text-sm md:text-base">রাত:</span>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-800 text-sm md:text-base">{tomorrowMenu?.dinner || 'N/A'}</p>
                      <p className="text-[#3B82F6] font-bold text-sm md:text-base">৳ {tomorrowMenu?.dinnerPrice || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Button */}
            <div className="text-center mt-8 md:mt-10">
              <button className="flex items-center justify-center gap-2 mx-auto px-6 py-2 md:px-8 md:py-3 rounded-lg text-sm md:text-base font-bold transition-all duration-300 shadow-lg bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white hover:shadow-xl">
                <Utensils className="w-4 h-4 md:w-5 md:h-5" />
                {selectedPackage?.title} অর্ডার করুন
              </button>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  );
};

export default WeeklyMenu;