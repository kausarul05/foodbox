import Link from 'next/link';
import { ArrowRight, Phone } from 'lucide-react';

export default function CtaBand() {
  return (
    <section className="bg-ink-900 py-16 md:py-20">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-3xl bg-brand-600 px-7 py-12 text-center md:px-14 md:py-16">
          {/* Decorative light wash, kept out of the accessibility tree. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgb(255_255_255/0.22),transparent_45%),radial-gradient(circle_at_85%_75%,rgb(255_255_255/0.16),transparent_40%)]"
          />

          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-balance text-white sm:text-4xl">
              আজকের রান্নার চিন্তা আজই শেষ করুন
            </h2>
            <p className="mt-4 text-base leading-relaxed text-pretty text-brand-50">
              এক মিনিটে অ্যাকাউন্ট খুলুন, প্যাকেজ বেছে নিন — কালকের খাবার আপনার দরজায়।
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-semibold text-brand-700 shadow-lg transition hover:bg-brand-50"
              >
                ফ্রি অ্যাকাউন্ট খুলুন
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="tel:+8801792695939"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-white/10"
              >
                <Phone size={17} />
                কল করে অর্ডার করুন
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
