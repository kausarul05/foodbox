import { ChevronDown } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';

/**
 * Native <details> rather than JS state — the accordion works without
 * hydration, is keyboard accessible for free, and keeps this a server component.
 */
const FAQS = [
  {
    q: 'সাবস্ক্রিপশন ছাড়া কি অর্ডার করা যাবে?',
    a: 'হ্যাঁ। একক অর্ডার করতে পারবেন ক্যাশ অন ডেলিভারিতে। তবে ওয়ালেট থেকে পেমেন্ট করতে হলে একটি সক্রিয় সাবস্ক্রিপশন থাকতে হবে।',
  },
  {
    q: 'অর্ডার বাতিল করলে টাকা ফেরত পাবো?',
    a: 'ওয়ালেট থেকে করা অর্ডার নির্ধারিত সময়ের আগে বাতিল করলে পুরো টাকা সঙ্গে সঙ্গে ওয়ালেটে ফেরত যায়। সময় পার হয়ে গেলে বাতিল করা যায় না।',
  },
  {
    q: 'ওয়ালেটে টাকা কীভাবে যোগ করবো?',
    a: 'বিকাশ বা নগদে টাকা পাঠিয়ে ট্রানজেকশন আইডি ড্যাশবোর্ডের ওয়ালেট পেজে জমা দিন। অ্যাডমিন যাচাই করে অনুমোদন দিলে ব্যালেন্স যোগ হয়ে যাবে।',
  },
  {
    q: 'একদিন খাবার না নিলে কি টাকা কাটবে?',
    a: 'না। আপনি প্রতিদিন আলাদা করে অর্ডার দেন, তাই যেদিন অর্ডার দেবেন না সেদিনের কোনো টাকা কাটা হবে না।',
  },
  {
    q: 'রান্নাঘর কোন দিন বন্ধ থাকে?',
    a: 'প্রতি মাসের ২য় ও শেষ শুক্রবার রান্নাঘর বন্ধ থাকে। এছাড়া বিশেষ কোনো দিন বন্ধ থাকলে অর্ডার পেজে আগেই জানিয়ে দেওয়া হয়।',
  },
  {
    q: 'অতিথির জন্য বাড়তি খাবার নেওয়া যাবে?',
    a: 'হ্যাঁ। গেস্ট মিল অপশন থেকে একই দিনের জন্য যত খুশি বাড়তি প্লেট যোগ করতে পারবেন — শুধু সেই বেলার শেষ সময়ের আগে অর্ডার দিন।',
  },
];

export default function Faq() {
  return (
    <section className="border-t border-ink-200/70 bg-white py-16 md:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow="জিজ্ঞাসা"
          title="সাধারণ কিছু প্রশ্ন"
          subtitle="উত্তর না পেলে সরাসরি কল করুন ০১৭৯২৬৯৫৯৩৯ নম্বরে।"
        />

        <div className="mx-auto mt-12 max-w-3xl divide-y divide-ink-200 overflow-hidden rounded-2xl border border-ink-200 shadow-card">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group bg-white open:bg-cream">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-[15px] font-semibold text-ink-900 transition-colors hover:text-brand-700">
                {faq.q}
                <ChevronDown
                  size={18}
                  className="shrink-0 text-ink-400 transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <p className="px-6 pb-5 text-sm leading-relaxed text-ink-600">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
