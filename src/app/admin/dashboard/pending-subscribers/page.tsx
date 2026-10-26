'use client';

import { bengaliDateNumeric, taka } from '@/lib/format';
import { BOX_DEPOSIT } from '@/lib/rules';
import { useDialog } from '@/components/ui/DialogProvider';
import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, UserPlus, Mail, Phone, MapPin, Loader2, RefreshCw, Package as PackageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { subscriptionAPI } from '@/app/admin/lib/api';

interface PendingSubscriber {
  _id: string;
  subscriptionId: string;
  userId: string;
  userName: string;
  phoneNumber: string;
  email: string;
  /** A package name from the database, not a fixed pair. */
  package: string;
  packageName: string;
  requestedDate: string;
  createdAt: string;
  address: string;
  zone: string;
  paymentMethod: string;
  transactionId?: string;
  senderNumber?: string;
  /** The subscription fee alone. */
  amount: number;
  /** What the customer sent: fee plus the joining food float. */
  paidAmount?: number;
  /** The float part, credited to their wallet when this is approved. */
  walletCredit?: number;
  status: string;
}

/**
 * Where the customer's money goes — the whole joining payment in one box.
 *
 * Joining is a single payment, so the figure to match against the bKash
 * statement is the total, not the subscription fee. The fee is the only part
 * that is earnings; the rest is credited to the customer's wallet on approval,
 * and ৳100 of that is held as the box deposit. Without this split on screen an
 * admin seeing "৳1,910" has no way to tell what they are actually approving.
 */
function PaymentBreakdown({ sub }: { sub: PendingSubscriber }) {
  // Older requests, made before joining became one payment, carry neither
  // field — then the fee is all there was.
  const sent = sub.paidAmount ?? sub.amount;
  const credit = sub.walletCredit ?? Math.max(0, sent - sub.amount);
  const deposit = credit > 0 ? Math.min(BOX_DEPOSIT, credit) : 0;
  const forFood = credit - deposit;

  return (
    <div className="mt-4 rounded-2xl border border-brand-200 bg-brand-50/60 p-4">
      <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">টাকার হিসাব</p>

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm text-ink-600">মোট পাঠিয়েছেন</span>
        <span className="text-2xl font-bold text-brand-700">{taka(sent)}</span>
      </div>

      <dl className="mt-3 space-y-2 border-t border-brand-200 pt-3 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-600">
            সাবস্ক্রিপশন ফি
            <span className="block text-xs text-ink-400">আপনার আয় — ফেরতযোগ্য নয়</span>
          </dt>
          <dd className="font-semibold text-ink-900">{taka(sub.amount)}</dd>
        </div>

        {credit > 0 && (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-600">
                ওয়ালেটে জমা হবে
                <span className="block text-xs text-ink-400">গ্রাহকের টাকা — আয় নয়</span>
              </dt>
              <dd className="font-semibold text-ink-900">{taka(credit)}</dd>
            </div>
            <div className="ml-4 flex items-baseline justify-between gap-3 border-l-2 border-brand-200 pl-3">
              <dt className="text-xs text-ink-500">বক্স জামানত — আটকে থাকবে</dt>
              <dd className="text-xs font-medium text-ink-700">{taka(deposit)}</dd>
            </div>
            <div className="ml-4 flex items-baseline justify-between gap-3 border-l-2 border-brand-200 pl-3">
              <dt className="text-xs text-ink-500">খাবারের জন্য খরচ করতে পারবেন</dt>
              <dd className="text-xs font-medium text-leaf-700">{taka(forFood)}</dd>
            </div>
          </>
        )}
      </dl>

      <p className="mt-3 border-t border-brand-200 pt-3 text-xs text-ink-500">
        {credit > 0
          ? `অনুমোদন দিলে ${taka(credit)} গ্রাহকের ওয়ালেটে যোগ হবে, তার মধ্যে ${taka(deposit)} বক্স জামানত হিসেবে আটকে থাকবে। আলাদা করে রিচার্জ অনুমোদন করার দরকার নেই।`
          : 'এটি শুধু সাবস্ক্রিপশন ফি — ওয়ালেটে কোনো টাকা যোগ হবে না। গ্রাহক পরে আলাদা করে রিচার্জ করবেন।'}
      </p>
    </div>
  );
}

