// components/Navbar.tsx
import Link from 'next/link';
import React from 'react';
import { ShoppingCart, User, Search, Menu } from 'lucide-react';

const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 bg-white shadow-md">
      <div className="container mx-auto px-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between py-3">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="text-3xl font-bold text-red-600">
              FOODBOX
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <NavLinks />
            <SearchBar />
            <IconButtons />
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-4">
            <button className="p-2">
              <Search size={22} className="text-gray-700" />
            </button>
            <button className="p-2">
              <Menu size={24} className="text-gray-700" />
            </button>
          </div>
        </div>

        {/* Mobile Search Bar (Hidden on desktop) */}
        <div className="md:hidden pb-3 px-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for products..."
              className="w-full py-2 px-4 pl-10 pr-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
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
          className="text-gray-800 font-medium hover:text-red-600 transition-colors duration-200"
        >
          {link.name}
        </Link>
      ))}
    </div>
  );
};

const SearchBar = () => {
  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search for products..."
        className="py-2 px-4 pl-10 pr-4 w-64 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
      />
      <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
    </div>
  );
};

const IconButtons = () => {
  return (
    <div className="flex items-center space-x-6">
      <button className="relative p-2 text-gray-700 hover:text-red-600 transition-colors">
        <User size={22} />
      </button>
      <button className="relative p-2 text-gray-700 hover:text-red-600 transition-colors">
        <ShoppingCart size={22} />
        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          0
        </span>
      </button>
    </div>
  );
};

export default Navbar;