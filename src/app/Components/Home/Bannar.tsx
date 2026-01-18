// components/Banner.tsx
'use client';

import Image from 'next/image';
import bannerImage from '@/../public/Images/bannar.jpg';
import { Search, MapPin } from 'lucide-react';
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
      <div className="relative h-[300px] md:h-[500px] lg:h-[800px] w-full overflow-hidden">
        <Image
          src={bannerImage}
          alt='Banner Image'
          fill
          priority
          className="object-fill"
          sizes="100vw"
          quality={90}
        />
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
      </div>

      {/* Content Overlay */}
      <div className="absolute inset-0 flex items-center">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="max-w-2xl">
            {/* Heading */}
            <h1 className="text-white text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4 md:mb-6">
              Delicious Food Delivered
              <span className="block text-red-400 mt-2">To Your Doorstep</span>
            </h1>

            {/* Subtitle */}
            <p className="text-gray-200 text-base md:text-lg mb-6 md:mb-8 max-w-xl">
              Order your favorite meals from the best restaurants in town. 
              Fast delivery, fresh food, and great prices.
            </p>

            {/* Search Bar Container */}
            <div className="bg-white rounded-xl p-1 md:p-2 shadow-2xl w-full max-w-4xl">
              <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
                {/* Location Input */}
                <div className="flex-1">
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Enter your delivery address"
                      className="w-full py-3 md:py-4 pl-12 pr-4 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-800"
                    />
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
                      placeholder="Search for food, restaurants, or cuisines"
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
                  <span className="hidden md:inline">Search</span>
                </button>
              </form>
            </div>

            {/* Quick Categories */}
            <div className="mt-6 md:mt-8 flex flex-wrap gap-2 md:gap-3">
              {['Pizza', 'Burger', 'Sushi', 'Pasta', 'Salad', 'Dessert', 'Chinese', 'Indian'].map((category) => (
                <button
                  key={category}
                  className="bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 px-4 py-2 rounded-full text-sm md:text-base transition-colors duration-300 border border-white/20"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center md:justify-between py-4">
            <div className="text-center md:text-left mb-4 md:mb-0 px-4">
              <p className="text-white text-2xl md:text-3xl font-bold">500+</p>
              <p className="text-gray-300 text-sm md:text-base">Restaurants</p>
            </div>
            <div className="text-center md:text-left mb-4 md:mb-0 px-4">
              <p className="text-white text-2xl md:text-3xl font-bold">10,000+</p>
              <p className="text-gray-300 text-sm md:text-base">Food Items</p>
            </div>
            <div className="text-center md:text-left mb-4 md:mb-0 px-4">
              <p className="text-white text-2xl md:text-3xl font-bold">30 min</p>
              <p className="text-gray-300 text-sm md:text-base">Average Delivery</p>
            </div>
            <div className="text-center md:text-left px-4">
              <p className="text-white text-2xl md:text-3xl font-bold">4.8 ★</p>
              <p className="text-gray-300 text-sm md:text-base">Customer Rating</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}