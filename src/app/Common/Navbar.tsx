// components/Navbar.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { User, Menu, X, Home, ShoppingBag, Users, Calendar, LayoutDashboard } from 'lucide-react';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleProfileClick = () => {
    router.push('/dashboard/profile');
  };

  const navLinks = [
    { name: 'হোম', href: '/', icon: Home },
    { name: 'অর্ডার', href: '/order', icon: ShoppingBag },
    { name: 'গেস্ট মিল', href: '/guest-meal', icon: Users },
    { name: 'সাবস্ক্রিপশন', href: '/subscription', icon: Calendar },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-br from-[#3B82F6] to-[#111827] shadow-lg">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Navigation Bar */}
        <div className="flex items-center justify-between py-3 md:py-4">
          {/* Logo */}
          <Link href="/" className="group">
            <div className="flex items-center gap-2">
              <span className="text-2xl md:text-3xl font-bold text-white">
                FCS
              </span>
              <span className="hidden sm:inline-block text-xs bg-white/20 px-2 py-1 rounded-full text-white">
                হোমমেইড
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                    isActive
                      ? 'bg-white/20 text-white shadow-md'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <link.icon size={18} />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Section - Profile Only */}
          <div className="flex items-center gap-4">
            {/* Profile Button */}
            <button
              onClick={handleProfileClick}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition-all duration-200 group"
            >
              <User size={20} className="group-hover:scale-110 transition-transform" />
              <span className="hidden md:inline text-sm font-medium">প্রোফাইল</span>
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMenu}
              className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={toggleMenu} />
      )}

      {/* Mobile Menu Panel */}
      <div
        className={`
          lg:hidden fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out
          ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="p-6">
          {/* Mobile Menu Header */}
          <div className="flex justify-between items-center mb-8 pb-4 border-b">
            <div>
              <span className="text-xl font-bold bg-gradient-to-br from-[#3B82F6] to-[#111827] bg-clip-text text-transparent">
                FCS
              </span>
              <p className="text-xs text-gray-500 mt-1">মেনু</p>
            </div>
            <button
              onClick={toggleMenu}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>

          {/* Mobile Navigation Links */}
          <div className="space-y-2 mb-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={toggleMenu}
                  className={`flex items-center gap-3 py-3 px-4 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <link.icon size={20} />
                  <span className="font-medium">{link.name}</span>
                  {isActive && (
                    <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded-full">
                      এখন
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Mobile Profile Section */}
          <div className="border-t pt-6">
            <button
              onClick={() => {
                handleProfileClick();
                toggleMenu();
              }}
              className="w-full flex items-center gap-3 py-3 px-4 rounded-lg hover:bg-gray-100 transition-colors group"
            >
              <div className="bg-gradient-to-br from-[#3B82F6] to-[#111827] p-2 rounded-full text-white">
                <User size={18} />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-800">আমার অ্যাকাউন্ট</p>
                <p className="text-xs text-gray-500">প্রোফাইল দেখুন ও এডিট করুন</p>
              </div>
              <LayoutDashboard size={16} className="ml-auto text-gray-400 group-hover:text-[#3B82F6]" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;