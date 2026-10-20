'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Bell, Shield, Globe, Mail, Save, Loader2, RefreshCw, Key, Database, Download, Sheet, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsAPI, authAPI } from '@/app/admin/lib/api';
import CustomerPasswordReset from '@/app/admin/components/admin/CustomerPasswordReset';

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
  const [backingUp, setBackingUp] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [sheet, setSheet] = useState<{ configured: boolean; url: string | null } | null>(null);
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
    // The mirror is configured by environment variables, so the panel has to
    // ask the server whether it is on rather than storing a flag.
    settingsAPI
      .sheetsStatus()
      .then((response) => setSheet(response.data))
      .catch(() => setSheet({ configured: false, url: null }));
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

  const handleExcelBackup = async () => {
    setBackingUp(true);
    const loadingToast = toast.loading('ব্যাকআপ ফাইল তৈরি হচ্ছে...');
    try {
      const { fileName } = await settingsAPI.downloadExcelBackup();
      toast.dismiss(loadingToast);
      toast.success(`ডাউনলোড হয়েছে — ${fileName}`);
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Error taking backup:', error);
      toast.error(error instanceof Error ? error.message : 'ব্যাকআপ নিতে ব্যর্থ হয়েছে');
    } finally {
      setBackingUp(false);
    }
  };

  const handleSheetSync = async () => {
    setSyncing(true);
    const loadingToast = toast.loading('গুগল শীট আপডেট হচ্ছে...');
    try {
      const response = await settingsAPI.syncSheets();
      toast.dismiss(loadingToast);
      toast.success(`শীটে ${response.data.rows} সারি লেখা হয়েছে`);
      if (response.data.url) setSheet({ configured: true, url: response.data.url });
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Error syncing sheet:', error);
      toast.error(error instanceof Error ? error.message : 'শীট আপডেট করা যায়নি');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand-600 animate-spin mx-auto mb-4" />
          <p className="text-ink-600">সেটিংস লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">সেটিংস</h1>
          <p className="text-ink-500 mt-1">অ্যাডমিন প্যানেলের সেটিংস কনফিগার করুন</p>
        </div>
        <button
          onClick={fetchSettings}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-lg transition"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          রিফ্রেশ
        </button>
      </div>

      <CustomerPasswordReset />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* General Settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-ink-200 shadow-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Globe size={24} className="text-brand-600" />
              <h2 className="text-xl font-bold text-ink-900">জেনারেল সেটিংস</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-ink-700 font-medium mb-1">সাইটের নাম</label>
                <input
                  type="text"
                  value={settings.siteName}
                  onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  className="w-full px-4 py-2.5 border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-ink-900 text-base sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-ink-700 font-medium mb-1">অ্যাডমিন ইমেইল</label>
                <input
                  type="email"
                  value={settings.adminEmail}
                  onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
                  className="w-full px-4 py-2.5 border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-ink-900 text-base sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-ink-700 font-medium mb-1">ফোন নাম্বার</label>
                <input
                  type="text"
                  value={settings.phoneNumber}
                  onChange={(e) => setSettings({ ...settings, phoneNumber: e.target.value })}
                  className="w-full px-4 py-2.5 border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-ink-900 text-base sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-ink-700 font-medium mb-1">ডেলিভারি চার্জ (৳)</label>
                  <input
                    type="number"
                    value={settings.deliveryCharge}
                    onChange={(e) => setSettings({ ...settings, deliveryCharge: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-ink-900 text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-ink-700 font-medium mb-1">ন্যূনতম অর্ডার (৳)</label>
                  <input
                    type="number"
                    value={settings.minOrderAmount}
                    onChange={(e) => setSettings({ ...settings, minOrderAmount: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-ink-900 text-base sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-2xl border border-ink-200 shadow-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Bell size={24} className="text-brand-600" />
              <h2 className="text-xl font-bold text-ink-900">নোটিফিকেশন সেটিংস</h2>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-ink-700">ইমেইল নোটিফিকেশন</span>
                <input
                  type="checkbox"
                  checked={settings.notificationEmail}
                  onChange={(e) => setSettings({ ...settings, notificationEmail: e.target.checked })}
                  className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-ink-700">এসএমএস নোটিফিকেশন</span>
                <input
                  type="checkbox"
                  checked={settings.notificationSMS}
                  onChange={(e) => setSettings({ ...settings, notificationSMS: e.target.checked })}
                  className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-ink-700">পুশ নোটিফিকেশন</span>
                <input
                  type="checkbox"
                  checked={settings.notificationPush}
                  onChange={(e) => setSettings({ ...settings, notificationPush: e.target.checked })}
                  className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-ink-700">অটো কনফার্ম অর্ডার</span>
                <input
                  type="checkbox"
                  checked={settings.autoConfirmOrder}
                  onChange={(e) => setSettings({ ...settings, autoConfirmOrder: e.target.checked })}
                  className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-ink-200 shadow-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield size={24} className="text-brand-600" />
              <h2 className="text-xl font-bold text-ink-900">সিকিউরিটি</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-ink-700 font-medium mb-1">বর্তমান পাসওয়ার্ড</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="বর্তমান পাসওয়ার্ড"
                  className="w-full px-4 py-2.5 border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-ink-900 text-base sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-ink-700 font-medium mb-1">নতুন পাসওয়ার্ড</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="নতুন পাসওয়ার্ড"
                  className="w-full px-4 py-2.5 border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-ink-900 text-base sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-ink-700 font-medium mb-1">কনফার্ম পাসওয়ার্ড</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="কনফার্ম পাসওয়ার্ড"
                  className="w-full px-4 py-2.5 border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-ink-900 text-base sm:text-sm"
                />
              </div>
              <button
                onClick={handlePasswordChange}
                disabled={changingPassword}
                className="w-full bg-ink-100 hover:bg-ink-200 text-ink-900 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {changingPassword ? <Loader2 size={18} className="animate-spin" /> : <Key size={18} />}
                পাসওয়ার্ড পরিবর্তন করুন
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-ink-200 shadow-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <Database size={24} className="text-brand-600" />
              <h2 className="text-xl font-bold text-ink-900">ডাটাবেস ব্যাকআপ</h2>
            </div>
            <p className="text-sm text-ink-500 mb-4">
              কাস্টমার, অর্ডার, সাবস্ক্রিপশন, ওয়ালেট, রিচার্জ, ডিপোজিট, খরচ, মেনু, জোন — সবকিছু
              একটি এক্সেল ফাইলে, প্রতিটি আলাদা শীটে। ডাটাবেসে সমস্যা হলেও তথ্য এই ফাইলে থাকবে।
            </p>
            <button
              onClick={handleExcelBackup}
              disabled={backingUp}
              className="w-full bg-brand-600 hover:shadow-lg text-white py-2.5 rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {backingUp ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              {backingUp ? 'ফাইল তৈরি হচ্ছে...' : 'এক্সেল ব্যাকআপ ডাউনলোড করুন'}
            </button>
            <p className="text-xs text-ink-400 mt-3">
              নিরাপত্তার জন্য পাসওয়ার্ড ফাইলে রাখা হয় না। ফাইলে কাস্টমারের ফোন ও ঠিকানা আছে —
              নিরাপদ জায়গায় রাখুন।
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-ink-200 shadow-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <Sheet size={24} className="text-leaf-600" />
              <h2 className="text-xl font-bold text-ink-900">গুগল শীট (লাইভ)</h2>
              {sheet && (
                <span
                  className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${
                    sheet.configured ? 'bg-leaf-100 text-leaf-700' : 'bg-ink-100 text-ink-500'
                  }`}
                >
                  {sheet.configured ? 'চালু' : 'বন্ধ'}
                </span>
              )}
            </div>

            {sheet?.configured ? (
              <>
                <p className="text-sm text-ink-500 mb-4">
                  ডাটাবেসে নতুন অর্ডার, কাস্টমার বা রিচার্জ ঢুকলে কয়েক সেকেন্ডের মধ্যেই শীটে চলে
                  যায় — কিছু করতে হয় না। নিচের বাটন শুধু তখন দরকার, যখন ডাটাবেসে বাইরে থেকে কিছু
                  বদলানো হয়েছে।
                </p>
                {sheet.url && (
                  <a
                    href={sheet.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline mb-4"
                  >
                    শীটটি খুলুন <ExternalLink size={14} />
                  </a>
                )}
                <button
                  onClick={handleSheetSync}
                  disabled={syncing}
                  className="w-full bg-leaf-600 hover:shadow-lg text-white py-2.5 rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {syncing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                  {syncing ? 'আপডেট হচ্ছে...' : 'এখনই সিঙ্ক করুন'}
                </button>
              </>
            ) : (
              <p className="text-sm text-ink-500">
                এখনো সেট করা হয়নি। চালু করতে <code className="text-xs">GOOGLE_SHEETS_ID</code>,{' '}
                <code className="text-xs">GOOGLE_SERVICE_ACCOUNT_EMAIL</code> ও{' '}
                <code className="text-xs">GOOGLE_SERVICE_ACCOUNT_KEY</code> বসাতে হবে — ধাপগুলো
                <code className="text-xs"> docs/google-sheets-setup.md</code> ফাইলে আছে।
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand-600 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          সেটিংস সেভ করুন
        </button>
      </div>
    </div>
  );
}