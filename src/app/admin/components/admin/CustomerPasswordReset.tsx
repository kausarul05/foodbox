'use client';

import { useState, type FormEvent } from 'react';
import { Check, Copy, KeyRound, MessageCircle, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { userAPI } from '@/app/admin/lib/api';
import { Panel } from '@/app/admin/components/ui/Shell';

interface Issued {
  fullName: string;
  phoneNumber: string;
  whatsappNumber?: string;
  tempPassword: string;
}

/** "01712345678" → "8801712345678" for wa.me links. */
function waNumber(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('88') ? digits : `88${digits}`;
}

/**
 * For a customer who forgot their password and has no email on file — the
 * forgot-password page sends them to WhatsApp, and this is the other end.
 *
 * The temporary password is shown once; the server keeps only its hash.
 */
export default function CustomerPasswordReset() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (phone.trim().length < 11) {
      toast.error('সঠিক ফোন নাম্বার দিন');
      return;
    }
    if (!window.confirm(`${phone.trim()} নাম্বারের অ্যাকাউন্টের পাসওয়ার্ড বদলে যাবে। পুরনো পাসওয়ার্ড আর কাজ করবে না। নিশ্চিত?`)) {
      return;
    }
    try {
      setLoading(true);
      const res = await userAPI.resetCustomerPassword(phone.trim());
      setIssued(res.data);
      setCopied(false);
      setPhone('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'রিসেট করা যায়নি');
    } finally {
      setLoading(false);
    }
  };

  const message = issued
    ? `আসসালামু আলাইকুম ${issued.fullName}, আপনার FCS Meal অ্যাকাউন্টের নতুন পাসওয়ার্ড: ${issued.tempPassword}\nলগইন করার পর প্রোফাইল থেকে পাসওয়ার্ড বদলে নিন।`
    : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(issued?.tempPassword ?? '');
      setCopied(true);
    } catch {
      toast.error('কপি করা যায়নি, পাসওয়ার্ডটি লিখে নিন');
    }
  };

  return (
    <Panel title="কাস্টমারের পাসওয়ার্ড রিসেট">
      <p className="text-sm text-ink-600">
        যে কাস্টমারের অ্যাকাউন্টে ইমেইল নেই, তিনি নিজে পাসওয়ার্ড রিসেট করতে পারেন না — হোয়াটসঅ্যাপে যোগাযোগ করেন। পরিচয়
        যাচাই করে এখান থেকে একটি নতুন অস্থায়ী পাসওয়ার্ড দিন।
      </p>

      <form onSubmit={submit} className="mt-4 flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1">
          <Phone size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-400" />
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="কাস্টমারের ফোন নাম্বার"
            aria-label="কাস্টমারের ফোন নাম্বার"
            className="w-full rounded-xl border border-ink-200 py-2.5 pr-4 pl-10 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/25 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          <KeyRound size={16} />
          {loading ? 'হচ্ছে…' : 'নতুন পাসওয়ার্ড দিন'}
        </button>
      </form>

      {issued && (
        <div className="mt-4 rounded-xl border border-leaf-200 bg-leaf-50 p-4">
          <p className="text-sm text-ink-700">
            <b className="text-ink-900">{issued.fullName}</b> ({issued.phoneNumber}) — নতুন পাসওয়ার্ড:
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="rounded-lg bg-white px-3 py-1.5 font-mono text-lg font-bold tracking-wider text-ink-900">
              {issued.tempPassword}
            </code>
            <button
              type="button"
              onClick={copy}
              aria-label="পাসওয়ার্ড কপি করুন"
              className="grid size-9 place-items-center rounded-lg border border-ink-200 bg-white text-ink-600 hover:bg-ink-50"
            >
              {copied ? <Check size={16} className="text-leaf-600" /> : <Copy size={16} />}
            </button>
          </div>
          <a
            href={`https://wa.me/${waNumber(issued.whatsappNumber || issued.phoneNumber)}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-leaf-600 px-4 py-2 text-sm font-semibold text-white hover:bg-leaf-700"
          >
            <MessageCircle size={16} />
            হোয়াটসঅ্যাপে পাঠান
          </a>
          <p className="mt-2 text-xs text-ink-500">
            এই পাসওয়ার্ড আর দেখানো যাবে না। পাতা ছাড়ার আগে পাঠিয়ে দিন।
          </p>
        </div>
      )}
    </Panel>
  );
}
