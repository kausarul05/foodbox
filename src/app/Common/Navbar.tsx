// components/Navbar.tsx
'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { ShoppingCart, User, Search, Menu, X } from 'lucide-react';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-md">
      <div className="container mx-auto px-4">
        {/* Main Navigation Bar */}
        <div className="flex items-center justify-between py-3 md:py-4">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="text-2xl md:text-3xl font-bold text-red-600">
              FOODBOX
            </Link>
          </div>

          {/* Desktop Navigation - Hidden on Mobile */}
          <div className="hidden lg:flex items-center space-x-8">
            <NavLinks />
            <div className="hidden xl:block">
              <SearchBar />
            </div>
            <IconButtons />
          </div>

          {/* Mobile Right Side Buttons */}
          <div className="flex lg:hidden items-center space-x-4">
            <button 
              onClick={toggleSearch}
              className="p-2 text-gray-700 hover:text-red-600 transition-colors"
              aria-label="Search"
            >
              {isSearchOpen ? <X size={22} /> : <Search size={22} />}
            </button>
            <button 
              onClick={toggleMenu}
              className="p-2 text-gray-700 hover:text-red-600 transition-colors"
              aria-label="Menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Desktop Only - Cart & User */}
          <div className="hidden lg:flex xl:hidden items-center space-x-6">
            <IconButtons />
          </div>
        </div>

        {/* Mobile Search Bar */}
        {isSearchOpen && (
          <div className="lg:hidden pb-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for products..."
                className="w-full py-3 px-4 pl-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>
          </div>
        )}
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={toggleMenu} />
      )}

      {/* Mobile Menu Panel */}
      <div className={`
        lg:hidden fixed top-0 right-0 h-full w-64 bg-white shadow-2xl z-50 transform transition-transform duration-300
        ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-8">
            <span className="text-xl font-bold text-gray-800">Menu</span>
            <button 
              onClick={toggleMenu}
              className="p-2 hover:bg-gray-100 rounded-full"
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Mobile Navigation Links */}
          <div className="space-y-4 mb-8">
            <MobileNavLinks toggleMenu={toggleMenu} />
          </div>

          {/* Mobile User Section */}
          <div className="border-t pt-6">
            <div className="flex flex-col space-y-4">
              <button className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <User size={20} className="text-gray-700" />
                <span className="text-gray-800">My Account</span>
              </button>
              <button className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <ShoppingCart size={20} className="text-gray-700" />
                <div className="flex-1 flex justify-between items-center">
                  <span className="text-gray-800">My Cart</span>
                  <span className="bg-red-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                    0
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

const NavLinks = () => {
  const links = [
    { name: 'Home', href: '/' },
    { name: 'Order', href: '/order' },
    { name: 'Guest Meal', href: '/guest-meal' },
    { name: 'Subscription', href: '/subscription' },
  ];

  return (
    <div className="flex items-center space-x-8">
      {links.map((link) => (
        <Link
          key={link.name}
          href={link.href}
          className="text-gray-800 font-medium hover:text-red-600 transition-colors duration-200 text-sm xl:text-base"
        >
          {link.name}
        </Link>
      ))}
    </div>
  );
};

const MobileNavLinks = ({ toggleMenu }: { toggleMenu: () => void }) => {
  const links = [
    { name: 'Home', href: '/' },
    { name: 'Order', href: '/order' },
    { name: 'Guest Meal', href: '/guest-meal' },
    { name: 'Subscription', href: '/subscription' },
  ];

  return (
    <>
      {links.map((link) => (
        <Link
          key={link.name}
          href={link.href}
          onClick={toggleMenu}
          className="block py-3 px-4 text-gray-800 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 font-medium"
        >
          {link.name}
        </Link>
      ))}
    </>
  );
};

const SearchBar = () => {
  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search for products..."
        className="py-2 px-4 pl-10 pr-4 w-56 xl:w-64 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
      />
      <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
    </div>
  );
};

const IconButtons = () => {
  return (
    <div className="flex items-center space-x-6">
      <button 
        className="relative p-2 text-gray-700 hover:text-red-600 transition-colors"
        aria-label="User account"
      >
        <User size={22} />
      </button>
      <button 
        className="relative p-2 text-gray-700 hover:text-red-600 transition-colors"
        aria-label="Shopping cart"
      >
        <ShoppingCart size={22} />
        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          0
        </span>
      </button>
    </div>
  );
};

export default Navbar;