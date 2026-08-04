'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, Lock, LogIn, Phone, UtensilsCrossed, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import { Field, Input, PasswordInput } from '@/components/ui/Field';
import logo from '../../../../public/Images/logo.jpg';

/** Reassurance rail — only shown on desktop, where there is room to spare. */
const PROOF = [
  { icon: UtensilsCrossed, title: 'প্রতিদিন নতুন মেনু', body: 'ঘরের মতো রান্না, সাত দিন সাত রকম।' },
  { icon: Wallet, title: 'ওয়ালেট থেকে কাটা', body: 'সাবস্ক্রিপশন থাকলে প্রতিবার পেমেন্টের ঝামেলা নেই।' },
  { icon: Clock, title: 'যেকোনো দিন বন্ধ', body: 'বাইরে খাচ্ছেন? সময়ের আগে বললেই হলো।' },
];

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    if (!phoneNumber || !password) {
      toast.error('ফোন নাম্বার এবং পাসওয়ার্ড দিন');
      return;
    }
    if (phoneNumber.length < 11) {
      toast.error('সঠিক ফোন নাম্বার দিন');
      return;
    }

    try {
      setLoading(true);
      const response = await authAPI.userLogin(phoneNumber, password);

      if (response.success) {
        const { token, ...userData } = response.data;
        localStorage.setItem('userToken', token);
        localStorage.setItem('userData', JSON.stringify(userData));
        toast.success('লগইন সফল!');
        // A full reload rather than router.push: the navbar reads the session
        // from localStorage, and this guarantees it re-reads it.
        window.location.href = '/';
      } else {
        toast.error(response.message || 'ফোন নাম্বার বা পাসওয়ার্ড ভুল');
        setLoading(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'লগইন ব্যর্থ হয়েছে');
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-[calc(100vh-8rem)] lg:grid-cols-2">
      {/* Brand rail */}
      <aside className="relative hidden flex-col justify-center overflow-hidden bg-ink-900 p-14 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgb(249_115_22/0.28),transparent_45%),radial-gradient(circle_at_85%_80%,rgb(34_197_94/0.18),transparent_45%)]"
        />
        <div className="relative max-w-md">
          <Link href="/" className="flex items-center gap-3">
            <Image src={logo} alt="" width={44} height={44} className="size-11 rounded-xl object-cover" />
            <span className="text-xl font-bold text-white">FoodBox</span>
          </Link>

          <h2 className="mt-10 text-4xl leading-tight font-bold text-balance text-white">
            আজ কী রান্না হবে —<br />
            <span className="text-brand-400">এই প্রশ্নটা আর করতে হবে না।</span>
          </h2>

          <ul className="mt-10 space-y-6">
            {PROOF.map((item) => (
              <li key={item.title} className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-brand-300">
                  <item.icon size={20} />
                </span>
                <div>
                  <p className="font-semibold text-white">{item.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-300">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Form */}
      <main className="flex items-center justify-center bg-cream px-4 py-14 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Image src={logo} alt="" width={52} height={52} className="size-13 rounded-2xl object-cover" />
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink-900 lg:mt-0">আবার স্বাগতম</h1>
          <p className="mt-2 text-[15px] text-ink-600">ফোন নাম্বার দিয়ে আপনার অ্যাকাউন্টে ঢুকুন।</p>

          <form onSubmit={handleLogin} className="mt-9 space-y-5">
            <Field label="ফোন নাম্বার" htmlFor="phone" required>
              <Input
                id="phone"
                icon={Phone}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="01XXXXXXXXX"
                required
              />
            </Field>

            <Field label="পাসওয়ার্ড" htmlFor="password" required>
              <PasswordInput
                id="password"
                icon={Lock}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </Field>

            <Button type="submit" size="lg" fullWidth loading={loading} icon={<LogIn size={18} />}>
              {loading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-ink-600">
            নতুন ব্যবহারকারী?{' '}
            <Link href="/signup" className="font-semibold text-brand-700 hover:underline">
              অ্যাকাউন্ট তৈরি করুন
            </Link>
          </p>

          <p className="mt-4 text-center text-xs leading-relaxed text-ink-500">
            সমস্যা হচ্ছে? কল করুন{' '}
            <a href="tel:+8801792695939" className="font-medium text-ink-700 hover:underline">
              ০১৭৯২৬৯৫৯৩৯
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
