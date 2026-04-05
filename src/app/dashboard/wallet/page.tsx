'use client';

import React from 'react';
import { Wallet, Plus, History, ArrowUpRight } from 'lucide-react';

export default function WalletPage() {
  const walletBalance = 0;
  const transactions = [
    // Add transaction history here
  ];

  return (
    <div className="space-y-6">
      {/* Wallet Header */}
      <div className="bg-gradient-to-br from-[#3B82F6] to-[#111827] rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-6 h-6" />
            <h2 className="text-xl font-bold">ওয়ালেট</h2>
          </div>
          <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <Plus size={16} />
            রিচার্জ করুন
          </button>
        </div>
        <div>
          <p className="text-blue-200 text-sm">বর্তমান ব্যালেন্স</p>
          <p className="text-4xl font-bold mt-1">BDT {walletBalance}</p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <History className="w-5 h-5 text-[#3B82F6]" />
            লেনদেনের ইতিহাস
          </h3>
        </div>
        
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <ArrowUpRight className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">কোনো লেনদেন নেই</p>
            <p className="text-gray-400 text-sm mt-1">আপনার ওয়ালেট রিচার্জ করুন</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Transaction items will go here */}
          </div>
        )}
      </div>
    </div>
  );
}