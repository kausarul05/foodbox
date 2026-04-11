'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn, UserPlus, Eye, EyeOff, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { authAPI } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('ইমেইল এবং পাসওয়ার্ড দিন');
      return;
    }
    
    try {
      setLoading(true);
      const response = await authAPI.userLogin(email, password);
      console.log('Login response:', response);
      
      if (response.success) {
        const { token, ...userData } = response.data;
        
        // Store token and user data
        localStorage.setItem('userToken', token);
        localStorage.setItem('userData', JSON.stringify(userData));
        
        toast.success('লগইন সফল!');
        
        // Redirect to home or previous page
        setTimeout(() => {
          router.push('/');
        }, 500);
      } else {
        toast.error(response.message || 'ইমেইল বা পাসওয়ার্ড ভুল');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'লগইন ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3B82F6] to-[#111827] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-2xl mb-4">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">FoodBox</h1>
          <p className="text-blue-200 mt-2">আপনার অ্যাকাউন্টে লগইন করুন</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                ইমেইল এড্রেস
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">
                পাসওয়ার্ড
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800"
                  placeholder="••••••••"
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

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4 text-[#3B82F6] rounded" />
                <span className="text-sm text-gray-600">মনে রাখুন</span>
              </label>
              <button type="button" className="text-sm text-[#3B82F6] hover:underline">
                পাসওয়ার্ড ভুলে গেছেন?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn size={20} />
              )}
              {loading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              নতুন ব্যবহারকারী?{' '}
              <Link href="/signup" className="text-[#3B82F6] font-semibold hover:underline">
                অ্যাকাউন্ট তৈরি করুন
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}