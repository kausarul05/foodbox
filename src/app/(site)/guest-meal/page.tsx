import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeDollarSign, CalendarPlus, Users } from 'lucide-react';
import WeeklyMenu from '@/app/Components/Home/WeeklyMenu';
import PageHeader from '@/components/ui/PageHeader';
import SectionHeading from '@/components/ui/SectionHeading';
import { buttonClass } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'গেস্ট মিল',
  description: 'বাড়িতে অতিথি এসেছে? সাবস্ক্রিপশন ছাড়াই বাড়তি খাবার অর্ডার করুন।',
};

const POINTS = [
  {
    icon: CalendarPlus,
    title: 'যেদিন দরকার সেদিনই',
    body: 'আলাদা কোনো প্যাকেজ লাগবে না। অর্ডার ফর্মে গেস্ট মিল চালু করে দিন বেছে নিন।',
  },
  {
    icon: BadgeDollarSign,
    title: 'ক্যাশ অন ডেলিভারি',
    body: 'গেস্ট খাবারের টাকা ওয়ালেট থেকে কাটে না — ডেলিভারির সময় হাতে দিলেই হলো।',
  },
  {
    icon: Users,
    title: 'একই রান্না, একই মেনু',
    body: 'অতিথিরাও সেদিনের মেনু থেকেই খাবার পাবেন, আলাদা কিছু নয়।',
  },
];

export default function GuestMealPage() {
  return (
    <>
      <PageHeader
        eyebrow="গেস্ট মিল"
        title="অতিথি এলে বাড়তি প্লেট নিয়ে ভাবতে হবে না"
        subtitle="নিজের খাবারের সাথে অতিথির জন্যও খাবার যোগ করে দিন — একই দিনে, একই ডেলিভারিতে।"
      >
        <Link href="/order" className={buttonClass('primary', 'lg')}>
          গেস্ট মিল অর্ডার করুন
        </Link>
      </PageHeader>

      <section className="py-16 md:py-20">
        <div className="container-page">
          <SectionHeading
            eyebrow="কীভাবে কাজ করে"
            title="তিনটা কথা জানলেই যথেষ্ট"
            subtitle="অর্ডার পেজে গেস্ট মিল টগলটা চালু করলেই প্রতিদিনের তালিকায় অতিথির জন্য আলাদা অপশন চলে আসবে।"
          />

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {POINTS.map((point) => (
              <article key={point.title} className="rounded-3xl border border-ink-200 bg-white p-7 shadow-card">
                <span className="grid size-12 place-items-center rounded-2xl bg-leaf-100 text-leaf-700">
                  <point.icon size={22} />
                </span>
                <h3 className="mt-5 text-lg font-bold text-ink-900">{point.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{point.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center gap-4 rounded-3xl bg-ink-900 px-7 py-10 text-center">
            <h3 className="text-xl font-bold text-balance text-white">অতিথির খাবার আজই ঠিক করে রাখুন</h3>
            <p className="max-w-md text-sm leading-relaxed text-ink-300">
              অর্ডার পেজে গিয়ে গেস্ট মিল চালু করুন, তারপর যেদিন দরকার সেদিনের বেলা বেছে নিন।
            </p>
            <Link href="/order" className={buttonClass('primary', 'lg', 'mt-2')}>
              অর্ডার পেজে যান
            </Link>
          </div>
        </div>
      </section>

      <WeeklyMenu />
    </>
  );
}
