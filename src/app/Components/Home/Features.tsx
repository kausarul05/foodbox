import { CalendarX2, ChefHat, HandCoins, ShieldCheck, Users, Wallet } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';

/**
 * Each card carries its own accent so the grid reads as six distinct promises
 * rather than one grey block.
 *
 * NOTE: these are illustrated with colour + iconography, not photographs —
 * the project ships only a logo and one banner image, and repeating the banner
 * six times would look worse than no photo at all. To use real food photos,
 * drop them in /public/Images and give each entry an `image` path; the card
 * already reserves the space for one.
 */
const FEATURES = [
  {
    icon: ChefHat,
    title: 'ঘরোয়া রান্না',
    body: 'প্রতিদিন সকালে তাজা বাজার, ঘরের মতো মসলা — কোনো প্রিজারভেটিভ নেই।',
    ring: 'group-hover:border-orange-200',
    wash: 'from-orange-100 to-amber-50',
    chip: 'bg-orange-500 text-white',
  },
  {
    icon: Wallet,
    title: 'ওয়ালেট সিস্টেম',
    body: 'একবার রিচার্জ করে রাখুন, প্রতিদিন এক ট্যাপেই অর্ডার। বাতিল করলে টাকা ফেরত।',
    ring: 'group-hover:border-emerald-200',
    wash: 'from-emerald-100 to-teal-50',
    chip: 'bg-emerald-600 text-white',
  },
  {
    icon: CalendarX2,
    title: 'যেকোনো দিন বন্ধ',
    body: 'বাইরে যাচ্ছেন? নির্দিষ্ট সময়ের আগে অর্ডার বাতিল করলে পুরো টাকা ফেরত পাবেন।',
    ring: 'group-hover:border-sky-200',
    wash: 'from-sky-100 to-cyan-50',
    chip: 'bg-sky-600 text-white',
  },
  {
    icon: Users,
    title: 'গেস্ট মিল',
    body: 'হঠাৎ অতিথি এসেছে? একই দিনে বাড়তি মিল যোগ করে নিন কয়েক সেকেন্ডে।',
    ring: 'group-hover:border-violet-200',
    wash: 'from-violet-100 to-purple-50',
    chip: 'bg-violet-600 text-white',
  },
  {
    icon: HandCoins,
    title: 'স্বচ্ছ দাম',
    body: 'প্রতিটি আইটেমের দাম মেনুতেই লেখা। কোনো লুকানো চার্জ নেই।',
    ring: 'group-hover:border-rose-200',
    wash: 'from-rose-100 to-pink-50',
    chip: 'bg-rose-600 text-white',
  },
  {
    icon: ShieldCheck,
    title: 'নিরাপদ প্যাকেজিং',
    body: 'ফুড-গ্রেড কনটেইনার আর সিল করা ডেলিভারি ব্যাগে খাবার পৌঁছায়।',
    ring: 'group-hover:border-indigo-200',
    wash: 'from-indigo-100 to-blue-50',
    chip: 'bg-indigo-600 text-white',
  },
];

export default function Features() {
  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      {/* Soft wash so the section separates from the plain cream above it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgb(249_115_22/0.07),transparent_40%),radial-gradient(circle_at_88%_92%,rgb(99_102_241/0.07),transparent_40%)]"
      />

      <div className="relative container-page">
        <SectionHeading
          eyebrow="কেন FoodBox"
          title="প্রতিদিনের খাবার নিয়ে দুশ্চিন্তা শেষ"
          subtitle="আমরা শুধু খাবার পৌঁছে দিই না — পুরো রুটিনটাই সহজ করে দিই।"
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className={`group relative overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-card transition duration-300 hover:-translate-y-1.5 hover:shadow-lift ${feature.ring}`}
            >
              {/* Illustrated header — replace with an <Image> when photos exist. */}
              <div className={`relative h-28 bg-gradient-to-br ${feature.wash}`}>
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_1px_1px,rgb(255_255_255/0.9)_1px,transparent_0)] [background-size:14px_14px]"
                />
                <feature.icon
                  size={92}
                  strokeWidth={1.1}
                  aria-hidden
                  className="absolute -right-3 -bottom-4 text-ink-900/10"
                />
                <span
                  className={`absolute bottom-0 left-6 grid size-14 translate-y-1/2 place-items-center rounded-2xl shadow-lg ring-4 ring-white ${feature.chip}`}
                >
                  <feature.icon size={24} />
                </span>
              </div>

              <div className="px-6 pt-11 pb-6">
                <h3 className="text-lg font-bold text-ink-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{feature.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
