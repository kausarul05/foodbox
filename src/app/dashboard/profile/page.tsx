// app/dashboard/profile/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { User, MapPin, Phone, Package, AlertCircle, Loader2, Edit2, Save, X } from 'lucide-react';
import Link from 'next/link';
import { authAPI, subscriptionAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const [userData, setUserData] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phoneNumber: '',
    zone: '',
    address: '',
  });

  const zones = ['উত্তরা', 'ধানমন্ডি', 'গুলশান', 'বনানী', 'মিরপুর', 'মোহাম্মদপুর', 'পুরান ঢাকা', 'যাত্রাবাড়ী', 'নিউ মার্কেট', 'বসুন্ধরা'];

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const storedUser = localStorage.getItem('userData');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUserData(user);
        setEditForm({
          fullName: user.fullName || '',
          phoneNumber: user.phoneNumber || '',
          zone: user.zone || '',
          address: user.address || '',
        });
      }
      
      const response = await subscriptionAPI.getMySubscriptions();
      if (response.success && response.data) {
        const activeSub = response.data.find((sub: any) => sub.status === 'active');
        setSubscription(activeSub || null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('প্রোফাইল লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form to original data
    setEditForm({
      fullName: userData?.fullName || '',
      phoneNumber: userData?.phoneNumber || '',
      zone: userData?.zone || '',
      address: userData?.address || '',
    });
  };

  const handleSave = async () => {
    if (!editForm.fullName) {
      toast.error('দয়া করে আপনার নাম দিন');
      return;
    }
    if (!editForm.phoneNumber) {
      toast.error('দয়া করে ফোন নাম্বার দিন');
      return;
    }
    if (!editForm.zone) {
      toast.error('দয়া করে জোন সিলেক্ট করুন');
      return;
    }
    if (!editForm.address) {
      toast.error('দয়া করে ঠিকানা দিন');
      return;
    }

    try {
      setSaving(true);
      const response = await authAPI.updateUserProfile(editForm);
      
      if (response.success) {
        // Update local storage
        const updatedUser = { ...userData, ...editForm };
        localStorage.setItem('userData', JSON.stringify(updatedUser));
        setUserData(updatedUser);
        
        toast.success('প্রোফাইল আপডেট করা হয়েছে!');
        setIsEditing(false);
      } else {
        toast.error(response.message || 'আপডেট করতে ব্যর্থ হয়েছে');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'প্রোফাইল আপডেট করতে ব্যর্থ হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value,
    });
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
      {/* Header with Edit Button */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-[#3B82F6] to-[#111827] p-2 rounded-xl">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">প্রোফাইল</h1>
              <p className="text-gray-500 text-sm">আপনার ব্যক্তিগত তথ্য</p>
            </div>
          </div>
          
          {!isEditing && (
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-all duration-200"
            >
              <Edit2 size={16} />
              এডিট করুন
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
        {/* Personal Information */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-[#3B82F6]" />
            ব্যক্তিগত তথ্য
          </h2>
          
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-1">পূর্ণ নাম</label>
                <input
                  type="text"
                  name="fullName"
                  value={editForm.fullName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800"
                  placeholder="আপনার নাম"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">জোন</label>
                <select
                  name="zone"
                  value={editForm.zone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white text-gray-800"
                >
                  <option value="">সিলেক্ট করুন</option>
                  {zones.map((zone) => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-gray-500 text-sm">ওয়ালেট ব্যালেন্স</p>
                <p className="text-2xl font-bold text-[#3B82F6]">BDT {userData?.walletBalance || 0}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <p className="text-gray-500 text-sm">পূর্ণ নাম</p>
                <p className="text-gray-800 font-medium">{userData?.fullName || 'N/A'}</p>
              </div>
              <div className="border-b border-gray-100 pb-3">
                <p className="text-gray-500 text-sm">জোন</p>
                <p className="text-gray-800 font-medium">{userData?.zone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">ওয়ালেট ব্যালেন্স</p>
                <p className="text-2xl font-bold text-[#3B82F6]">BDT {userData?.walletBalance || 0}</p>
              </div>
            </div>
          )}
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5 text-[#3B82F6]" />
            যোগাযোগের তথ্য
          </h2>
          
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-1">ফোন নাম্বার</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={editForm.phoneNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800"
                  placeholder="+8801XXXXXXXXX"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">ঠিকানা</label>
                <textarea
                  name="address"
                  value={editForm.address}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800"
                  placeholder="বিস্তারিত ঠিকানা"
                />
              </div>
              <div>
                <p className="text-gray-500 text-sm">প্যাকেজ</p>
                <p className="text-gray-800 font-medium">
                  {subscription ? (subscription.package === 'golden' ? 'গোল্ডেন প্যাকেজ' : 'ডায়মন্ড প্যাকেজ') : 'N/A'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <p className="text-gray-500 text-sm">ফোন নাম্বার</p>
                <p className="text-gray-800 font-medium">{userData?.phoneNumber || 'N/A'}</p>
              </div>
              <div className="border-b border-gray-100 pb-3">
                <p className="text-gray-500 text-sm">ঠিকানা</p>
                <p className="text-gray-800 font-medium">{userData?.address || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">প্যাকেজ</p>
                <p className="text-gray-800 font-medium">
                  {subscription ? (subscription.package === 'golden' ? 'গোল্ডেন প্যাকেজ' : 'ডায়মন্ড প্যাকেজ') : 'N/A'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Mode Buttons */}
      {isEditing && (
        <div className="flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-all duration-200"
          >
            <X size={18} />
            বাতিল
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
          </button>
        </div>
      )}

      {/* Subscription Status */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${subscription ? 'bg-green-100' : 'bg-orange-100'}`}>
            <Package className={`w-6 h-6 ${subscription ? 'text-green-600' : 'text-orange-600'}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-800 mb-1">
              {subscription ? '✅ সক্রিয় সাবস্ক্রিপশন' : '⚠️ নো অ্যাকটিভ সাবস্ক্রিপশন'}
            </h3>
            <p className="text-gray-600 mb-4">
              {subscription 
                ? `আপনার ${subscription.package === 'golden' ? 'গোল্ডেন' : 'ডায়মন্ড'} প্যাকেজ সক্রিয় আছে। ${new Date(subscription.endDate).toLocaleDateString('bn-BD')} পর্যন্ত বৈধ।` 
                : 'সরি, আপনার কোনো সক্রিয় সাবস্ক্রিপশন নেই। খাবার অর্ডার করতে অনুগ্রহ করে সাবস্ক্রাইব করুন।'}
            </p>
            {!subscription && (
              <Link href="/subscription">
                <button className="bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center gap-2">
                  <Package size={18} />
                  সাবস্ক্রাইব করুন
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}