'use client';

import React from 'react';
import { ShoppingBag, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function OrdersPage() {
  const orders = [];

  return (
    <div className="space-y-6">
      {/* Orders Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-[#3B82F6] to-[#111827] p-2 rounded-xl">
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">আমার অর্ডার</h1>
            <p className="text-gray-500 text-sm">আপনার সব অর্ডারের ইতিহাস</p>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <div className=" w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 p-4">
            <ShoppingBag className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">কোনো অর্ডার নেই</h3>
          <p className="text-gray-500 mb-6">আপনি এখনো কোনো অর্ডার করেননি</p>
          <button className="bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white px-6 py-2 rounded-lg font-semibold mb-4">
            প্রথম অর্ডার করুন
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Order items will go here */}
        </div>
      )}
    </div>
  );
}