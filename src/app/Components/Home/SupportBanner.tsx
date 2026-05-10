'use client';

import React from 'react';

export default function SupportBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white overflow-hidden shadow-lg">
      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll {
          animation: scroll 18s linear infinite;
          width: fit-content;
        }
        .banner-container:hover .animate-scroll {
          animation-play-state: paused;
        }
        
        @media (max-width: 640px) {
          .animate-scroll {
            animation-duration: 12s;
          }
        }
      `}</style>
      
      <div className="banner-container overflow-hidden py-2.5 md:py-3">
        <div className="animate-scroll">
          <div className="flex items-center gap-4 md:gap-6 px-3 md:px-4">
            {/* First set */}
            <div className="flex items-center">
              <span className="text-xs sm:text-sm md:text-base whitespace-nowrap">
                📞 ওয়েবসাইটে অর্ডার/পেমেন্ট সংক্রান্ত যেকোন সমস্যা হলে সরাসরি 
                <a 
                  href="tel:+8801792695939" 
                  className="font-bold underline hover:no-underline mx-1"
                >
                  ০১৭৯২৬৯৫৯৩৯
                </a>
                এই নাম্বারে যোগাযোগ করুন।
              </span>
            </div>
            
            {/* Duplicate set for seamless loop */}
            <div className="flex items-center">
              <span className="text-xs sm:text-sm md:text-base whitespace-nowrap">
                📞 ওয়েবসাইটে অর্ডার/পেমেন্ট সংক্রান্ত যেকোন সমস্যা হলে সরাসরি 
                <a 
                  href="tel:+8801792695939" 
                  className="font-bold underline hover:no-underline mx-1"
                >
                  ০১৭৯২৬৯৫৯৩৯
                </a>
                এই নাম্বারে যোগাযোগ করুন।
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-xs sm:text-sm md:text-base whitespace-nowrap">
                📞 ওয়েবসাইটে অর্ডার/পেমেন্ট সংক্রান্ত যেকোন সমস্যা হলে সরাসরি 
                <a 
                  href="tel:+8801792695939" 
                  className="font-bold underline hover:no-underline mx-1"
                >
                  ০১৭৯২৬৯৫৯৩৯
                </a>
                এই নাম্বারে যোগাযোগ করুন।
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}