'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Mail, 
  Lock, 
  UserPlus, 
  Eye, 
  EyeOff, 
  Shield, 
  User, 
  Phone, 
  MapPin, 
  Home,
  CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { authAPI } from '@/lib/api';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    zone: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const zones = ['উত্তরা', 'ধানমন্ডি', 'গুলশান', 'বনানী', 'মিরপুর', 'মোহাম্মদপুর', 'পুরান ঢাকা', 'যাত্রাবাড়ী', 'নিউ মার্কেট', 'বসুন্ধরা'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateForm = () => {
    if (!formData.fullName) {
      toast.error('দয়া করে আপনার নাম দিন');
      return false;
    }
    if (!formData.phoneNumber) {
      toast.error('দয়া করে ফোন নাম্বার দিন');
      return false;
    }
    if (formData.phoneNumber.length < 11) {
      toast.error('ফোন নাম্বার কমপক্ষে ১১ ডিজিটের হতে হবে');
      return false;
    }
    if (!formData.email) {
      toast.error('দয়া করে ইমেইল দিন');
      return false;
    }
    if (!formData.email.includes('@')) {
      toast.error('সঠিক ইমেইল ঠিকানা দিন');
      return false;
    }
    if (!formData.password) {
      toast.error('দয়া করে পাসওয়ার্ড দিন');
      return false;
    }
    if (formData.password.length < 6) {
      toast.error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না');
      return false;
    }
    if (!formData.zone) {
      toast.error('দয়া করে জোন সিলেক্ট করুন');
      return false;
    }
    if (!formData.address) {
      toast.error('দয়া করে ঠিকানা দিন');
      return false;
    }
    return true;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      const signupData = {
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        password: formData.password,
        zone: formData.zone,
        address: formData.address,
      };
      
      const response = await authAPI.userRegister(signupData);
      console.log('Signup response:', response);
      
      if (response.success) {
        const { token, ...userData } = response.data;
        
        // Store token and user data
        localStorage.setItem('userToken', token);
        localStorage.setItem('userData', JSON.stringify(userData));
        
        toast.success('অ্যাকাউন্ট তৈরি সফল!');
        
        // Redirect to home
        setTimeout(() => {
          router.push('/');
        }, 500);
      } else {
        toast.error(response.message || 'অ্যাকাউন্ট তৈরি ব্যর্থ হয়েছে');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.message || 'অ্যাকাউন্ট তৈরি ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3B82F6] to-[#111827] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-2xl mb-4">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">FoodBox</h1>
          <p className="text-blue-200 mt-2">নতুন অ্যাকাউন্ট তৈরি করুন</p>
        </div>

        {/* Signup Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSignup} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                পূর্ণ নাম <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800"
                  placeholder="আপনার পূর্ণ নাম"
                  required
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                ফোন নাম্বার <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800"
                  placeholder="+8801XXXXXXXXX"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                ইমেইল এড্রেস <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                পাসওয়ার্ড <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800"
                  placeholder="কমপক্ষে ৬ অক্ষর"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                পাসওয়ার্ড নিশ্চিত করুন <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800"
                  placeholder="আবার পাসওয়ার্ড দিন"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Zone Selection */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                জোন / এলাকা <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <select
                  name="zone"
                  value={formData.zone}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white text-gray-800"
                  required
                >
                  <option value="">সিলেক্ট করুন</option>
                  {zones.map((zone) => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                ঠিকানা <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Home className="absolute left-3 top-3 text-gray-400" size={20} />
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800"
                  placeholder="বিস্তারিত ঠিকানা লিখুন..."
                  required
                />
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                className="w-5 h-5 text-[#3B82F6] rounded focus:ring-[#3B82F6] mt-0.5"
                required
              />
              <label className="text-sm text-gray-600">
                আমি <Link href="/terms" className="text-[#3B82F6] hover:underline">টার্মস এন্ড কন্ডিশনস</Link> এবং{' '}
                <Link href="/privacy" className="text-[#3B82F6] hover:underline">প্রাইভেসি পলিসি</Link> মেনে নিচ্ছি
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 mt-6"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <UserPlus size={20} />
              )}
              {loading ? 'অ্যাকাউন্ট তৈরি হচ্ছে...' : 'অ্যাকাউন্ট তৈরি করুন'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              ইতিমধ্যে অ্যাকাউন্ট আছে?{' '}
              <Link href="/login" className="text-[#3B82F6] font-semibold hover:underline">
                লগইন করুন
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}