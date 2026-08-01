'use client';

import { Phone } from 'lucide-react';

const SUPPORT_NUMBER = '01792695939';
const SUPPORT_TEL = '+8801792695939';

/**
 * Thin scrolling support strip. Sits at the top of the sticky header stack in
 * (site)/layout.tsx — it is no longer `fixed`, so pages need no top margin.
 *
 * The message is rendered four times: the marquee keyframe translates by -50%,
 * so an even number of copies loops seamlessly, and four copies guarantee the
 * strip stays filled on wide desktop viewports.
 */
function Message() {
  return (
    <span className="flex shrink-0 items-center gap-2 px-6 text-xs whitespace-nowrap sm:text-sm">
      <Phone size={14} className="shrink-0" aria-hidden />
      অর্ডার বা পেমেন্ট সংক্রান্ত যেকোনো সমস্যায় সরাসরি কল করুন
      <a href={`tel:${SUPPORT_TEL}`} className="font-semibold underline underline-offset-2 hover:no-underline">
        ০১৭৯২৬৯৫৯৩৯
      </a>
      <span aria-hidden className="text-white/50">•</span>
    </span>
  );
}

export default function NoticeBar() {
  return (
    <div className="group overflow-hidden bg-ink-900 py-2 text-white">
      {/* aria-hidden on the visual marquee; screen readers get the static copy. */}
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]" aria-hidden>
        <Message />
        <Message />
        <Message />
        <Message />
      </div>
      <span className="sr-only">
        অর্ডার বা পেমেন্ট সংক্রান্ত যেকোনো সমস্যায় কল করুন {SUPPORT_NUMBER}
      </span>
    </div>
  );
}
