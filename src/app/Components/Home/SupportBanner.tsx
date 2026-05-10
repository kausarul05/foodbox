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
          animation: scroll 15s linear infinite;
          width: fit-content;
        }
        /* Pause animation on hover (optional) */
        .banner-container:hover .animate-scroll {
          animation-play-state: paused;
        }
      `}</style>
      
      <div className="banner-container overflow-hidden py-3 md:py-4">
        <div className="animate-scroll">
          <div className="flex items-center gap-6 md:gap-8 px-4">
            {/* First set */}
            <div className="flex items-center gap-2">
              <span className="text-sm md:text-base whitespace-nowrap">
                📞 আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন: 
              </span>
              <a 
                href="tel:+8801868703130" 
                className="text-sm md:text-base font-semibold underline hover:no-underline whitespace-nowrap"
              >
                ০১৮৬৮৭০৩১৩০
              </a>
            </div>
            
            {/* Duplicate set for seamless loop */}
            <div className="flex items-center gap-2">
              <span className="text-sm md:text-base whitespace-nowrap">
                📞 আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন: 
              </span>
              <a 
                href="tel:+8801868703130" 
                className="text-sm md:text-base font-semibold underline hover:no-underline whitespace-nowrap"
              >
                ০১৮৬৮৭০৩১৩০
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm md:text-base whitespace-nowrap">
                📞 আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন: 
              </span>
              <a 
                href="tel:+8801868703130" 
                className="text-sm md:text-base font-semibold underline hover:no-underline whitespace-nowrap"
              >
                ০১৮৬৮৭০৩১৩০
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm md:text-base whitespace-nowrap">
                📞 আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন: 
              </span>
              <a 
                href="tel:+8801868703130" 
                className="text-sm md:text-base font-semibold underline hover:no-underline whitespace-nowrap"
              >
                ০১৮৬৮৭০৩১৩০
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm md:text-base whitespace-nowrap">
                📞 আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন: 
              </span>
              <a 
                href="tel:+8801868703130" 
                className="text-sm md:text-base font-semibold underline hover:no-underline whitespace-nowrap"
              >
                ০১৮৬৮৭০৩১৩০
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm md:text-base whitespace-nowrap">
                📞 আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন: 
              </span>
              <a 
                href="tel:+8801868703130" 
                className="text-sm md:text-base font-semibold underline hover:no-underline whitespace-nowrap"
              >
                ০১৮৬৮৭০৩১৩০
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}