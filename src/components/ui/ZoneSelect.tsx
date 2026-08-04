'use client';

import { useEffect, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { zoneAPI } from '@/lib/api';
import { taka, zoneLabel } from '@/lib/format';
import Button from './Button';
import { Field, Input, Select } from './Field';
import Modal from './Modal';

interface Zone {
  _id: string;
  /** Lowercase English slug — the unique key, not for display. */
  name: string;
  /** Bengali label shown to the customer. */
  nameBn?: string | null;
  deliveryCharge: number;
  isActive: boolean;
}

interface ZoneSelectProps {
  value: string;
  onChange: (value: string, customZoneName?: string) => void;
  onZoneData?: (zone: Zone | null) => void;
  className?: string;
  required?: boolean;
  /** Ties the control to the caller's own <Field label>. */
  id?: string;
}

/**
 * Zone picker. The caller supplies the label (via <Field>), so this renders the
 * control only — that keeps the label markup identical to every other field.
 */
export default function ZoneSelect({
  value,
  onChange,
  onZoneData,
  className = '',
  required = false,
  id = 'zone',
}: ZoneSelectProps) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherZoneName, setOtherZoneName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await zoneAPI.getAllZones();
        if (!cancelled && response.success) {
          setZones(response.data.filter((zone: Zone) => zone.isActive));
        }
      } catch {
        if (!cancelled) toast.error('জোন লোড করতে ব্যর্থ হয়েছে');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshZones = async () => {
    try {
      const response = await zoneAPI.getAllZones();
      if (response.success) setZones(response.data.filter((zone: Zone) => zone.isActive));
    } catch {
      /* the list we already have is still usable */
    }
  };

  const handleZoneChange = (selectedValue: string) => {
    if (selectedValue === 'other') {
      setShowOtherInput(true);
      onChange('', '');
      return;
    }
    setShowOtherInput(false);
    setOtherZoneName('');
    onChange(selectedValue, '');
    onZoneData?.(zones.find((z) => z._id === selectedValue) ?? null);
  };

  const handleOtherZoneSubmit = async () => {
    if (!otherZoneName.trim()) {
      toast.error('দয়া করে আপনার এলাকার নাম দিন');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await zoneAPI.createZone({ name: otherZoneName });
      if (response.success) {
        toast.success('আপনার এলাকা যোগ করা হয়েছে! অ্যাডমিন অনুমোদনের পর এটি সক্রিয় হবে।');
        // The new zone is inactive until an admin approves it, so it will not
        // come back in the list yet — hold it locally with a temporary id.
        onChange(`custom_${Date.now()}`, otherZoneName);
        setShowOtherInput(false);
        await refreshZones();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'জোন যোগ করতে ব্যর্থ হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[3.25rem] items-center justify-center rounded-xl border border-ink-200 bg-ink-50">
        <Loader2 className="size-5 animate-spin text-ink-400" />
      </div>
    );
  }

  return (
    <>
      <Select
        id={id}
        icon={MapPin}
        value={value && !value.startsWith('custom_') ? value : ''}
        onChange={(e) => handleZoneChange(e.target.value)}
        className={className}
        required={required && !showOtherInput && !value}
      >
        <option value="">সিলেক্ট করুন</option>
        {zones.map((zone) => (
          <option key={zone._id} value={zone._id}>
            {zoneLabel(zone)} — ডেলিভারি {zone.deliveryCharge > 0 ? taka(zone.deliveryCharge) : 'ফ্রি'}
          </option>
        ))}
        <option value="other">+ অন্যান্য (আমার এলাকা এখানে নেই)</option>
      </Select>

      {value.startsWith('custom_') && (
        <p className="mt-1.5 text-xs text-leaf-700">
          আপনার এলাকা যোগ করা হয়েছে, অ্যাডমিন অনুমোদনের অপেক্ষায়।
        </p>
      )}

      {showOtherInput && (
        <Modal
          title="আপনার এলাকা যোগ করুন"
          description="তালিকায় না থাকলে নিজে যোগ করুন"
          busy={isSubmitting}
          onClose={() => {
            setShowOtherInput(false);
            setOtherZoneName('');
          }}
          footer={
            <Button fullWidth size="lg" loading={isSubmitting} onClick={handleOtherZoneSubmit}>
              {isSubmitting ? 'যোগ হচ্ছে...' : 'এলাকা যোগ করুন'}
            </Button>
          }
        >
          <Field
            label="আপনার এলাকার নাম"
            htmlFor="other-zone"
            required
            hint="উদাহরণ: Bashundhara, Paltan, Motijheel, Mohammadpur"
          >
            <Input
              id="other-zone"
              icon={MapPin}
              value={otherZoneName}
              onChange={(e) => setOtherZoneName(e.target.value)}
              placeholder="যেমন: Bashundhara"
              autoFocus
            />
          </Field>

          <p className="mt-4 rounded-xl bg-brand-50 p-3.5 text-xs leading-relaxed text-brand-900">
            এলাকাটি অ্যাডমিন অনুমোদনের পর সবার জন্য চালু হবে। আপনি এখনই রেজিস্ট্রেশন শেষ করতে পারবেন।
          </p>
        </Modal>
      )}
    </>
  );
}

export type { Zone };
