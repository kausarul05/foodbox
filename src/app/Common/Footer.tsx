'use client'

import React from 'react'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12 md:px-6 lg:px-8">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
          
          {/* Brand Section */}
          <div className="text-start sm:text-left">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">FCS</h2>
            <p className="text-gray-400 text-sm md:text-base leading-relaxed">
              আপনার পছন্দের খাবার এখন হাতের নাগালে। সুস্বাদু, সাশ্রয়ী এবং সময়মত ডেলিভারি।
            </p>
          </div>

          {/* Quick Links */}
          <div className="text-start sm:text-left">
            <h3 className="text-lg md:text-xl font-semibold mb-4 text-white">Quick Links</h3>
            <ul className="space-y-2 md:space-y-3">
              <li>
                <Link href="/" className="text-gray-400 hover:text-orange-500 transition-colors duration-200 text-sm md:text-base inline-block">
                  হোম
                </Link>
              </li>
              <li>
                <Link href="/order" className="text-gray-400 hover:text-orange-500 transition-colors duration-200 text-sm md:text-base inline-block">
                  অর্ডার
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-400 hover:text-orange-500 transition-colors duration-200 text-sm md:text-base inline-block">
                  আমাদের সম্পর্কে
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-orange-500 transition-colors duration-200 text-sm md:text-base inline-block">
                  প্রাইভেসি পলিসি
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-orange-500 transition-colors duration-200 text-sm md:text-base inline-block">
                  টার্মস এন্ড কন্ডিশনস
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="text-start sm:text-left">
            <h3 className="text-lg md:text-xl font-semibold mb-4 text-white">Contact</h3>
            <ul className="space-y-3 md:space-y-4">
              <li className="flex items-center justify-start sm:justify-start gap-3 text-gray-400 text-sm md:text-base">
                <span className="text-orange-500 text-lg">📞</span>
                <a href="tel:+8801913945595" className="hover:text-orange-500 transition-colors">
                  +8801913945595
                </a>
              </li>
              <li className="flex items-center justify-start sm:justify-start gap-3 text-gray-400 text-sm md:text-base break-all">
                <span className="text-orange-500 text-lg">✉️</span>
                <a href="mailto:foodbox947@gmail.com" className="hover:text-orange-500 transition-colors">
                  foodbox947@gmail.com
                </a>
              </li>
              <li className="flex items-center justify-center sm:justify-start gap-3 text-gray-400 text-sm md:text-base">
                <span className="text-orange-500 text-lg">📍</span>
                <span>Mile Quarter, Academic Road, Mymensingh Sadar.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 pt-6 border-t border-gray-800 text-start">
          <p className="text-gray-500 text-xs md:text-sm">
            &copy; {new Date().getFullYear()} FoodBox. সর্বস্বত্ব সংরক্ষিত।
          </p>
          <p className="text-gray-600 text-xs mt-1">
            ডিজাইন ও ডেভেলপড by FoodBox টিম
          </p>
        </div>
      </div>
    </footer>
  )
}