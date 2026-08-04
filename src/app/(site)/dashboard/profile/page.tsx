'use client';

import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { CalendarCheck, Home, Package, Pencil, Phone, Save, User, Wallet, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI, subscriptionAPI, zoneAPI } from '@/lib/api';
import Button, { buttonClass } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import ZoneSelect from '@/components/ui/ZoneSelect';
import { bengaliDate, taka, zoneLabel } from '@/lib/format';
import { displayName, saveSessionUser, useSession, type SessionUser } from '@/lib/useSession';

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

interface Subscription {
  package?: string;
  packageName?: string;
  status: string;
  endDate: string;
}

/** One label/value row in the read-only view. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-ink-100 py-3.5 last:border-0 last:pb-0">
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className="mt-1 font-medium break-words text-ink-900">{value || '—'}</dd>
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: typeof User; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-ink-200 bg-white p-6 shadow-card">
      <h2 className="flex items-center gap-2 text-base font-bold text-ink-900">
        <Icon size={18} className="text-brand-600" />
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function ProfilePage() {
  const { user } = useSession();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [zoneName, setZoneName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editForm, setEditForm] = useState({ fullName: '', phoneNumber: '', zone: '', address: '' });

  const userZone = user?.zone ?? '';

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // The stored zone is sometimes an id and sometimes an already-resolved
      // name, depending on how the account was created.
      let resolvedZone = userZone;
      if (OBJECT_ID.test(userZone)) {
        try {
          const res = await zoneAPI.getZoneById(userZone);
          if (res.success && res.data) resolvedZone = zoneLabel(res.data);
        } catch {
          /* fall back to showing the raw value */
        }
      }

      let activeSub: Subscription | null = null;
      let balance = 0;
      try {
        const res = await subscriptionAPI.getMySubscriptions();
        if (res.success && res.data) {
          activeSub = res.data.find((s: Subscription) => s.status === 'active') ?? null;
          balance = res.walletBalance ?? 0;
        }
      } catch {
        if (!cancelled) toast.error('প্রোফাইল লোড করতে ব্যর্থ হয়েছে');
      }

      if (cancelled) return;
      setZoneName(resolvedZone);
      setSubscription(activeSub);
      setWalletBalance(balance);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userZone, refreshKey]);

  const startEditing = () => {
    setEditForm({
      fullName: user?.fullName ?? '',
      phoneNumber: user?.phoneNumber ?? '',
      zone: userZone,
      address: user?.address ?? '',
    });
    setIsEditing(true);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    if (!editForm.fullName) return toast.error('দয়া করে আপনার নাম দিন');
    if (!editForm.phoneNumber) return toast.error('দয়া করে ফোন নাম্বার দিন');
    if (!editForm.zone) return toast.error('দয়া করে জোন সিলেক্ট করুন');
    if (!editForm.address) return toast.error('দয়া করে ঠিকানা দিন');

    try {
      setSaving(true);
      const res = await authAPI.updateUserProfile(editForm);
      if (!res.success) {
        toast.error(res.message || 'আপডেট করতে ব্যর্থ হয়েছে');
        return;
      }

      const updated: SessionUser = { ...user, ...editForm };
      saveSessionUser(updated);
      toast.success('প্রোফাইল আপডেট করা হয়েছে!');
      setIsEditing(false);
      setRefreshKey((k) => k + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'প্রোফাইল আপডেট করতে ব্যর্থ হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-24 animate-pulse rounded-3xl bg-ink-100" />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="h-64 animate-pulse rounded-3xl bg-ink-100" />
          <div className="h-64 animate-pulse rounded-3xl bg-ink-100" />
        </div>
      </div>
    );
  }

  const packageLabel = subscription?.packageName || subscription?.package || '';

  return (
    <div className="space-y-5">
      {/* Header + wallet */}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-ink-200 bg-white p-6 shadow-card">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">প্রোফাইল</h1>
          <p className="mt-1 text-sm text-ink-500">{displayName(user)} — আপনার ব্যক্তিগত তথ্য</p>
        </div>
        {!isEditing && (
          <Button variant="secondary" icon={<Pencil size={15} />} onClick={startEditing}>
            এডিট করুন
          </Button>
        )}
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        <Card title="ব্যক্তিগত তথ্য" icon={User}>
          {isEditing ? (
            <div className="space-y-4">
              <Field label="পূর্ণ নাম" htmlFor="fullName" required>
                <Input
                  id="fullName"
                  name="fullName"
                  icon={User}
                  value={editForm.fullName}
                  onChange={handleChange}
                  placeholder="আপনার নাম"
                />
              </Field>
              <Field label="জোন / এলাকা" htmlFor="zone" required>
                <ZoneSelect
                  id="zone"
                  value={editForm.zone}
                  onChange={(zoneId) => setEditForm((prev) => ({ ...prev, zone: zoneId }))}
                  required
                />
              </Field>
            </div>
          ) : (
            <dl>
              <Row label="পূর্ণ নাম" value={displayName(user)} />
              <Row label="ইমেইল" value={user?.email ?? ''} />
              <Row label="জোন / এলাকা" value={zoneName} />
            </dl>
          )}
        </Card>

        <Card title="যোগাযোগ ও ঠিকানা" icon={Phone}>
          {isEditing ? (
            <div className="space-y-4">
              <Field label="ফোন নাম্বার" htmlFor="phoneNumber" required>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  icon={Phone}
                  type="tel"
                  inputMode="tel"
                  value={editForm.phoneNumber}
                  onChange={handleChange}
                  placeholder="01XXXXXXXXX"
                />
              </Field>
              <Field label="ডেলিভারি ঠিকানা" htmlFor="address" required>
                <Textarea
                  id="address"
                  name="address"
                  icon={Home}
                  rows={3}
                  value={editForm.address}
                  onChange={handleChange}
                  placeholder="বাসা / রোড / এলাকা"
                />
              </Field>
            </div>
          ) : (
            <dl>
              <Row label="ফোন নাম্বার" value={user?.phoneNumber ?? ''} />
              <Row label="ডেলিভারি ঠিকানা" value={user?.address ?? ''} />
            </dl>
          )}
        </Card>
      </div>

      {isEditing && (
        <div className="flex justify-end gap-3">
          <Button variant="secondary" size="lg" icon={<X size={16} />} onClick={() => setIsEditing(false)} disabled={saving}>
            বাতিল
          </Button>
          <Button size="lg" icon={<Save size={16} />} loading={saving} onClick={handleSave}>
            {saving ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
          </Button>
        </div>
      )}

      {/* Wallet + subscription status */}
      <div className="grid gap-5 md:grid-cols-2">
        <section className="flex flex-col justify-between rounded-3xl bg-ink-900 p-6 text-white shadow-card">
          <div className="flex items-center gap-2 text-sm text-ink-300">
            <Wallet size={17} />
            ওয়ালেট ব্যালেন্স
          </div>
          <p className="mt-3 text-4xl font-bold tracking-tight">{taka(walletBalance)}</p>
          <Link href="/dashboard/wallet" className={buttonClass('primary', 'md', 'mt-6 w-full')}>
            রিচার্জ করুন
          </Link>
        </section>

        <section
          className={`rounded-3xl border p-6 shadow-card ${
            subscription ? 'border-leaf-200 bg-leaf-50' : 'border-brand-200 bg-brand-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`grid size-9 place-items-center rounded-xl ${
                subscription ? 'bg-leaf-600 text-white' : 'bg-brand-600 text-white'
              }`}
            >
              {subscription ? <CalendarCheck size={18} /> : <Package size={18} />}
            </span>
            <h2 className="text-base font-bold text-ink-900">
              {subscription ? 'সাবস্ক্রিপশন চালু আছে' : 'কোনো সাবস্ক্রিপশন নেই'}
            </h2>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-ink-700">
            {subscription
              ? `${packageLabel} — ${bengaliDate(subscription.endDate)} পর্যন্ত বৈধ।`
              : 'ওয়ালেট থেকে অর্ডার করতে হলে একটি সক্রিয় সাবস্ক্রিপশন লাগবে।'}
          </p>

          {!subscription && (
            <Link href="/subscription" className={buttonClass('primary', 'md', 'mt-5')}>
              <Package size={16} />
              সাবস্ক্রাইব করুন
            </Link>
          )}
        </section>
      </div>
    </div>
  );
}
