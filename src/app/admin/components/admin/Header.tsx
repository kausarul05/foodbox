// components/admin/Header.tsx
'use client';

import React from 'react';
import { Bell, User, Settings, Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  return (
    <header className="bg-white shadow-md px-4 md:px-6 py-3 md:py-4">
      <div className="flex items-center justify-between">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>

        <div className="flex-1 lg:flex-none">
          <h2 className="text-lg md:text-xl font-semibold text-gray-800">স্বাগতম, অ্যাডমিন</h2>
          <p className="text-xs md:text-sm text-gray-500 hidden sm:block">আজকের ড্যাশবোর্ড ওভারভিউ</p>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings size={20} />
          </button>
          <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-3 border-l border-gray-200">
            <div className="bg-gradient-to-br from-[#3B82F6] to-[#111827] p-1.5 md:p-2 rounded-full">
              <User size={16} className="text-white md:w-5 md:h-5" />
            </div>
            <div className="hidden sm:block">
              <p className="font-medium text-gray-800 text-sm md:text-base">অ্যাডমিন</p>
              <p className="text-xs text-gray-500">সুপার অ্যাডমিন</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;