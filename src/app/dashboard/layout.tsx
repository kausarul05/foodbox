// app/dashboard/layout.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Wallet,
  ShoppingBag,
  LogOut,
  LayoutDashboard
} from 'lucide-react';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);



  const checkAuth = () => {
    const token = localStorage.getItem('userToken');
    const user = localStorage.getItem('userData');

    if (!token || !user) {
      router.push('/');
      toast.error('দয়া করে লগইন করুন');
    } else {
      setUserData(JSON.parse(user));
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const navItems = [
    { name: 'প্রোফাইল', href: '/dashboard/profile', icon: User },
    { name: 'ওয়ালেট', href: '/dashboard/wallet', icon: Wallet },
    { name: 'আমার অর্ডার', href: '/dashboard/orders', icon: ShoppingBag },
  ];

  const handleLogout = () => {
    authAPI.logout();
    toast.success('লগআউট সফল!');
    window.location.href = '/';
  };

  const getPackageName = () => {
    if (userData?.package) {
      return userData.package === 'golden' ? 'গোল্ডেন' : 'ডায়মন্ড';
    }
    return 'N/A';
  };

  return (
    <div className="min-h-screen bg-gray-50 mt-8 md:mt-8">
      <div className="container mx-auto px-4 py-8">
        <div className="flex md:flex-row flex-col gap-8 pt-4">
          {/* Sidebar */}
          <div className="lg:w-80">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden sticky top-24">
              <div className="bg-gradient-to-br from-[#3B82F6] to-[#111827] p-6 text-center">
                <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-3">
                  <User className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-lg">{userData?.fullName || 'User'}</h3>
                <p className="text-blue-200 text-sm">প্যাকেজ - {getPackageName()}</p>
              </div>

              <div className="p-4">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-2 transition-all duration-200 ${isActive
                          ? 'bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                      <item.icon size={20} />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all duration-200 mt-4"
                >
                  <LogOut size={20} />
                  <span className="font-medium">লগআউট</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}