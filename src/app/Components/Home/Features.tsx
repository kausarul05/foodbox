import { CalendarX2, ChefHat, HandCoins, ShieldCheck, Users, Wallet } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';

const FEATURES = [
  {
    icon: ChefHat,
    title: 'ঘরোয়া রান্না',
    body: 'প্রতিদিন সকালে তাজা বাজার, ঘরের মতো মসলা — কোনো প্রিজারভেটিভ নেই।',
  },
  {
    icon: Wallet,
    title: 'ওয়ালেট সিস্টেম',
    body: 'একবার রিচার্জ করে রাখুন, প্রতিদিন এক ট্যাপেই অর্ডার। বাতিল করলে টাকা ফেরত।',
  },
  {
    icon: CalendarX2,
    title: 'যেকোনো দিন বন্ধ',
    body: 'বাইরে যাচ্ছেন? নির্দিষ্ট সময়ের আগে অর্ডার বাতিল করলে পুরো টাকা ফেরত পাবেন।',
  },
  {
    icon: Users,
    title: 'গেস্ট মিল',
    body: 'হঠাৎ অতিথি এসেছে? একই দিনে বাড়তি মিল যোগ করে নিন কয়েক সেকেন্ডে।',
  },
  {
    icon: HandCoins,
    title: 'স্বচ্ছ দাম',
    body: 'প্রতিটি আইটেমের দাম মেনুতেই লেখা। কোনো লুকানো চার্জ নেই।',
  },
  {
    icon: ShieldCheck,
    title: 'নিরাপদ প্যাকেজিং',
    body: 'ফুড-গ্রেড কনটেইনার আর সিল করা ডেলিভারি ব্যাগে খাবার পৌঁছায়।',
  },
];

export default function Features() {
  return (
    <section className="py-16 md:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow="কেন FoodBox"
          title="প্রতিদিনের খাবার নিয়ে দুশ্চিন্তা শেষ"
          subtitle="আমরা শুধু খাবার পৌঁছে দিই না — পুরো রুটিনটাই সহজ করে দিই।"
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="group rounded-2xl border border-ink-200 bg-white p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift"
            >
              <span className="grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                <feature.icon size={22} />
              </span>
              <h3 className="mt-5 text-lg font-semibold text-ink-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{feature.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
