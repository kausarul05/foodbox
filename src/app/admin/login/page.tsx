'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, LogIn, Shield, User, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '@/app/admin/lib/api';

/**
 * One screen, two jobs.
 *
 * With no admin in the database this is the handover form: whoever opens the
 * panel first picks the email and password, and that becomes the only admin
 * account. Once one exists it is an ordinary login forever after — the server
 * decides which, in `GET /api/auth/admin/setup`, so a stale page cannot talk
 * its way into creating a second owner.
 */

/** Keep in step with MIN_PASSWORD_LENGTH in src/server/passwordReset.ts. */
const MIN_PASSWORD = 6;

type Mode = 'checking' | 'setup' | 'login';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('checking');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    authAPI
      .adminSetupStatus()
      .then((res) => {
        if (alive) setMode(res?.data?.needsSetup ? 'setup' : 'login');
      })
      .catch(() => {
        // The database is unreachable or the check failed. Showing the login
        // form is the safe guess: it cannot create anything.
        if (alive) setMode('login');
      });
    return () => {
      alive = false;
    };
  }, []);

  const startSession = (data: { token: string; [key: string]: unknown }, message: string) => {
    const { token, ...adminData } = data;
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminData', JSON.stringify(adminData));
    toast.success(message);
    // Let the toast paint before the route changes under it.
    setTimeout(() => router.push('/admin/dashboard'), 500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await authAPI.adminLogin(email, password);
      if (response.success) {
        startSession(response.data, 'লগইন সফল!');
      } else {
        toast.error(response.message || 'ভুল ইমেইল বা পাসওয়ার্ড!');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'লগইন ব্যর্থ হয়েছে!');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      return toast.error(`পাসওয়ার্ড কমপক্ষে ${MIN_PASSWORD} অক্ষরের হতে হবে`);
    }
    if (password !== confirm) return toast.error('দুটি পাসওয়ার্ড মিলছে না');

    setLoading(true);
    try {
      const response = await authAPI.adminSetup(fullName, email, password);
      if (response.success) {
        startSession(response.data, 'অ্যাডমিন অ্যাকাউন্ট তৈরি হয়েছে!');
      } else {
        toast.error(response.message || 'অ্যাকাউন্ট তৈরি করা যায়নি!');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'অ্যাকাউন্ট তৈরি করা যায়নি!');
      // A 409 means someone set it up first — the login form is what they need.
      authAPI
        .adminSetupStatus()
        .then((res) => setMode(res?.data?.needsSetup ? 'setup' : 'login'))
        .catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  const field = 'w-full pl-10 text-ink-900 pr-4 py-2.5 border border-ink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-base sm:text-sm';
  const icon = 'absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-400';

  return (
    <div className="min-h-screen bg-brand-600 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-2xl mb-4">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">FCS Admin</h1>
          <p className="text-brand-100 mt-2">
            {mode === 'setup' ? 'প্রথমবার — অ্যাডমিন অ্যাকাউন্ট তৈরি করুন' : 'অ্যাডমিন প্যানেলে স্বাগতম'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {mode === 'checking' && (
            <p className="py-8 text-center text-ink-500">দেখা হচ্ছে…</p>
          )}

          {mode === 'setup' && (
            <>
              <p className="mb-6 rounded-lg bg-brand-50 p-3 text-sm leading-relaxed text-ink-700">
                এখনো কোনো অ্যাডমিন অ্যাকাউন্ট নেই। নিচে যে ইমেইল ও পাসওয়ার্ড দেবেন সেটাই
                আপনার স্থায়ী লগইন হবে — পরে এই পাতায় ওটা দিয়েই ঢুকবেন। পাসওয়ার্ডটা মনে রাখুন,
                এটি আর কোথাও দেখা যাবে না।
              </p>
              <form onSubmit={handleSetup} className="space-y-5">
                <div>
                  <label className="block text-ink-700 font-medium mb-2">আপনার নাম</label>
                  <div className="relative">
                    <User className={icon} size={20} />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={field}
                      placeholder="যেমন: রহিম উদ্দিন"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-ink-700 font-medium mb-2">ইমেইল এড্রেস</label>
                  <div className="relative">
                    <Mail className={icon} size={20} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={field}
                      placeholder="admin@fcsbd.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-ink-700 font-medium mb-2">পাসওয়ার্ড</label>
                  <div className="relative">
                    <Lock className={icon} size={20} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={field}
                      placeholder={`কমপক্ষে ${MIN_PASSWORD} অক্ষর`}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-ink-700 font-medium mb-2">পাসওয়ার্ড নিশ্চিত করুন</label>
                  <div className="relative">
                    <KeyRound className={icon} size={20} />
                    <input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className={field}
                      placeholder="আবার লিখুন"
                      required
                    />
                  </div>
                  {confirm.length > 0 && confirm !== password && (
                    <p className="mt-1.5 text-sm text-red-600">দুটি পাসওয়ার্ড মিলছে না</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-600 text-white py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Shield size={20} />
                  {loading ? 'তৈরি হচ্ছে...' : 'অ্যাকাউন্ট তৈরি করুন'}
                </button>
              </form>
            </>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-ink-700 font-medium mb-2">ইমেইল এড্রেস</label>
                <div className="relative">
                  <Mail className={icon} size={20} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={field}
                    placeholder="admin@fcsbd.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-ink-700 font-medium mb-2">পাসওয়ার্ড</label>
                <div className="relative">
                  <Lock className={icon} size={20} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={field}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 text-white py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <LogIn size={20} />
                {loading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
