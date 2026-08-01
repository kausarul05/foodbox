'use client';

import { useEffect, useState } from 'react';
import { CalendarOff, Clock, MapPin } from 'lucide-react';
import { zoneAPI } from '@/lib/api';
import SectionHeading from '@/components/ui/SectionHeading';
import { MEAL_SLOTS, taka } from '@/lib/format';

interface Zone {
  _id: string;
  name: string;
  nameBn: string | null;
  deliveryCharge: number;
  isActive: boolean;
}

export default function DeliveryInfo() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await zoneAPI.getAllZones();
        if (!cancelled) setZones((res.data ?? []).filter((z: Zone) => z.isActive));
      } catch {
        if (!cancelled) setZones([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="border-y border-ink-200/70 bg-white py-16 md:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow="ডেলিভারি"
          title="কখন অর্ডার, কোথায় ডেলিভারি"
          subtitle="প্রতিটি বেলার জন্য অর্ডারের একটি শেষ সময় আছে — এর মধ্যে অর্ডার করলেই ডেলিভারি নিশ্চিত।"
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-5">
          {/* Cut-off windows */}
          <div className="lg:col-span-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-ink-500 uppercase">
              <Clock size={15} className="text-brand-600" />
              অর্ডারের সময়সীমা
            </h3>

            <div className="mt-4 space-y-3">
              {MEAL_SLOTS.map((slot) => (
                <div
                  key={slot.key}
                  className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-ink-200 bg-cream p-5 shadow-card"
                >
                  <div className="min-w-40 flex-1">
                    <p className="font-semibold text-ink-900">{slot.label}</p>
                    <p className="mt-0.5 text-sm text-ink-500">ডেলিভারি {slot.window}</p>
                  </div>
                  <div className="rounded-xl bg-brand-50 px-4 py-2.5 text-right">
                    <p className="text-[11px] font-medium text-brand-700">অর্ডারের শেষ সময়</p>
                    <p className="text-sm font-bold text-brand-800">{slot.cutoff}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 flex items-start gap-2.5 rounded-2xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
              <CalendarOff size={17} className="mt-0.5 shrink-0" />
              প্রতি মাসের ২য় ও শেষ শুক্রবার রান্নাঘর বন্ধ থাকে। এছাড়া বিশেষ দিনে ডেলিভারি বন্ধ
              থাকলে অর্ডার পেজে আগে থেকেই দেখানো হবে।
            </p>
          </div>

          {/* Zones */}
          <div className="lg:col-span-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-ink-500 uppercase">
              <MapPin size={15} className="text-brand-600" />
              ডেলিভারি জোন
            </h3>

            <div className="mt-4 rounded-2xl border border-ink-200 bg-cream shadow-card">
              {loading ? (
                <div className="animate-pulse space-y-3 p-5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-5 rounded bg-ink-200" />
                  ))}
                </div>
              ) : zones.length === 0 ? (
                <p className="p-6 text-center text-sm text-ink-500">জোনের তালিকা লোড করা যায়নি।</p>
              ) : (
                <ul className="max-h-96 divide-y divide-ink-100 overflow-y-auto">
                  {zones.map((zone) => (
                    <li key={zone._id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <span className="text-sm text-ink-800">{zone.nameBn || zone.name}</span>
                      <span className="shrink-0 text-xs font-semibold text-ink-500">
                        {zone.deliveryCharge === 0 ? 'ফ্রি' : taka(zone.deliveryCharge)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="mt-3 text-xs leading-relaxed text-ink-500">
              আপনার এলাকা তালিকায় নেই? অর্ডার করার সময় নতুন এলাকা যোগ করার অপশন পাবেন।
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
