'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw, CheckCircle, XCircle, Eye, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { transactionAPI } from '../../lib/api';

interface Transaction {
  _id: string;
  userName: string;
  amount: number;
  transactionId: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

export default function PendingTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await transactionAPI.getPendingTransactions();
      if (response.success) {
        setTransactions(response.data);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('ট্রানজেকশন লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      const response = await transactionAPI.approveTransaction(id);
      if (response.success) {
        toast.success('ট্রানজেকшন অনুমোদন করা হয়েছে');
        await fetchTransactions();
      } else {
        toast.error(response.message || 'অনুমোদন ব্যর্থ হয়েছে');
      }
    } catch (error) {
      toast.error('অনুমোদন ব্যর্থ হয়েছে');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('বাতিলের কারণ লিখুন:');
    if (!reason) return;
    
    try {
      setProcessingId(id);
      const response = await transactionAPI.rejectTransaction(id, reason);
      if (response.success) {
        toast.error('ট্রানজেকশন বাতিল করা হয়েছে');
        await fetchTransactions();
      } else {
        toast.error(response.message || 'বাতিল ব্যর্থ হয়েছে');
      }
    } catch (error) {
      toast.error('বাতিল ব্যর্থ হয়েছে');
    } finally {
      setProcessingId(null);
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">পেন্ডিং ট্রানজেকশন</h1>
          <p className="text-gray-500">ওয়ালেট রিচার্জ রিকোয়েস্ট</p>
        </div>
        <button
          onClick={fetchTransactions}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          <RefreshCw size={18} />
          রিফ্রেশ
        </button>
      </div>

      {transactions.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">কোনো পেন্ডিং ট্রানজেকশন নেই</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {transactions.map((tx) => (
            <div key={tx._id} className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-800">{tx.userName}</p>
                  <p className="text-2xl font-bold text-[#3B82F6]">৳ {tx.amount}</p>
                  <p className="text-sm text-gray-500 mt-1">ট্রানজেকশন আইডি: {tx.transactionId}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(tx.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(tx._id)}
                    disabled={processingId === tx._id}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    {processingId === tx._id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    অনুমোদন
                  </button>
                  <button
                    onClick={() => handleReject(tx._id)}
                    disabled={processingId === tx._id}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <XCircle size={16} />
                    বাতিল
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}