export default function PendingSubscribersPage() {
  const { promptText } = useDialog();
  const [pendingSubscribers, setPendingSubscribers] = useState<PendingSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingSubscribers();
  }, []);

  const fetchPendingSubscribers = async () => {
    try {
      setLoading(true);
      const response = await subscriptionAPI.getPendingSubscriptions();
      console.log('Pending subscribers response:', response);
      
      if (response.success && response.data) {
        setPendingSubscribers(response.data);
      } else {
        setPendingSubscribers([]);
      }
    } catch (error) {
      console.error('Error fetching pending subscribers:', error);
      toast.error('পেন্ডিং সাবস্ক্রাইবার লোড করতে ব্যর্থ হয়েছে');
      setPendingSubscribers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      const response = await subscriptionAPI.approveSubscription(id);
      
      if (response.success) {
        toast.success('সাবস্ক্রিপশন অনুমোদন করা হয়েছে!');
        // Remove from list
        setPendingSubscribers(prev => prev.filter(sub => sub._id !== id));
      } else {
        toast.error(response.message || 'অনুমোদন করতে ব্যর্থ হয়েছে');
      }
    } catch (error: any) {
      console.error('Error approving subscription:', error);
      toast.error(error.message || 'অনুমোদন করতে ব্যর্থ হয়েছে');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = await promptText({
      title: 'সাবস্ক্রিপশন বাতিল করবেন?',
      message: 'গ্রাহক এই কারণটি দেখতে পাবেন, তাই স্পষ্ট করে লিখুন।',
      label: 'বাতিলের কারণ',
      placeholder: 'যেমন: ট্রানজেকশন আইডি মেলেনি',
      required: true,
      confirmLabel: 'বাতিল করুন',
      cancelLabel: 'ফিরে যান',
      tone: 'danger',
    });
    if (reason === null) return;
    
    try {
      setProcessingId(id);
      const response = await subscriptionAPI.rejectSubscription(id, reason);
      
      if (response.success) {
        toast.error('সাবস্ক্রিপশন বাতিল করা হয়েছে!');
        // Remove from list
        setPendingSubscribers(prev => prev.filter(sub => sub._id !== id));
      } else {
        toast.error(response.message || 'বাতিল করতে ব্যর্থ হয়েছে');
      }
    } catch (error: any) {
      console.error('Error rejecting subscription:', error);
      toast.error(error.message || 'বাতিল করতে ব্যর্থ হয়েছে');
    } finally {
      setProcessingId(null);
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch(method) {
      case 'bkash': return 'বিকাশ';
      case 'nagad': return 'নগদ';
      case 'rocket': return 'রকেট';
      case 'bank': return 'ব্যাংক';
      case 'cash': return 'হ্যান্ড ক্যাশ';
      default: return method;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand-600 animate-spin mx-auto mb-4" />
          <p className="text-ink-600">পেন্ডিং সাবস্ক্রাইবার লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">পেন্ডিং সাবস্ক্রাইবার</h1>
          <p className="text-ink-500 mt-1">অ্যাডমিন কনফার্মেশনের অপেক্ষায় থাকা সাবস্ক্রাইবার</p>
        </div>
        <button
          onClick={fetchPendingSubscribers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-lg transition"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          রিফ্রেশ
        </button>
      </div>

      {pendingSubscribers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-ink-200 shadow-card p-12 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <p className="text-ink-500 text-lg">কোনো পেন্ডিং সাবস্ক্রাইবার নেই</p>
          <p className="text-sm text-ink-400 mt-1">সমস্ত রিকোয়েস্ট প্রসেস করা হয়েছে</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {pendingSubscribers.map((sub) => (
            <div key={sub._id} className="bg-white rounded-2xl border border-ink-200 shadow-card overflow-hidden hover:shadow-xl transition-shadow">
              <div className="bg-brand-600 p-4 text-white">
                <div>
                  <h3 className="text-lg font-bold">{sub.userName}</h3>
                  <p className="text-sm text-white/80">
                    রিকোয়েস্ট: {bengaliDateNumeric(sub.createdAt)}
                  </p>
                </div>
                {/* Full-width buttons on a phone: side-by-side they shrink to
                    an unhittable size once the name wraps. */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleApprove(sub._id)}
                    disabled={processingId === sub._id}
                    className="flex items-center justify-center gap-2 rounded-lg bg-white py-2.5 font-semibold text-leaf-700 transition hover:bg-leaf-50 disabled:opacity-50"
                  >
                    {processingId === sub._id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    অনুমোদন
                  </button>
                  <button
                    onClick={() => handleReject(sub._id)}
                    disabled={processingId === sub._id}
                    className="flex items-center justify-center gap-2 rounded-lg bg-ink-900/25 py-2.5 font-semibold text-white transition hover:bg-ink-900/40 disabled:opacity-50"
                  >
                    {processingId === sub._id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                    বাতিল
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3">
                    <Phone size={18} className="text-ink-400" />
                    <div>
                      <p className="text-xs text-ink-500">ফোন নাম্বার</p>
                      <p className="font-medium text-ink-900">{sub.phoneNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail size={18} className="text-ink-400" />
                    <div>
                      <p className="text-xs text-ink-500">ইমেইল</p>
                      <p className="font-medium text-ink-900">{sub.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin size={18} className="text-ink-400" />
                    <div>
                      <p className="text-xs text-ink-500">জোন</p>
                      <p className="font-medium text-ink-900">{sub.zone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <PackageIcon size={18} className="text-ink-400" />
                    <div>
                      <p className="text-xs text-ink-500">প্যাকেজ</p>
                      {/* Packages are database rows, not a fixed golden/diamond pair. */}
                      <p className="font-semibold text-brand-700">{sub.packageName || sub.package}</p>
                    </div>
                  </div>
                </div>

                {/* The money, before the payment proof — it is the decision. */}
                <PaymentBreakdown sub={sub} />

                {/*
                  Payment proof. Without the transaction id on screen there is
                  nothing for the admin to check against their bKash statement,
                  so approving was really just trusting the request.
                */}
                <div className="mt-4 rounded-2xl bg-ink-50 p-4">
                  <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">পেমেন্ট যাচাই</p>
                  <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-ink-500">মাধ্যম</p>
                      <p className="font-medium text-ink-900 capitalize">
                        {getPaymentMethodText(sub.paymentMethod)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-500">ট্রানজেকশন আইডি</p>
                      {sub.transactionId ? (
                        <p className="font-mono text-sm font-semibold break-all text-ink-900">
                          {sub.transactionId}
                        </p>
                      ) : (
                        <p className="text-sm font-medium text-amber-700">
                          {sub.paymentMethod === 'cash' ? 'লাগবে না — হাতে টাকা' : 'দেওয়া হয়নি'}
                        </p>
                      )}
                    </div>
                    {sub.senderNumber && (
                      <div>
                        <p className="text-xs text-ink-500">যে নাম্বার থেকে</p>
                        <p className="font-mono text-sm text-ink-900">{sub.senderNumber}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-ink-500">সাবস্ক্রিপশন আইডি</p>
                      <p className="font-mono text-sm text-ink-900">{sub.subscriptionId}</p>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-ink-200 pt-3">
                    <p className="text-xs text-ink-500">ঠিকানা</p>
                    <p className="text-sm text-ink-900">{sub.address}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}