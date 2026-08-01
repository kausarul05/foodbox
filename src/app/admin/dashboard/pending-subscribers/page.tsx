'use client';

import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, UserPlus, Mail, Phone, MapPin, Loader2, RefreshCw, Package as PackageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { subscriptionAPI } from '@/app/admin/lib/api';

interface PendingSubscriber {
  _id: string;
  subscriptionId: string;
  userId: string;
  userName: string;
  phoneNumber: string;
  email: string;
  package: 'golden' | 'diamond';
  packageName: string;
  requestedDate: string;
  createdAt: string;
  address: string;
  zone: string;
  paymentMethod: string;
  amount: number;
  status: string;
}

export default function PendingSubscribersPage() {
  const [pendingSubscribers, setPendingSubscribers] = useState<PendingSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingSubscribers();
  }, []);

  const fetchPendingSubscribers = async () => {
    try {
      setLoading(true);
      const response = await subscriptionAPI.getPendingSubscriptions();
      console.log('Pending subscribers response:', response);
      
      if (response.success && response.data) {
        setPendingSubscribers(response.data);
      } else {
        setPendingSubscribers([]);
      }
    } catch (error) {
      console.error('Error fetching pending subscribers:', error);
      toast.error('পেন্ডিং সাবস্ক্রাইবার লোড করতে ব্যর্থ হয়েছে');
      setPendingSubscribers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      const response = await subscriptionAPI.approveSubscription(id);
      
      if (response.success) {
        toast.success('সাবস্ক্রিপশন অনুমোদন করা হয়েছে!');
        // Remove from list
        setPendingSubscribers(prev => prev.filter(sub => sub._id !== id));
      } else {
        toast.error(response.message || 'অনুমোদন করতে ব্যর্থ হয়েছে');
      }
    } catch (error: any) {
      console.error('Error approving subscription:', error);
      toast.error(error.message || 'অনুমোদন করতে ব্যর্থ হয়েছে');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('বাতিলের কারণ লিখুন:');
    if (!reason) return;
    
    try {
      setProcessingId(id);
      const response = await subscriptionAPI.rejectSubscription(id, reason);
      
      if (response.success) {
        toast.error('সাবস্ক্রিপশন বাতিল করা হয়েছে!');
        // Remove from list
        setPendingSubscribers(prev => prev.filter(sub => sub._id !== id));
      } else {
        toast.error(response.message || 'বাতিল করতে ব্যর্থ হয়েছে');
      }
    } catch (error: any) {
      console.error('Error rejecting subscription:', error);
      toast.error(error.message || 'বাতিল করতে ব্যর্থ হয়েছে');
    } finally {
      setProcessingId(null);
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch(method) {
      case 'bkash': return 'বিকাশ';
      case 'nagad': return 'নগদ';
      case 'rocket': return 'রকেট';
      case 'bank': return 'ব্যাংক';
      case 'cash': return 'ক্যাশ';
      default: return method;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#3B82F6] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">পেন্ডিং সাবস্ক্রাইবার লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">পেন্ডিং সাবস্ক্রাইবার</h1>
          <p className="text-gray-500 mt-1">অ্যাডমিন কনফার্মেশনের অপেক্ষায় থাকা সাবস্ক্রাইবার</p>
        </div>
        <button
          onClick={fetchPendingSubscribers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          রিফ্রেশ
        </button>
      </div>

      {pendingSubscribers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <p className="text-gray-500 text-lg">কোনো পেন্ডিং সাবস্ক্রাইবার নেই</p>
          <p className="text-sm text-gray-400 mt-1">সমস্ত রিকোয়েস্ট প্রসেস করা হয়েছে</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {pendingSubscribers.map((sub) => (
            <div key={sub._id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <div className={`p-4 ${sub.package === 'golden' ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-blue-500 to-purple-600'} text-white`}>
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <h3 className="font-bold text-lg">{sub.userName}</h3>
                    <p className="text-white/80 text-sm">
                      রিকোয়েস্টেড: {new Date(sub.createdAt).toLocaleDateString('bn-BD')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(sub._id)}
                      disabled={processingId === sub._id}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50"
                    >
                      {processingId === sub._id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                      অনুমোদন
                    </button>
                    <button
                      onClick={() => handleReject(sub._id)}
                      disabled={processingId === sub._id}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50"
                    >
                      {processingId === sub._id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                      বাতিল
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3">
                    <Phone size={18} className="text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">ফোন নাম্বার</p>
                      <p className="font-medium text-gray-800">{sub.phoneNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail size={18} className="text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">ইমেইল</p>
                      <p className="font-medium text-gray-800">{sub.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin size={18} className="text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">জোন</p>
                      <p className="font-medium text-gray-800">{sub.zone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <PackageIcon size={18} className="text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">প্যাকেজ</p>
                      <p className={`font-semibold ${sub.package === 'golden' ? 'text-amber-600' : 'text-purple-600'}`}>
                        {sub.package === 'golden' ? 'গোল্ডেন প্যাকেজ' : 'ডায়মন্ড প্যাকেজ'} - ৳ {sub.amount}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                      <p className="text-xs text-gray-500">পেমেন্ট মেথড</p>
                      <p className="font-medium text-gray-800 capitalize">
                        {getPaymentMethodText(sub.paymentMethod)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">সাবস্ক্রিপশন আইডি</p>
                      <p className="font-medium text-gray-800 font-mono text-sm">
                        {sub.subscriptionId}
                      </p>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">ঠিকানা</p>
                      <p className="font-medium text-gray-800 text-sm">{sub.address}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}