'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Calendar,
  ShoppingBag,
  Users,
  Clock,
  Settings,
  LogOut,
  Crown,
  X,
  DollarSign,
  MapPin
} from 'lucide-react';

interface SidebarProps {
  onClose?: () => void;
}

const Sidebar = ({ onClose }: SidebarProps) => {
  const pathname = usePathname();

  const menuItems = [
    { name: 'ড্যাশবোর্ড', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'ফাইন্যান্স', href: '/admin/dashboard/finance', icon: DollarSign },
    { name: 'প্যাকেজ ম্যানেজ', href: '/admin/dashboard/packages', icon: Package },
    { name: 'উইকলি মেনু', href: '/admin/dashboard/weekly-menu', icon: Calendar },
    { name: 'জোন ম্যানেজ', href: '/admin/dashboard/zones', icon: MapPin },
    { name: 'অর্ডার লিস্ট', href: '/admin/dashboard/orders', icon: ShoppingBag },
    { name: 'ক্যাশ অন ডেলিভারি', href: '/admin/dashboard/cod-orders', icon: DollarSign },
    { name: 'সাবস্ক্রাইবার লিস্ট', href: '/admin/dashboard/subscribers', icon: Users },
    { name: 'পেন্ডিং ট্রানজেকশন', href: '/admin/dashboard/pending-transactions', icon: Clock },
    { name: 'পেন্ডিং সাবস্ক্রাইবার', href: '/admin/dashboard/pending-subscribers', icon: Clock },
    { name: 'মিল বন্ধের তারিখ', href: '/admin/dashboard/blocked-dates', icon: Calendar },
    { name: 'সেটিংস', href: '/admin/dashboard/settings', icon: Settings },
  ];

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    window.location.href = '/admin/login';
  };

  return (
    <aside className="w-72 h-full bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white flex flex-col shadow-xl">
      {/* Close button for mobile */}
      <div className="lg:hidden absolute top-4 right-4">
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      <div className="p-6 border-b border-white/20">
        <div className="flex items-center gap-2">
          <div className="bg-white/20 p-2 rounded-lg">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">FoodBox Admin</h1>
            <p className="text-blue-200 text-xs">ম্যানেজমেন্ট প্যানেল</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-white/20 text-white shadow-md'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium text-sm md:text-base">{item.name}</span>
              {isActive && (
                <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded-full">
                  এখন
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/20">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200"
        >
          <LogOut size={20} />
          <span className="font-medium">লগআউট</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;