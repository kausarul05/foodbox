'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Loader2, RefreshCw, X, AlertCircle } from 'lucide-react';
import { blockedDateAPI } from '../../lib/api';
import toast from 'react-hot-toast';

interface BlockedDate {
  _id: string;
  date: string;
  reason: string;
}

export default function BlockedDatesPage() {
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBlockedDates();
  }, []);

  const fetchBlockedDates = async () => {
    try {
      setLoading(true);
      const response = await blockedDateAPI.getAllBlockedDates();
      if (response.success) {
        setBlockedDates(response.data);
      }
    } catch (error) {
      console.error('Error fetching blocked dates:', error);
      toast.error('ব্লক করা তারিখ লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlockedDate = async () => {
    if (!selectedDate) {
      toast.error('তারিখ নির্বাচন করুন');
      return;
    }

    try {
      setSubmitting(true);
      const response = await blockedDateAPI.addBlockedDate(selectedDate, reason);
      if (response.success) {
        toast.success('তারিখ ব্লক করা হয়েছে');
        setShowModal(false);
        setSelectedDate('');
        setReason('');
        await fetchBlockedDates();
      }
    } catch (error: any) {
      toast.error(error.message || 'তারিখ ব্লক করতে ব্যর্থ হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveBlockedDate = async (id: string, date: string) => {
    if (confirm(`"${new Date(date).toLocaleDateString('bn-BD')}" এই তারিখটি আনব্লক করতে চান?`)) {
      try {
        const response = await blockedDateAPI.removeBlockedDate(id);
        if (response.success) {
          toast.success('তারিখ আনব্লক করা হয়েছে');
          await fetchBlockedDates();
        }
      } catch (error) {
        toast.error('তারিখ আনব্লক করতে ব্যর্থ হয়েছে');
      }
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
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ব্লক করা তারিখ</h1>
          <p className="text-gray-500 mt-1">যেসব দিন মিল বন্ধ থাকবে তা নির্ধারণ করুন</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchBlockedDates}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            <RefreshCw size={18} />
            রিফ্রেশ
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white rounded-lg"
          >
            <Plus size={18} />
            তারিখ ব্লক করুন
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800 font-medium">মিল বন্ধের দিন সম্পর্কে</p>
            <p className="text-xs text-blue-700 mt-1">
              • প্রতি মাসের ২য় ও লাস্ট শুক্রবার স্বয়ংক্রিয়ভাবে মিল বন্ধ থাকে<br />
              • এছাড়াও আপনি বিশেষ কোনো দিন ম্যানুয়ালি ব্লক করতে পারেন<br />
              • ব্লক করা দিনে ইউজাররা অর্ডার করতে পারবেন না
            </p>
          </div>
        </div>
      </div>

      {/* Blocked Dates List */}
      {blockedDates.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">কোনো তারিখ ব্লক করা নেই</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {blockedDates.map((item) => (
            <div key={item._id} className="bg-white rounded-2xl shadow-lg p-4 hover:shadow-xl transition">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-red-500" />
                    <span className="font-semibold text-gray-800">
                      {new Date(item.date).toLocaleDateString('bn-BD')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{item.reason}</p>
                </div>
                <button
                  onClick={() => handleRemoveBlockedDate(item._id, item.date)}
                  className="p-1 text-red-500 hover:text-red-700"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Blocked Date Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">তারিখ ব্লক করুন</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-1">তারিখ নির্বাচন করুন</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">কারণ (ঐচ্ছিক)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                  placeholder="যেমন: বিশেষ ছুটির কারণে মিল বন্ধ থাকবে"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ডিফল্ট মেসেজ: "অনিবার্য কারনবশত আজ মিল বন্ধ থাকবে, আগামীকাল থেকে স্বাভাবিক ভাবে মেন্যু অনুযায়ী অর্ডার সরবরাহ করা হবে।"
                </p>
              </div>
              <button
                onClick={handleAddBlockedDate}
                disabled={submitting}
                className="w-full bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white py-2 rounded-lg font-semibold"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'তারিখ ব্লক করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}