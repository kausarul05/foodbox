import { Mail, MapPin, Phone } from 'lucide-react';
import { bengaliDate, bn } from '@/lib/format';

/**
 * Shared layout for the Terms & Conditions and Privacy Policy pages.
 *
 * Both are the same shape — numbered sections of paragraphs and bullet lists —
 * so the content lives in each page as plain data and the typography, the
 * numbering and the contact block live here, once. Server component: nothing
 * on these pages needs the browser.
 */

export interface LegalSection {
  /** Anchor for the contents list. */
  id: string;
  title: string;
  paragraphs?: string[];
  /** A bulleted list, shown after the paragraphs. */
  items?: string[];
  /** A closing paragraph, shown after the list. */
  after?: string;
}

/** Same details the footer shows. */
const CONTACT = {
  phone: '+8801410906862',
  email: 'ain19951995@gmail.com',
  address: 'Mile Quarter, Academic Road, Mymensingh Sadar',
};

export default function LegalDocument({
  updated,
  intro,
  sections,
}: {
  /** YYYY-MM-DD of the last change to the text. */
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  const contactNumber = sections.length + 1;

  return (
    <div className="container-page py-12 md:py-16">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[15rem_1fr]">
        {/* Contents — a sticky rail on desktop, a collapsed list on a phone. */}
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <details className="rounded-2xl border border-ink-200 bg-white p-4 shadow-card lg:hidden">
            <summary className="cursor-pointer text-sm font-semibold text-ink-900">এই পাতার সূচি</summary>
            <Contents sections={sections} contactNumber={contactNumber} />
          </details>
          <nav aria-label="সূচি" className="hidden lg:block">
            <p className="text-xs font-semibold tracking-wide text-ink-500">সূচি</p>
            <Contents sections={sections} contactNumber={contactNumber} />
          </nav>
        </aside>

        <article className="min-w-0">
          <p className="inline-flex rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-600">
            সর্বশেষ হালনাগাদ: {bengaliDate(updated)}
          </p>
          <p className="mt-5 text-[15px] leading-relaxed text-ink-700">{intro}</p>

          <div className="mt-10 space-y-10">
            {sections.map((section, i) => (
              <section key={section.id} id={section.id} className="scroll-mt-32">
                <h2 className="text-xl font-bold text-ink-900">
                  <span className="mr-2 text-brand-600">{bn(i + 1)}.</span>
                  {section.title}
                </h2>
                {section.paragraphs?.map((p) => (
                  <p key={p} className="mt-3 text-[15px] leading-relaxed text-ink-700">
                    {p}
                  </p>
                ))}
                {section.items && (
                  <ul className="mt-3 space-y-2.5">
                    {section.items.map((item) => (
                      <li key={item} className="flex gap-3 text-[15px] leading-relaxed text-ink-700">
                        <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {section.after && (
                  <p className="mt-3 rounded-xl bg-brand-50 p-3.5 text-sm leading-relaxed text-brand-900">
                    {section.after}
                  </p>
                )}
              </section>
            ))}

            <section id="contact" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-ink-900">
                <span className="mr-2 text-brand-600">{bn(contactNumber)}.</span>
                যোগাযোগ
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-700">
                এই পাতা নিয়ে কোনো প্রশ্ন থাকলে বা কোনো অনুরোধ জানাতে চাইলে আমাদের সাথে যোগাযোগ করুন।
              </p>
              <div className="mt-4 space-y-3 rounded-2xl border border-ink-200 bg-white p-5 text-sm shadow-card">
                <a href={`tel:${CONTACT.phone}`} className="flex items-center gap-3 text-ink-800 hover:text-brand-700">
                  <Phone size={16} className="shrink-0 text-brand-600" />
                  {CONTACT.phone}
                </a>
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="flex items-center gap-3 break-all text-ink-800 hover:text-brand-700"
                >
                  <Mail size={16} className="shrink-0 text-brand-600" />
                  {CONTACT.email}
                </a>
                <p className="flex items-start gap-3 text-ink-700">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-brand-600" />
                  {CONTACT.address}
                </p>
              </div>
            </section>
          </div>
        </article>
      </div>
    </div>
  );
}

function Contents({ sections, contactNumber }: { sections: LegalSection[]; contactNumber: number }) {
  return (
    <ol className="mt-3 space-y-1.5 text-sm">
      {sections.map((s, i) => (
        <li key={s.id}>
          <a href={`#${s.id}`} className="flex gap-2 text-ink-600 transition-colors hover:text-brand-700">
            <span className="shrink-0 text-ink-400">{bn(i + 1)}.</span>
            {s.title}
          </a>
        </li>
      ))}
      <li>
        <a href="#contact" className="flex gap-2 text-ink-600 transition-colors hover:text-brand-700">
          <span className="shrink-0 text-ink-400">{bn(contactNumber)}.</span>
          যোগাযোগ
        </a>
      </li>
    </ol>
  );
}
