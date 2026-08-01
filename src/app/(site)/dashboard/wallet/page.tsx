'use client';

import React, { useState, useEffect } from 'react';
import { Wallet, Plus, History, ArrowUpRight, Loader2, Copy, Check, X, Clock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { walletAPI, transactionAPI } from '@/lib/api';

interface Transaction {
  _id: string;
  amount: number;
  transactionId: string;
  paymentMethod: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export default function WalletPage() {
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const bKashNumber = '01792695939'; // Admin bKash number

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const [walletResponse, transactionsResponse] = await Promise.all([
        walletAPI.getBalance(),
        transactionAPI.getMyTransactions()
      ]);

      if (walletResponse.success) {
        setWalletBalance(walletResponse.data.balance);
      }
      if (transactionsResponse.success) {
        setTransactions(transactionsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      toast.error('ওয়ালেট ডাটা লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async () => {
    const amount = parseInt(rechargeAmount);
    if (!amount || amount < 50) {
      toast.error('দয়া করে সঠিক পরিমাণ টাকা দিন (ন্যূনতম ৫০ টাকা)');
      return;
    }
    if (!transactionId || transactionId.length < 6) {
      toast.error('দয়া করে সঠিক ট্রানজেকশন আইডি দিন');
      return;
    }

    try {
      setSubmitting(true);
      const response = await transactionAPI.createRechargeRequest({
        amount,
        transactionId,
        paymentMethod: 'bkash'
      });

      if (response.success) {
        toast.success('রিচার্জ রিকোয়েস্ট সফল! অ্যাডমিন অনুমোদনের অপেক্ষায়');
        setShowRechargeModal(false);
        setRechargeAmount('');
        setTransactionId('');
        await fetchWalletData();
      } else {
        toast.error(response.message || 'রিচার্জ রিকোয়েস্ট ব্যর্থ হয়েছে');
      }
    } catch (error: any) {
      console.error('Recharge error:', error);
      toast.error(error.message || 'রিচার্জ রিকোয়েস্ট ব্যর্থ হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  const copyBkashNumber = () => {
    navigator.clipboard.writeText(bKashNumber);
    setCopied(true);
    toast.success('নাম্বার কপি হয়েছে');
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'পেন্ডিং' };
      case 'approved':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'অনুমোদিত' };
      case 'rejected':
        return { color: 'bg-red-100 text-red-800', icon: X, text: 'বাতিল' };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: Clock, text: status };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-12 h-12 text-[#3B82F6] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Wallet Header */}
      <div className="bg-gradient-to-br from-[#3B82F6] to-[#111827] rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-6 h-6" />
            <h2 className="text-xl font-bold">ওয়ালেট</h2>
          </div>
          <button
            onClick={() => setShowRechargeModal(true)}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            রিচার্জ করুন
          </button>
        </div>
        <div>
          <p className="text-blue-200 text-sm">বর্তমান ব্যালেন্স</p>
          <p className="text-4xl font-bold mt-1">BDT {walletBalance.toLocaleString()}</p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
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
            {transactions.map((tx) => {
              const StatusIcon = getStatusBadge(tx.status).icon;
              return (
                <div key={tx._id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-800">৳ {tx.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleDateString('bn-BD')}</p>
                  </div>
                  <div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(tx.status).color}`}>
                      <StatusIcon size={12} />
                      {getStatusBadge(tx.status).text}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">ট্রানজেকশন আইডি</p>
                    <p className="text-xs font-mono text-gray-600">{tx.transactionId}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recharge Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">ওয়ালেট রিচার্জ</h3>
              <button
                onClick={() => setShowRechargeModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* bKash Info */}
              <div className="bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl p-4">
                <p className="text-white text-sm mb-2">বিকাশ নম্বর (সেন্ড মানি)</p>
                <div className="flex items-center justify-between">
                  <p className="text-white text-2xl font-bold">{bKashNumber}</p>
                  <button
                    onClick={copyBkashNumber}
                    className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition"
                  >
                    {copied ? <Check size={20} className="text-white" /> : <Copy size={20} className="text-white" />}
                  </button>
                </div>
                <p className="text-white/80 text-xs mt-2">এই নম্বরে সেন্ড মানি করুন</p>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">টাকার পরিমাণ (৳)</label>
                <input
                  type="number"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  placeholder="ন্যূনতম ৫০ টাকা"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800"
                  min="50"
                  step="10"
                />
              </div>

              {/* Transaction ID Input */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">ট্রানজেকশন আইডি</label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="উদাহরণ: 8Y7X9K2L5M"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800"
                />
                <p className="text-xs text-gray-500 mt-1">বিকাশ অ্যাপ থেকে ট্রানজেকশন আইডি কপি করে দিন</p>
              </div>

              {/* Info Note */}
              <div className="bg-yellow-50 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  ⚠️ সঠিক ট্রানজেকশন আইডি প্রদান করুন। অ্যাডমিন অনুমোদনের পর আপনার ওয়ালেটে টাকা যোগ হবে।
                </p>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleRecharge}
                disabled={submitting}
                className="w-full bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                {submitting ? 'প্রসেসিং...' : 'রিচার্জ রিকোয়েস্ট সাবমিট করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}