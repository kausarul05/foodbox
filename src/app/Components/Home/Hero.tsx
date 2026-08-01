import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, Clock, Soup, Star } from 'lucide-react';
import heroImage from '@/../public/Images/bannar.jpg';
import { bn } from '@/lib/format';

const STATS = [
  { value: 1200, suffix: '+', label: 'সন্তুষ্ট গ্রাহক' },
  { value: 45000, suffix: '+', label: 'ডেলিভারি সম্পন্ন' },
  { value: 18, suffix: 'টি', label: 'ডেলিভারি জোন' },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-grain">
      <div className="container-page grid items-center gap-12 py-14 lg:grid-cols-2 lg:gap-16 lg:py-24">
        {/* Copy */}
        <div className="animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-brand-700">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-leaf-500 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-leaf-600" />
            </span>
            আজকের অর্ডার এখনো নেওয়া হচ্ছে
          </span>

          <h1 className="mt-5 text-4xl leading-[1.15] font-bold tracking-tight text-balance text-ink-900 sm:text-5xl lg:text-6xl">
            ঘরের মতো রান্না,
            <span className="block text-brand-600">প্রতিদিন আপনার দরজায়</span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-pretty text-ink-600 sm:text-lg">
            সকাল, দুপুর আর রাতের খাবার নিয়ে আর ভাবতে হবে না। একবার সাবস্ক্রাইব করুন —
            প্রতিদিন তাজা রান্না করা খাবার সময়মতো পৌঁছে যাবে।
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/order"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 hover:shadow-brand-600/30"
            >
              এখনই অর্ডার করুন
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="#weekly-menu"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-ink-300 bg-white px-7 py-3.5 text-base font-semibold text-ink-800 transition hover:border-ink-400 hover:bg-ink-50"
            >
              <Soup size={18} className="text-brand-600" />
              সাপ্তাহিক মেনু দেখুন
            </Link>
          </div>

          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-ink-200 pt-7">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <dt className="text-2xl font-bold text-ink-900 sm:text-3xl">
                  {bn(stat.value.toLocaleString('en-US'))}
                  <span className="text-brand-600">{stat.suffix}</span>
                </dt>
                <dd className="mt-1 text-xs text-ink-500 sm:text-sm">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Visual */}
        <div className="relative animate-rise [animation-delay:120ms]">
          <div className="relative aspect-4/3 overflow-hidden rounded-3xl shadow-lift ring-1 ring-ink-900/5">
            <Image
              src={heroImage}
              alt="FoodBox-এর তাজা রান্না করা খাবার"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              placeholder="blur"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-900/45 via-transparent to-transparent" />
          </div>

          {/* Floating proof cards — hidden on small screens where they would
              cover the photo instead of framing it. */}
          <div className="absolute -bottom-5 -left-3 hidden items-center gap-3 rounded-2xl bg-white p-3.5 shadow-lift sm:flex lg:-left-8">
            <span className="grid size-11 place-items-center rounded-xl bg-leaf-100 text-leaf-700">
              <Clock size={20} />
            </span>
            <span>
              <span className="block text-sm font-bold text-ink-900">সময়মতো ডেলিভারি</span>
              <span className="block text-xs text-ink-500">{bn(98)}% অন-টাইম রেট</span>
            </span>
          </div>

          <div className="absolute -top-4 -right-3 hidden items-center gap-3 rounded-2xl bg-white p-3.5 shadow-lift sm:flex lg:-right-6">
            <span className="grid size-11 place-items-center rounded-xl bg-brand-100 text-brand-700">
              <BadgeCheck size={20} />
            </span>
            <span>
              <span className="flex items-center gap-1 text-sm font-bold text-ink-900">
                {bn('4.8')}
                <Star size={13} className="fill-brand-500 text-brand-500" />
              </span>
              <span className="block text-xs text-ink-500">গ্রাহক রেটিং</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
