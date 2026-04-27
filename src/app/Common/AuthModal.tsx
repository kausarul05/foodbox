// components/AuthModal.tsx
'use client';

import React, { useState } from 'react';
import { X, Mail, Lock, User, Phone, MapPin, Home, Eye, EyeOff, LogIn, UserPlus, Chrome } from 'lucide-react';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface AuthModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Login state
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Register state
    const [registerData, setRegisterData] = useState({
        fullName: '',
        phoneNumber: '',
        email: '',
        password: '',
        confirmPassword: '',
        zone: '',
        address: '',
    });

    const zones = ['উত্তরা', 'ধানমন্ডি', 'গুলশান', 'বনানী', 'মিরপুর', 'মোহাম্মদপুর', 'পুরান ঢাকা', 'যাত্রাবাড়ী', 'নিউ মার্কেট', 'বসুন্ধরা'];

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!loginEmail || !loginPassword) {
            toast.error('ইমেইল এবং পাসওয়ার্ড দিন');
            return;
        }

        try {
            setLoading(true);
            const response = await authAPI.userLogin(loginEmail, loginPassword);

            if (response.success) {
                const { token, ...userData } = response.data;
                localStorage.setItem('userToken', token);
                localStorage.setItem('userData', JSON.stringify(userData));
                toast.success('লগইন সফল!');
                onSuccess();
            } else {
                toast.error(response.message || 'লগইন ব্যর্থ হয়েছে');
            }
        } catch (error: any) {
            toast.error(error.message || 'লগইন ব্যর্থ হয়েছে');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!registerData.fullName) {
            toast.error('দয়া করে আপনার নাম দিন');
            return;
        }
        if (!registerData.phoneNumber) {
            toast.error('দয়া করে ফোন নাম্বার দিন');
            return;
        }
        if (!registerData.email) {
            toast.error('দয়া করে ইমেইল দিন');
            return;
        }
        if (!registerData.password) {
            toast.error('দয়া করে পাসওয়ার্ড দিন');
            return;
        }
        if (registerData.password.length < 6) {
            toast.error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
            return;
        }
        if (registerData.password !== registerData.confirmPassword) {
            toast.error('পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না');
            return;
        }
        if (!registerData.zone) {
            toast.error('দয়া করে জোন সিলেক্ট করুন');
            return;
        }
        if (!registerData.address) {
            toast.error('দয়া করে ঠিকানা দিন');
            return;
        }

        try {
            setLoading(true);
            const response = await authAPI.userRegister({
                fullName: registerData.fullName,
                phoneNumber: registerData.phoneNumber,
                email: registerData.email,
                password: registerData.password,
                zone: registerData.zone,
                address: registerData.address,
            });

            if (response.success) {
                const { token, ...userData } = response.data;
                localStorage.setItem('userToken', token);
                localStorage.setItem('userData', JSON.stringify(userData));
                toast.success('অ্যাকাউন্ট তৈরি সফল!');
                onSuccess();
            } else {
                toast.error(response.message || 'অ্যাকাউন্ট তৈরি ব্যর্থ হয়েছে');
            }
        } catch (error: any) {
            toast.error(error.message || 'অ্যাকাউন্ট তৈরি ব্যর্থ হয়েছে');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white">
                    <h2 className="text-2xl font-bold text-gray-800">
                        {isLogin ? 'লগইন করুন' : 'অ্যাকাউন্ট তৈরি করুন'}
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {/* Google Login Button */}
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-300 mb-4"
                    >
                        <Chrome size={20} className="text-[#3B82F6]" />
                        Google দিয়ে {isLogin ? 'লগইন' : 'সাইনআপ'} করুন
                    </button>

                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">অথবা</span>
                        </div>
                    </div>

                    {isLogin ? (
                        // Login Form
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-gray-700 font-medium mb-1">ইমেইল</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="email"
                                        value={loginEmail}
                                        onChange={(e) => setLoginEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-black"
                                        placeholder="you@example.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-700 font-medium mb-1">পাসওয়ার্ড</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                        className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-black"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <LogIn size={18} />}
                                {loading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
                            </button>
                        </form>
                    ) : (
                        // Register Form
                        <form onSubmit={handleRegister} className="space-y-3">
                            <div>
                                <label className="block text-gray-700 font-medium mb-1">পূর্ণ নাম</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        value={registerData.fullName}
                                        onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-black"
                                        placeholder="আপনার নাম"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-700 font-medium mb-1">ফোন নাম্বার</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="tel"
                                        value={registerData.phoneNumber}
                                        onChange={(e) => setRegisterData({ ...registerData, phoneNumber: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-black"
                                        placeholder="+8801XXXXXXXXX"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-700 font-medium mb-1">ইমেইল</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="email"
                                        value={registerData.email}
                                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-black"
                                        placeholder="you@example.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-700 font-medium mb-1">পাসওয়ার্ড</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={registerData.password}
                                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                                        className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-black"
                                        placeholder="কমপক্ষে ৬ অক্ষর"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-700 font-medium mb-1">কনফার্ম পাসওয়ার্ড</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={registerData.confirmPassword}
                                        onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-black"
                                        placeholder="পাসওয়ার্ড আবার দিন"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-700 font-medium mb-1">জোন</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                    <select
                                        value={registerData.zone}
                                        onChange={(e) => setRegisterData({ ...registerData, zone: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white text-black"
                                        required
                                    >
                                        <option value="">সিলেক্ট করুন</option>
                                        {zones.map((zone) => (
                                            <option key={zone} value={zone}>{zone}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-700 font-medium mb-1">ঠিকানা</label>
                                <div className="relative">
                                    <Home className="absolute left-3 top-3 text-gray-400" size={18} />
                                    <textarea
                                        value={registerData.address}
                                        onChange={(e) => setRegisterData({ ...registerData, address: e.target.value })}
                                        rows={2}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-black"
                                        placeholder="বিস্তারিত ঠিকানা"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <UserPlus size={18} />}
                                {loading ? 'অ্যাকাউন্ট তৈরি হচ্ছে...' : 'অ্যাকাউন্ট তৈরি করুন'}
                            </button>
                        </form>
                    )}

                    <div className="mt-4 text-center">
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-[#3B82F6] hover:underline text-sm"
                        >
                            {isLogin ? 'নতুন অ্যাকাউন্ট তৈরি করুন' : 'ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}