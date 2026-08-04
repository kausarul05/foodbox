import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarCheck, CreditCard, Truck, Wallet } from 'lucide-react';
import Packages from '@/app/Components/Home/Packages';
import PageHeader from '@/components/ui/PageHeader';
import SectionHeading from '@/components/ui/SectionHeading';
import { buttonClass } from '@/components/ui/Button';
import { bn } from '@/lib/format';

export const metadata: Metadata = {
  title: 'সাবস্ক্রিপশন',
  description: 'মাসিক প্যাকেজ নিলে ডেলিভারি ফ্রি, পেমেন্ট ওয়ালেট থেকে।',
};

const PERKS = [
  {
    icon: Truck,
    title: 'ডেলিভারি ফ্রি',
    body: 'সাবস্ক্রিপশন চালু থাকলে প্রতিদিনের ডেলিভারি চার্জ দিতে হবে না।',
  },
  {
    icon: Wallet,
    title: 'ওয়ালেট থেকে পেমেন্ট',
    body: 'একবার রিচার্জ করে রাখুন, প্রতিবেলা আলাদা করে টাকা দেওয়ার ঝামেলা নেই।',
  },
  {
    icon: CalendarCheck,
    title: 'যেকোনো দিন বন্ধ',
    body: 'বাইরে খাচ্ছেন বা বাড়ি যাচ্ছেন? সময়ের আগে জানালে সেদিনের টাকা কাটবে না।',
  },
];

const STEPS = [
  { title: 'প্যাকেজ বেছে নিন', body: 'নিচের যেকোনো একটি প্যাকেজে রিকোয়েস্ট পাঠান।' },
  { title: 'পেমেন্ট করুন', body: 'বিকাশ বা নগদে টাকা পাঠিয়ে ট্রানজেকশন আইডি দিন।' },
  { title: 'অ্যাডমিন অনুমোদন', body: 'যাচাইয়ের পর আপনার সাবস্ক্রিপশন চালু হয়ে যাবে।' },
  { title: 'অর্ডার শুরু', body: 'এরপর প্রতিদিনের খাবার ওয়ালেট থেকেই কেটে নেওয়া হবে।' },
];

export default function SubscriptionPage() {
  return (
    <>
      <PageHeader
        eyebrow="সাবস্ক্রিপশন"
        title="একবার সাবস্ক্রাইব করুন, রোজকার হিসাব ভুলে যান"
        subtitle="মাসিক প্যাকেজ নিলে প্রতি বেলার খরচ কমে, ডেলিভারি ফ্রি হয়, আর পেমেন্ট চলে ওয়ালেট থেকে।"
      >
        <Link href="#packages" className={buttonClass('primary', 'lg')}>
          প্যাকেজ দেখুন
        </Link>
      </PageHeader>

      {/* Why subscribe */}
      <section className="py-16 md:py-20">
        <div className="container-page">
          <SectionHeading
            eyebrow="সুবিধা"
            title="সাবস্ক্রিপশনে কী বাড়তি পাবেন"
            subtitle="সাবস্ক্রিপশন ছাড়াও অর্ডার করা যায় — তবে এই তিনটি সুবিধা তখন থাকে না।"
          />

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {PERKS.map((perk) => (
              <article key={perk.title} className="rounded-3xl border border-ink-200 bg-white p-7 shadow-card">
                <span className="grid size-12 place-items-center rounded-2xl bg-brand-100 text-brand-700">
                  <perk.icon size={22} />
                </span>
                <h3 className="mt-5 text-lg font-bold text-ink-900">{perk.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{perk.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Packages />

      {/* How it works */}
      <section className="bg-ink-50/70 py-16 md:py-20">
        <div className="container-page">
          <SectionHeading
            eyebrow="প্রক্রিয়া"
            title="সাবস্ক্রাইব করবেন কীভাবে"
            subtitle="পেমেন্ট ম্যানুয়ালি যাচাই করা হয়, তাই অনুমোদনে কিছুটা সময় লাগতে পারে।"
          />

          <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-3xl border border-ink-200 bg-white p-6 shadow-card">
                <span className="grid size-9 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {bn(i + 1)}
                </span>
                <h3 className="mt-4 font-bold text-ink-900">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{step.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 rounded-3xl border border-ink-200 bg-white p-6 text-center shadow-card">
            <CreditCard size={20} className="text-brand-600" />
            <p className="text-sm text-ink-600">
              পেমেন্ট নিয়ে প্রশ্ন আছে? কল করুন{' '}
              <a href="tel:+8801792695939" className="font-semibold text-ink-900 hover:underline">
                ০১৭৯২৬৯৫৯৩৯
              </a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
