'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { AlertCircle, Check, Loader2, Sparkles, X } from 'lucide-react';
import { packageAPI, subscriptionAPI } from '@/lib/api';
import SectionHeading from '@/components/ui/SectionHeading';
import { bn, taka } from '@/lib/format';

interface PackageType {
  _id: string;
  name: string;
  title: string;
  price: number;
  originalPrice: number;
  features: string[];
  duration: number;
  discount: number;
  isActive: boolean;
}

const PAYMENT_METHODS = [
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'rocket', label: 'Rocket' },
  { value: 'bank', label: 'ব্যাংক ট্রান্সফার' },
];

export default function Packages() {
  const router = useRouter();
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<PackageType | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('bkash');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await packageAPI.getAllPackages();
        if (!cancelled) setPackages((res.data ?? []).filter((p: PackageType) => p.isActive));
      } catch {
        if (!cancelled) toast.error('প্যাকেজ লোড করা যায়নি');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const startSubscribe = (pkg: PackageType) => {
    if (!localStorage.getItem('userToken')) {
      toast.error('সাবস্ক্রাইব করতে আগে লগইন করুন');
      router.push('/login');
      return;
    }
    setSelected(pkg);
  };

  const confirmSubscribe = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      // address and zone are left empty on purpose — the API fills them from
      // the user's saved profile.
      const res = await subscriptionAPI.requestSubscription({
        package: selected.name,
        paymentMethod,
        address: '',
        zone: '',
      });
      if (res.success) {
        toast.success('রিকোয়েস্ট পাঠানো হয়েছে! অ্যাডমিন অনুমোদনের অপেক্ষায়।');
        setSelected(null);
        router.push('/dashboard/profile');
      } else {
        toast.error(res.message || 'সাবস্ক্রিপশন ব্যর্থ হয়েছে');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'সাবস্ক্রিপশন ব্যর্থ হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="packages" className="scroll-mt-32 py-16 md:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow="প্যাকেজ"
          title="আপনার জন্য কোনটা ঠিক?"
          subtitle="মাসিক সাবস্ক্রিপশন নিলে প্রতি বেলার খরচ অনেক কমে যায়।"
        />

        {loading ? (
          <div className="mt-14 grid animate-pulse gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[28rem] rounded-3xl bg-ink-200" />
            ))}
          </div>
        ) : packages.length === 0 ? (
          <div className="mx-auto mt-12 max-w-md rounded-2xl border border-ink-200 bg-ink-50 p-10 text-center">
            <AlertCircle className="mx-auto size-10 text-ink-400" />
            <p className="mt-4 font-semibold text-ink-800">এখন কোনো প্যাকেজ চালু নেই</p>
          </div>
        ) : (
          <div className="mt-14 grid items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg, i) => {
              // The middle card is the one we push; with two packages it is the
              // second, with one it is simply not highlighted.
              const featured = packages.length > 1 && i === Math.floor((packages.length - 1) / 2);
              return (
                <article
                  key={pkg._id}
                  className={`relative flex h-full flex-col rounded-3xl border p-7 transition duration-300 ${
                    featured
                      ? 'border-brand-300 bg-white shadow-lift lg:-translate-y-3'
                      : 'border-ink-200 bg-white shadow-card hover:-translate-y-1 hover:shadow-lift'
                  }`}
                >
                  {featured && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-4 py-1.5 text-xs font-bold whitespace-nowrap text-white shadow-md">
                      সবচেয়ে জনপ্রিয়
                    </span>
                  )}

                  <h3 className="text-xl font-bold text-ink-900">{pkg.title}</h3>
                  <p className="mt-1 text-sm text-ink-500">{bn(pkg.duration)} দিনের প্যাকেজ</p>

                  <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-4xl font-bold tracking-tight text-ink-900">{taka(pkg.price)}</span>
                    {pkg.originalPrice > pkg.price && (
                      <span className="text-sm text-ink-400 line-through">{taka(pkg.originalPrice)}</span>
                    )}
                  </div>
                  {pkg.discount > 0 && (
                    <span className="mt-2 inline-flex w-fit rounded-full bg-leaf-100 px-2.5 py-1 text-xs font-semibold text-leaf-700">
                      {bn(pkg.discount)}% সাশ্রয়
                    </span>
                  )}

                  <ul className="mt-7 flex-1 space-y-3 border-t border-ink-100 pt-6">
                    {pkg.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm text-ink-700">
                        <Check size={17} className="mt-0.5 shrink-0 text-leaf-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => startSubscribe(pkg)}
                    className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition ${
                      featured
                        ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20 hover:bg-brand-700'
                        : 'border border-ink-300 bg-white text-ink-900 hover:border-brand-400 hover:text-brand-700'
                    }`}
                  >
                    <Sparkles size={16} />
                    সাবস্ক্রাইব করুন
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="subscribe-title"
          onClick={() => !submitting && setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h3 id="subscribe-title" className="text-lg font-bold text-ink-900">
                সাবস্ক্রিপশন নিশ্চিত করুন
              </h3>
              <button
                onClick={() => setSelected(null)}
                disabled={submitting}
                className="grid size-8 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-ink-100 disabled:opacity-50"
                aria-label="বন্ধ করুন"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-brand-50 p-4">
              <p className="text-xs text-ink-600">আপনি সাবস্ক্রাইব করছেন</p>
              <p className="mt-0.5 font-semibold text-brand-800">{selected.title}</p>
              <p className="mt-1 text-2xl font-bold text-ink-900">{taka(selected.price)}</p>
              <p className="mt-0.5 text-xs text-ink-500">{bn(selected.duration)} দিনের জন্য</p>
            </div>

            <fieldset className="mt-5">
              <legend className="text-sm font-medium text-ink-800">পেমেন্ট মেথড</legend>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.value}
                    className={`cursor-pointer rounded-xl border px-4 py-3 text-center text-sm font-medium transition ${
                      paymentMethod === method.value
                        ? 'border-brand-500 bg-brand-50 text-brand-800'
                        : 'border-ink-200 text-ink-600 hover:border-ink-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.value}
                      checked={paymentMethod === method.value}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="sr-only"
                    />
                    {method.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <p className="mt-5 rounded-xl bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900">
              রিকোয়েস্ট পাঠানোর পর অ্যাডমিন অনুমোদন দিলে আপনার সাবস্ক্রিপশন চালু হবে।
            </p>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setSelected(null)}
                disabled={submitting}
                className="flex-1 rounded-full border border-ink-300 px-5 py-3 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-50"
              >
                বাতিল
              </button>
              <button
                onClick={confirmSubscribe}
                disabled={submitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? 'পাঠানো হচ্ছে...' : 'কনফার্ম করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
