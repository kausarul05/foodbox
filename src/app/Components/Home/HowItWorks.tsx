import { CalendarCheck, PackageCheck, Truck, UserPlus } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';
import { bn } from '@/lib/format';

const STEPS = [
  {
    icon: UserPlus,
    title: 'অ্যাকাউন্ট খুলুন',
    body: 'নাম, ফোন নম্বর আর ঠিকানা দিয়ে এক মিনিটেই রেজিস্ট্রেশন সম্পন্ন করুন।',
  },
  {
    icon: PackageCheck,
    title: 'প্যাকেজ বাছুন',
    body: 'বেসিক, গোল্ডেন বা প্রিমিয়াম — আপনার প্রয়োজন অনুযায়ী প্যাকেজ সাবস্ক্রাইব করুন।',
  },
  {
    icon: CalendarCheck,
    title: 'খাবার সিলেক্ট করুন',
    body: 'প্রতিদিনের মেনু দেখে সকাল, দুপুর বা রাতের খাবার অর্ডার দিন।',
  },
  {
    icon: Truck,
    title: 'ডেলিভারি নিন',
    body: 'নির্ধারিত সময়ে গরম খাবার পৌঁছে যাবে আপনার দরজায়।',
  },
];

export default function HowItWorks() {
  return (
    <section className="border-y border-ink-200/70 bg-white py-16 md:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow="কীভাবে কাজ করে"
          title="চার ধাপে শুরু করুন"
          subtitle="প্রথমবার অর্ডার দিতে দুই মিনিটও লাগবে না।"
        />

        <ol className="relative mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {/* Connector line, desktop only — decorative, so it sits behind the
              numbered badges and is hidden from assistive tech. */}
          <span
            aria-hidden
            className="absolute top-7 right-[12.5%] left-[12.5%] hidden border-t-2 border-dashed border-brand-200 lg:block"
          />

          {STEPS.map((step, i) => (
            <li key={step.title} className="relative text-center lg:px-2">
              <span className="relative z-10 mx-auto grid size-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">
                <step.icon size={24} />
                <span className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full border-2 border-white bg-ink-900 text-[11px] font-bold">
                  {bn(i + 1)}
                </span>
              </span>
              <h3 className="mt-5 text-lg font-semibold text-ink-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
