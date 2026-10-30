'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, KeyRound, Lock, Mail, MessageCircle, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import { Field, Input, PasswordInput } from '@/components/ui/Field';
import { bn } from '@/lib/format';

/** Support line customers already see on the login page. */
const SUPPORT_WHATSAPP = '8801410906862';
const SUPPORT_DISPLAY = '01410906862';
const MIN_PASSWORD = 6;

type Step = 'phone' | 'code' | 'admin' | 'done';

/** The API client throws on a non-2xx answer, with the envelope as `data`. */
function envelope(error: unknown): { message?: string; retryAfter?: number; expired?: boolean } {
  return (error as { data?: object })?.data ?? {};
}

/**
 * Forgot password.
 *
 *   phone → (account has email)  code + new password → done
 *         → (no email on file)   contact support on WhatsApp
 *
 * The server answers "admin" both for an account without email and for a
 * number with no account, so this page never reveals who is registered.
 */
export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  /** Seconds until "send again" unlocks. */
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const requestCode = async () => {
    if (phone.trim().length < 11) {
      toast.error('সঠিক ফোন নাম্বার দিন');
      return;
    }
    try {
      setLoading(true);
      const res = await authAPI.forgotPassword(phone.trim());
      if (res.data?.channel === 'email') {
        setMaskedEmail(res.data.email);
        setCooldown(res.data.resendAfter ?? 60);
        setStep('code');
        toast.success('কোড পাঠানো হয়েছে');
      } else {
        setStep('admin');
      }
    } catch (error) {
      const info = envelope(error);
      if (typeof info.retryAfter === 'number') setCooldown(info.retryAfter);
      toast.error(error instanceof Error ? error.message : 'কোড পাঠানো যায়নি');
    } finally {
      setLoading(false);
    }
  };

  const submitPhone = (e: FormEvent) => {
    e.preventDefault();
    void requestCode();
  };

  const submitReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      toast.error('ইমেইলে আসা ৬ সংখ্যার কোডটি দিন');
      return;
    }
    if (password.length < MIN_PASSWORD) {
      toast.error(`পাসওয়ার্ড কমপক্ষে ${bn(MIN_PASSWORD)} অক্ষরের হতে হবে`);
      return;
    }
    if (password !== confirm) {
      toast.error('দুটি পাসওয়ার্ড মিলছে না');
      return;
    }
    try {
      setLoading(true);
      await authAPI.resetPassword(phone.trim(), code.trim(), password);
      setStep('done');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'পাসওয়ার্ড বদলানো যায়নি');
      // A dead code cannot be retried — send them back for a new one.
      if (envelope(error).expired) {
        setCode('');
        setCooldown(0);
        setStep('phone');
      }
    } finally {
      setLoading(false);
    }
  };

  // The number is in the message so the admin can reset straight from it.
  const whatsappHref = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
    `আসসালামু আলাইকুম, আমি FCS Meal অ্যাকাউন্টের পাসওয়ার্ড ভুলে গেছি। দয়া করে রিসেট করে দিন।
অ্যাকাউন্টের ফোন নাম্বার: ${phone.trim()}`
  )}`;

  return (
    <main className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-cream px-4 py-14 sm:px-8">
      <div className="w-full max-w-sm">
        <span className="grid size-13 place-items-center rounded-2xl bg-brand-100 text-brand-700">
          {step === 'done' ? <CheckCircle2 size={26} /> : <KeyRound size={26} />}
        </span>

        {step === 'phone' && (
          <>
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink-900">পাসওয়ার্ড ভুলে গেছেন?</h1>
            <p className="mt-2 text-[15px] text-ink-600">
              অ্যাকাউন্টের ফোন নাম্বার দিন। অ্যাকাউন্টে ইমেইল থাকলে সেখানে একটি কোড পাঠানো হবে।
            </p>
            <form onSubmit={submitPhone} className="mt-9 space-y-5">
              <Field label="ফোন নাম্বার" htmlFor="phone" required>
                <Input
                  id="phone"
                  icon={Phone}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  required
                />
              </Field>
              <Button type="submit" size="lg" fullWidth loading={loading} disabled={cooldown > 0}>
                {cooldown > 0 ? `${bn(cooldown)} সেকেন্ড অপেক্ষা করুন` : 'কোড পাঠান'}
              </Button>
            </form>
          </>
        )}

        {step === 'code' && (
          <>
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink-900">নতুন পাসওয়ার্ড দিন</h1>
            <p className="mt-2 flex items-start gap-2 text-[15px] text-ink-600">
              <Mail size={18} className="mt-0.5 shrink-0 text-brand-600" />
              <span>
                <b className="text-ink-900">{maskedEmail}</b> ঠিকানায় ৬ সংখ্যার একটি কোড পাঠানো হয়েছে। ইনবক্সে না
                পেলে স্প্যাম ফোল্ডার দেখুন।
              </span>
            </p>
            <form onSubmit={submitReset} className="mt-8 space-y-5">
              <Field label="কোড" htmlFor="code" required>
                <Input
                  id="code"
                  icon={KeyRound}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="১২৩৪৫৬"
                  className="tracking-[0.4em]"
                  required
                />
              </Field>
              <Field label="নতুন পাসওয়ার্ড" htmlFor="password" required hint={`কমপক্ষে ${bn(MIN_PASSWORD)} অক্ষর`}>
                <PasswordInput
                  id="password"
                  icon={Lock}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </Field>
              <Field label="আবার লিখুন" htmlFor="confirm" required>
                <PasswordInput
                  id="confirm"
                  icon={Lock}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </Field>
              <Button type="submit" size="lg" fullWidth loading={loading}>
                পাসওয়ার্ড বদলান
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-ink-600">
              কোড পাননি?{' '}
              <button
                type="button"
                disabled={cooldown > 0 || loading}
                onClick={() => void requestCode()}
                className="font-semibold text-brand-700 hover:underline disabled:cursor-not-allowed disabled:text-ink-400 disabled:no-underline"
              >
                {cooldown > 0 ? `${bn(cooldown)} সেকেন্ড পর আবার পাঠান` : 'আবার পাঠান'}
              </button>
            </p>
          </>
        )}

        {step === 'admin' && (
          <>
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink-900">আমাদের সাথে যোগাযোগ করুন</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
              এই মুহূর্তে আপনার অ্যাকাউন্টে কোড পাঠানো যাচ্ছে না। হোয়াটসঅ্যাপে মেসেজ দিন —
              আমরা যাচাই করে একটি নতুন পাসওয়ার্ড পাঠিয়ে দেব।
            </p>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-leaf-600 px-5 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-leaf-700"
            >
              <MessageCircle size={19} />
              হোয়াটসঅ্যাপে মেসেজ দিন
            </a>
            <p className="mt-3 text-center text-sm text-ink-600">
              অথবা কল করুন{' '}
              <a href={`tel:+${SUPPORT_WHATSAPP}`} className="font-semibold text-ink-900 hover:underline">
                {SUPPORT_DISPLAY}
              </a>
            </p>
            <p className="mt-6 rounded-xl bg-ink-100 p-3 text-xs leading-relaxed text-ink-600">
              পরামর্শ: লগইন করার পর প্রোফাইলে একটি ইমেইল যোগ করে রাখুন — পরের বার নিজেই পাসওয়ার্ড বদলাতে পারবেন।
            </p>
          </>
        )}

        {step === 'done' && (
          <>
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink-900">পাসওয়ার্ড বদলানো হয়েছে</h1>
            <p className="mt-2 text-[15px] text-ink-600">এখন নতুন পাসওয়ার্ড দিয়ে লগইন করুন।</p>
            <Link
              href="/login"
              className="mt-8 flex w-full items-center justify-center rounded-xl bg-brand-600 px-5 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              লগইন করুন
            </Link>
          </>
        )}

        {step !== 'done' && (
          <Link
            href="/login"
            className="mt-8 flex items-center justify-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900"
          >
            <ArrowLeft size={15} />
            লগইনে ফিরে যান
          </Link>
        )}
      </div>
    </main>
  );
}
