'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import { Home, Lock, Mail, Phone, User, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import { Field, Input, PasswordInput, Textarea } from '@/components/ui/Field';
import ZoneSelect from '@/components/ui/ZoneSelect';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    zone: '',
    zoneName: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [selectedZone, setSelectedZone] = useState('');

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleZoneChange = (zoneId: string, customZoneName?: string) => {
    setSelectedZone(zoneId);
    setFormData((prev) => ({ ...prev, zone: zoneId, zoneName: customZoneName ?? '' }));
  };

  const validateForm = () => {
    if (!formData.fullName) return 'দয়া করে আপনার নাম দিন';
    if (!formData.phoneNumber) return 'দয়া করে ফোন নাম্বার দিন';
    if (formData.phoneNumber.length < 11) return 'ফোন নাম্বার কমপক্ষে ১১ ডিজিটের হতে হবে';
    if (!formData.email) return 'দয়া করে ইমেইল দিন';
    if (!formData.email.includes('@')) return 'সঠিক ইমেইল ঠিকানা দিন';
    if (!formData.password) return 'দয়া করে পাসওয়ার্ড দিন';
    if (formData.password.length < 6) return 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে';
    if (formData.password !== formData.confirmPassword) return 'পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না';
    if (!selectedZone) return 'দয়া করে জোন সিলেক্ট করুন';
    if (!formData.address) return 'দয়া করে ঠিকানা দিন';
    return null;
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();

    const problem = validateForm();
    if (problem) {
      toast.error(problem);
      return;
    }

    try {
      setLoading(true);
      const response = await authAPI.userRegister({
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        password: formData.password,
        zone: selectedZone,
        zoneName: formData.zoneName,
        address: formData.address,
      });

      if (response.success) {
        const { token, ...userData } = response.data;
        localStorage.setItem('userToken', token);
        localStorage.setItem('userData', JSON.stringify(userData));
        toast.success('অ্যাকাউন্ট তৈরি সফল!');
        // Registration already returns a session, so send them straight in
        // rather than back to /login. Full reload so the navbar re-reads it.
        window.location.href = '/order';
      } else {
        toast.error(response.message || 'অ্যাকাউন্ট তৈরি ব্যর্থ হয়েছে');
        setLoading(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('phone')) toast.error('এই ফোন নাম্বার দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে');
      else if (message.includes('email')) toast.error('এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে');
      else toast.error(message || 'অ্যাকাউন্ট তৈরি ব্যর্থ হয়েছে');
      setLoading(false);
    }
  };

  return (
    <div className="bg-cream">
      <div className="container-page py-12 md:py-16">
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <span className="inline-flex items-center rounded-full bg-brand-100 px-3.5 py-1 text-xs font-semibold text-brand-700">
              রেজিস্ট্রেশন
            </span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">অ্যাকাউন্ট তৈরি করুন</h1>
            <p className="mt-3 text-[15px] text-ink-600">
              এক মিনিটের কাজ। এরপরই প্যাকেজ বেছে নিয়ে অর্ডার শুরু করতে পারবেন।
            </p>
          </div>

          <form
            onSubmit={handleSignup}
            className="mt-10 rounded-3xl border border-ink-200 bg-white p-6 shadow-card sm:p-8"
          >
            <fieldset className="space-y-5">
              <legend className="mb-4 text-sm font-semibold tracking-wide text-ink-500 uppercase">আপনার পরিচয়</legend>

              <Field label="পূর্ণ নাম" htmlFor="fullName" required>
                <Input
                  id="fullName"
                  name="fullName"
                  icon={User}
                  autoComplete="name"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="আপনার পূর্ণ নাম"
                  required
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="ফোন নাম্বার" htmlFor="phoneNumber" required>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    icon={Phone}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="01XXXXXXXXX"
                    required
                  />
                </Field>

                <Field label="ইমেইল" htmlFor="email" required>
                  <Input
                    id="email"
                    name="email"
                    icon={Mail}
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                  />
                </Field>
              </div>
            </fieldset>

            <fieldset className="mt-8 space-y-5 border-t border-ink-100 pt-8">
              <legend className="sr-only">পাসওয়ার্ড</legend>
              <p className="-mt-2 mb-4 text-sm font-semibold tracking-wide text-ink-500 uppercase">পাসওয়ার্ড</p>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="পাসওয়ার্ড" htmlFor="password" required hint="কমপক্ষে ৬ অক্ষর">
                  <PasswordInput
                    id="password"
                    name="password"
                    icon={Lock}
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                  />
                </Field>

                <Field label="পাসওয়ার্ড নিশ্চিত করুন" htmlFor="confirmPassword" required>
                  <PasswordInput
                    id="confirmPassword"
                    name="confirmPassword"
                    icon={Lock}
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="আবার লিখুন"
                    required
                  />
                </Field>
              </div>
            </fieldset>

            <fieldset className="mt-8 space-y-5 border-t border-ink-100 pt-8">
              <legend className="sr-only">ডেলিভারি ঠিকানা</legend>
              <p className="-mt-2 mb-4 text-sm font-semibold tracking-wide text-ink-500 uppercase">কোথায় পৌঁছে দেব</p>

              <Field label="জোন / এলাকা" htmlFor="zone" required>
                <ZoneSelect id="zone" value={selectedZone} onChange={handleZoneChange} required />
              </Field>

              <Field label="ঠিকানা" htmlFor="address" required hint="বাসা ও রোড নাম্বার সহ লিখলে রাইডারের খুঁজে পেতে সুবিধা হয়।">
                <Textarea
                  id="address"
                  name="address"
                  icon={Home}
                  rows={3}
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="বাসা / রোড / এলাকা"
                  required
                />
              </Field>
            </fieldset>

            <label className="mt-8 flex items-start gap-3 border-t border-ink-100 pt-6 text-sm text-ink-600">
              <input
                type="checkbox"
                required
                className="mt-0.5 size-4.5 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
              />
              <span>
                আমি{' '}
                <Link href="/terms" className="font-medium text-brand-700 hover:underline">
                  টার্মস এন্ড কন্ডিশনস
                </Link>{' '}
                এবং{' '}
                <Link href="/privacy" className="font-medium text-brand-700 hover:underline">
                  প্রাইভেসি পলিসি
                </Link>{' '}
                মেনে নিচ্ছি
              </span>
            </label>

            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={loading}
              icon={<UserPlus size={18} />}
              className="mt-7"
            >
              {loading ? 'অ্যাকাউন্ট তৈরি হচ্ছে...' : 'অ্যাকাউন্ট তৈরি করুন'}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-ink-600">
            ইতিমধ্যে অ্যাকাউন্ট আছে?{' '}
            <Link href="/login" className="font-semibold text-brand-700 hover:underline">
              লগইন করুন
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
