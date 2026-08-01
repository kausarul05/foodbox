import { Quote, Star } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';
import { bn } from '@/lib/format';

/**
 * Placeholder copy. Replace with real reviews before launch — a Review model
 * and /api/reviews route do not exist yet, so these are hard-coded on purpose.
 */
const REVIEWS = [
  {
    name: 'সাদিয়া আফরিন',
    role: 'শিক্ষার্থী, ময়মনসিংহ',
    rating: 5,
    body: 'হোস্টেলে থেকে প্রতিদিন রান্নার ঝামেলা ছিল। এখন সকালে উঠে শুধু অর্ডার দিই, দুপুরের মধ্যে খাবার চলে আসে।',
  },
  {
    name: 'রাকিবুল হাসান',
    role: 'ব্যাংক কর্মকর্তা',
    rating: 5,
    body: 'অফিসে দুপুরের খাবার নিয়ে আর ভাবতে হয় না। স্বাদ একদম বাসার মতো, আর দামও সাশ্রয়ী।',
  },
  {
    name: 'নুসরাত জাহান',
    role: 'গৃহিণী',
    rating: 4,
    body: 'অতিথি এলে গেস্ট মিল অপশনটা দারুণ কাজে দেয়। কয়েক ক্লিকেই বাড়তি খাবার অর্ডার করা যায়।',
  },
];

export default function Testimonials() {
  return (
    <section className="py-16 md:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow="গ্রাহকদের কথা"
          title="যারা প্রতিদিন আমাদের সাথে খাচ্ছেন"
        />

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {REVIEWS.map((review) => (
            <figure
              key={review.name}
              className="relative flex h-full flex-col rounded-2xl border border-ink-200 bg-white p-7 shadow-card"
            >
              <Quote size={36} className="absolute top-6 right-6 text-brand-100" aria-hidden />

              <div className="flex gap-0.5" aria-label={`${review.rating} স্টার`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    size={15}
                    className={i < review.rating ? 'fill-brand-500 text-brand-500' : 'text-ink-300'}
                  />
                ))}
              </div>

              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-ink-700">
                {review.body}
              </blockquote>

              <figcaption className="mt-6 flex items-center gap-3 border-t border-ink-100 pt-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {review.name.charAt(0)}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink-900">{review.name}</span>
                  <span className="block text-xs text-ink-500">{review.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-ink-500">
          {bn(1200)}+ গ্রাহকের গড় রেটিং <span className="font-semibold text-ink-900">{bn('4.8')}/{bn(5)}</span>
        </p>
      </div>
    </section>
  );
}
