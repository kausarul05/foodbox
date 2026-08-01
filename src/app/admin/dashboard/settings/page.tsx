'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Bell, Shield, Globe, Mail, Save, Loader2, RefreshCw, Key, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsAPI, authAPI } from '@/app/admin/lib/api';

interface SettingsType {
  siteName: string;
  adminEmail: string;
  phoneNumber: string;
  deliveryCharge: number;
  minOrderAmount: number;
  maxOrderAmount: number;
  notificationEmail: boolean;
  notificationSMS: boolean;
  notificationPush: boolean;
  autoConfirmOrder: boolean;
  workingDays: string[];
  deliveryTimeSlots: string[];
  zones: string[];
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [settings, setSettings] = useState<SettingsType>({
    siteName: 'FoodBox',
    adminEmail: 'admin@foodbox.com',
    phoneNumber: '+8801913945595',
    deliveryCharge: 50,
    minOrderAmount: 300,
    maxOrderAmount: 10000,
    notificationEmail: true,
    notificationSMS: true,
    notificationPush: false,
    autoConfirmOrder: false,
    workingDays: [],
    deliveryTimeSlots: [],
    zones: [],
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsAPI.getSettings();
      console.log('Settings response:', response);
      
      if (response.success && response.data) {
        setSettings(response.data);
        toast.success('সেটিংস লোড হয়েছে');
      } else {
        toast.error('সেটিংস লোড করতে ব্যর্থ হয়েছে');
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast.error(error.message || 'সেটিংস লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await settingsAPI.updateSettings(settings);
      
      if (response.success) {
        toast.success('সেটিংস সেভ হয়েছে!');
        // Refresh settings to confirm save
        await fetchSettings();
      } else {
        toast.error(response.message || 'সেভ করতে ব্যর্থ হয়েছে');
      }
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error.message || 'সেটিংস সেভ করতে ব্যর্থ হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('সব ফিল্ড পূরণ করুন');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('নতুন পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }

    try {
      setChangingPassword(true);
      // Add this endpoint in your backend
      const response = await authAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      
      if (response.success) {
        toast.success('পাসওয়ার্ড পরিবর্তন করা হয়েছে!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        toast.error(response.message || 'পাসওয়ার্ড পরিবর্তন করতে ব্যর্থ হয়েছে');
      }
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'পাসওয়ার্ড পরিবর্তন করতে ব্যর্থ হয়েছে');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleBackup = async () => {
    try {
      const loadingToast = toast.loading('ব্যাকআপ নেওয়া হচ্ছে...');
      const response = await settingsAPI.backupDatabase();
      toast.dismiss(loadingToast);
      
      if (response.success) {
        toast.success('ডাটাবেজ ব্যাকআপ নেওয়া হয়েছে!');
      } else {
        toast.error(response.message || 'ব্যাকআপ নিতে ব্যর্থ হয়েছে');
      }
    } catch (error: any) {
      console.error('Error taking backup:', error);
      toast.error(error.message || 'ব্যাকআপ নিতে ব্যর্থ হয়েছে');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#3B82F6] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">সেটিংস লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">সেটিংস</h1>
          <p className="text-gray-500 mt-1">অ্যাডমিন প্যানেলের সেটিংস কনফিগার করুন</p>
        </div>
        <button
          onClick={fetchSettings}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          রিফ্রেশ
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* General Settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Globe size={24} className="text-[#3B82F6]" />
              <h2 className="text-xl font-bold text-gray-800">জেনারেল সেটিংস</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-1">সাইটের নাম</label>
                <input
                  type="text"
                  value={settings.siteName}
                  onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">অ্যাডমিন ইমেইল</label>
                <input
                  type="email"
                  value={settings.adminEmail}
                  onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">ফোন নাম্বার</label>
                <input
                  type="text"
                  value={settings.phoneNumber}
                  onChange={(e) => setSettings({ ...settings, phoneNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">ডেলিভারি চার্জ (৳)</label>
                  <input
                    type="number"
                    value={settings.deliveryCharge}
                    onChange={(e) => setSettings({ ...settings, deliveryCharge: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">ন্যূনতম অর্ডার (৳)</label>
                  <input
                    type="number"
                    value={settings.minOrderAmount}
                    onChange={(e) => setSettings({ ...settings, minOrderAmount: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Bell size={24} className="text-[#3B82F6]" />
              <h2 className="text-xl font-bold text-gray-800">নোটিফিকেশন সেটিংস</h2>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-gray-700">ইমেইল নোটিফিকেশন</span>
                <input
                  type="checkbox"
                  checked={settings.notificationEmail}
                  onChange={(e) => setSettings({ ...settings, notificationEmail: e.target.checked })}
                  className="w-5 h-5 text-[#3B82F6] rounded focus:ring-[#3B82F6]"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-gray-700">এসএমএস নোটিফিকেশন</span>
                <input
                  type="checkbox"
                  checked={settings.notificationSMS}
                  onChange={(e) => setSettings({ ...settings, notificationSMS: e.target.checked })}
                  className="w-5 h-5 text-[#3B82F6] rounded focus:ring-[#3B82F6]"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-gray-700">পুশ নোটিফিকেশন</span>
                <input
                  type="checkbox"
                  checked={settings.notificationPush}
                  onChange={(e) => setSettings({ ...settings, notificationPush: e.target.checked })}
                  className="w-5 h-5 text-[#3B82F6] rounded focus:ring-[#3B82F6]"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-gray-700">অটো কনফার্ম অর্ডার</span>
                <input
                  type="checkbox"
                  checked={settings.autoConfirmOrder}
                  onChange={(e) => setSettings({ ...settings, autoConfirmOrder: e.target.checked })}
                  className="w-5 h-5 text-[#3B82F6] rounded focus:ring-[#3B82F6]"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield size={24} className="text-[#3B82F6]" />
              <h2 className="text-xl font-bold text-gray-800">সিকিউরিটি</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-1">বর্তমান পাসওয়ার্ড</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="বর্তমান পাসওয়ার্ড"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">নতুন পাসওয়ার্ড</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="নতুন পাসওয়ার্ড"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">কনফার্ম পাসওয়ার্ড</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="কনফার্ম পাসওয়ার্ড"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800"
                />
              </div>
              <button
                onClick={handlePasswordChange}
                disabled={changingPassword}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {changingPassword ? <Loader2 size={18} className="animate-spin" /> : <Key size={18} />}
                পাসওয়ার্ড পরিবর্তন করুন
              </button>
            </div>
          </div>

          {/* <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Database size={24} className="text-[#3B82F6]" />
              <h2 className="text-xl font-bold text-gray-800">ব্যাকআপ</h2>
            </div>
            <button
              onClick={handleBackup}
              className="w-full bg-gradient-to-br from-[#3B82F6] to-[#111827] hover:shadow-lg text-white py-2 rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <Database size={18} />
              ডাটাবেজ ব্যাকআপ নিন
            </button>
          </div> */}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          সেটিংস সেভ করুন
        </button>
      </div>
    </div>
  );
}