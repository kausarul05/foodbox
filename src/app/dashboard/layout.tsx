'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  User, 
  Wallet, 
  ShoppingBag, 
  LogOut,
  Home,
  LayoutDashboard
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { name: 'প্রোফাইল', href: '/dashboard/profile', icon: User },
    { name: 'ওয়ালেট', href: '/dashboard/wallet', icon: Wallet },
    { name: 'আমার অর্ডার', href: '/dashboard/orders', icon: ShoppingBag },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex md:flex-row flex-col gap-8 pt-4">
          {/* Sidebar */}
          <div className="lg:w-80">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden sticky top-24">
              {/* Sidebar Header */}
              <div className="bg-gradient-to-br from-[#3B82F6] to-[#111827] p-6 text-center">
                <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-3">
                  <User className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-white font-bold text-lg">kausar</h3>
                <p className="text-blue-200 text-sm">প্যাকেজ - N/A</p>
              </div>

              {/* Sidebar Navigation */}
              <div className="p-4">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-2 transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <item.icon size={20} />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}
                
                {/* Logout Button */}
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all duration-200 mt-4">
                  <LogOut size={20} />
                  <span className="font-medium">লগআউট</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}