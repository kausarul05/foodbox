// components/Banner.tsx
'use client';

import Image from 'next/image';
import bannerImage from '@/../public/Images/bannar.jpg';
import { Search, ChefHat, Clock, Star, Truck } from 'lucide-react';
import { useState } from 'react';

export default function Banner() {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Searching for:', searchQuery);
    // Add your search logic here
  };

  return (
    <div className="relative w-full">
      {/* Background Image */}
      <div className="relative h-[350px] md:h-[500px] lg:h-[600px] w-full overflow-hidden">
        <Image
          src={bannerImage}
          alt='Homemade food delivery banner'
          fill
          priority
          className="object-cover"
          sizes="100vw"
          quality={90}
        />
        
        {/* Dark Overlay for better text visibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
      </div>

      {/* Content Overlay */}
      <div className="absolute inset-0 flex items-center">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="max-w-2xl">
            {/* Heading */}
            <h1 className="text-white text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4 md:mb-6">
              Homemade Food
              <span className="block text-red-400 mt-2">Delivered Fresh</span>
            </h1>

            {/* Subtitle */}
            <p className="text-gray-200 text-base md:text-lg mb-6 md:mb-8 max-w-xl">
              Authentic homemade meals cooked with love. 
              Fresh ingredients, traditional recipes, delivered hot to your home.
            </p>

            {/* Search Bar Container */}
            <div className="bg-white rounded-xl p-1 md:p-2 shadow-2xl w-full max-w-4xl">
              <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
                {/* Area Selection */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <select 
                      className="w-full py-3 md:py-4 pl-12 pr-4 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-800 appearance-none bg-white"
                      defaultValue=""
                    >
                      <option value="" disabled>Select your area</option>
                      <option value="gulshan">Gulshan</option>
                      <option value="banani">Banani</option>
                      <option value="dhanmondi">Dhanmondi</option>
                      <option value="uttara">Uttara</option>
                      <option value="mirpur">Mirpur</option>
                    </select>
                    <ChefHat className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  </div>
                </div>

                {/* Food Search Input */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search homemade dishes..."
                      className="w-full py-3 md:py-4 pl-12 pr-4 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-800"
                    />
                  </div>
                </div>

                {/* Search Button */}
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 md:py-4 px-6 md:px-8 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2"
                >
                  <Search size={20} />
                  <span className="hidden md:inline">Find Food</span>
                  <span className="md:hidden">Search</span>
                </button>
              </form>
            </div>

            {/* Quick Dish Categories */}
            <div className="mt-6 md:mt-8 flex flex-wrap gap-2 md:gap-3">
              {['Biriyani', 'Curry', 'Khichuri', 'Fish Fry', 'Beef', 'Chicken', 'Vegetables', 'Dessert'].map((dish) => (
                <button
                  key={dish}
                  className="bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 px-4 py-2 rounded-full text-sm md:text-base transition-colors duration-300 border border-white/20"
                >
                  {dish}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent pt-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 pb-6">
            <FeatureItem 
              icon={<ChefHat className="text-red-400" size={24} />}
              title="Home Cooks"
              subtitle="100+ Verified"
            />
            <FeatureItem 
              icon={<Clock className="text-green-400" size={24} />}
              title="Fresh Daily"
              subtitle="Cooked to Order"
            />
            <FeatureItem 
              icon={<Star className="text-yellow-400" size={24} />}
              title="4.8 Rating"
              subtitle="Customer Reviews"
            />
            <FeatureItem 
              icon={<Truck className="text-blue-400" size={24} />}
              title="Fast Delivery"
              subtitle="45 Min Average"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const FeatureItem = ({ 
  icon, 
  title, 
  subtitle 
}: { 
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) => {
  return (
    <div className="flex flex-col items-center md:items-start text-center md:text-left">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
          {icon}
        </div>
        <div>
          <p className="text-white text-lg md:text-xl font-bold">{title}</p>
          <p className="text-gray-300 text-sm">{subtitle}</p>
        </div>
      </div>
    </div>
  );
};