'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Clock, Loader2, Phone, RefreshCw, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDialog } from '@/components/ui/DialogProvider';
import { bengaliDateTime, taka } from '@/lib/format';
import { isHandCash, paymentLabel } from '@/lib/payment';
import { transactionAPI } from '../../lib/api';

/**
 * Wallet top-ups waiting for an admin to check them — and nothing else.
 *
 * This page briefly listed subscription requests too, on the grounds that both
 * are money arriving by bKash. It made every new subscriber appear twice, once
 * here and once on পেন্ডিং সাবস্ক্রাইবার, and the figure it showed was the
 * subscription fee while the customer had actually sent the fee plus a week of
 * food money and the box deposit. One payment, one place: a joining payment is
 * approved on the subscriber screen, where its whole breakdown is visible, and
 * this screen is for top-ups from customers who are already subscribed.
 */

interface Payment {
  _id: string;
  userName: string;
  phoneNumber?: string;
  amount: number;
  paymentMethod: string;
  transactionId?: string;
  senderNumber?: string;
  createdAt: string;
}

interface ApiRow {
  _id: string;
  userName?: string;
  phoneNumber?: string;
  amount?: number;
  paymentMethod?: string;
  transactionId?: string;
  senderNumber?: string;
  createdAt?: string;
}

function toPayment(row: ApiRow): Payment {
  return {
    _id: row._id,
    userName: row.userName ?? '—',
    phoneNumber: row.phoneNumber,
    amount: Number(row.amount ?? 0),
    paymentMethod: row.paymentMethod ?? '',
    transactionId: row.transactionId,
    senderNumber: row.senderNumber,
    createdAt: row.createdAt ?? '',
  };
}

export default function PendingTransactionsPage() {
  const { promptText } = useDialog();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await transactionAPI.getPendingTransactions();
      const rows: ApiRow[] = (res?.success && res.data) || [];
      // Oldest first: whoever has waited longest is checked first.
      const out = rows
        .map(toPayment)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setPayments(out);
    } catch {
      toast.error('পেন্ডিং রিচার্জ লোড করা যায়নি');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPayments();
  }, [fetchPayments]);

  const handleApprove = async (p: Payment) => {
    try {
      setProcessingId(p._id);
      const res = await transactionAPI.approveTransaction(p._id);
      if (res.success) {
        toast.success('রিচার্জ অনুমোদন করা হয়েছে');
        setPayments((prev) => prev.filter((x) => x._id !== p._id));
      } else {
        toast.error(res.message || 'অনুমোদন ব্যর্থ হয়েছে');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'অনুমোদন ব্যর্থ হয়েছে');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (p: Payment) => {
    const reason = await promptText({
      title: 'রিচার্জ বাতিল করবেন?',
      message: 'গ্রাহক এই কারণটি দেখতে পাবেন, তাই স্পষ্ট করে লিখুন।',
      label: 'বাতিলের কারণ',
      placeholder: 'যেমন: এই ট্রানজেকশন আইডি পাওয়া যায়নি',
      required: true,
      confirmLabel: 'বাতিল করুন',
      cancelLabel: 'ফিরে যান',
      tone: 'danger',
    });
    if (reason === null) return;

    try {
      setProcessingId(p._id);
      const res = await transactionAPI.rejectTransaction(p._id, reason);
      if (res.success) {
        toast.success('বাতিল করা হয়েছে');
        setPayments((prev) => prev.filter((x) => x._id !== p._id));
      } else {
        toast.error(res.message || 'বাতিল ব্যর্থ হয়েছে');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'বাতিল ব্যর্থ হয়েছে');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">পেন্ডিং ট্রানজেকশন</h1>
          <p className="text-ink-500">
            ওয়ালেট রিচার্জের পেমেন্ট — যাচাই করে অনুমোদন দিন। নতুন সাবস্ক্রিপশনের পেমেন্ট আছে{' '}
            <span className="font-medium text-ink-700">পেন্ডিং সাবস্ক্রাইবার</span> পাতায়।
          </p>
        </div>
        <button
          onClick={() => void fetchPayments()}
          className="flex items-center gap-2 rounded-lg bg-ink-100 px-4 py-2 hover:bg-ink-200"
        >
          <RefreshCw size={18} />
          রিফ্রেশ
        </button>
      </div>

      {payments.length === 0 ? (
        <div className="rounded-2xl border border-ink-200 bg-white p-12 text-center shadow-card">
          <Clock className="mx-auto mb-4 h-16 w-16 text-ink-400" />
          <p className="text-ink-500">কোনো পেন্ডিং রিচার্জ নেই</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {payments.map((p) => {
            const busy = processingId === p._id;
            const cash = isHandCash(p.paymentMethod);

            return (
              <div key={p._id} className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <p className="font-semibold text-ink-900">{p.userName}</p>
                    {p.phoneNumber && (
                      <a
                        href={`tel:${p.phoneNumber}`}
                        className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-brand-700"
                      >
                        <Phone size={12} />
                        {p.phoneNumber}
                      </a>
                    )}
                    <p className="text-2xl font-bold text-brand-600">{taka(p.amount)}</p>
                    <p className="text-sm text-ink-500">অনুমোদন দিলে পুরো টাকাটা গ্রাহকের ওয়ালেটে যোগ হবে</p>
                    <p className="text-sm text-ink-500">
                      মাধ্যম: <span className="font-semibold text-ink-800">{paymentLabel(p.paymentMethod)}</span>
                    </p>
                    {cash ? (
                      <p className="text-sm font-medium text-amber-700">হাতে টাকা পাওয়ার পর অনুমোদন করুন</p>
                    ) : p.transactionId ? (
                      <p className="text-sm text-ink-500">
                        ট্রানজেকশন আইডি:{' '}
                        <span className="font-mono font-semibold break-all text-ink-900">{p.transactionId}</span>
                      </p>
                    ) : (
                      <p className="text-sm font-medium text-amber-700">ট্রানজেকশন আইডি দেওয়া হয়নি</p>
                    )}
                    {p.senderNumber && (
                      <p className="text-sm text-ink-500">
                        যে নাম্বার থেকে পাঠিয়েছেন: <span className="text-ink-800">{p.senderNumber}</span>
                      </p>
                    )}
                    {p.createdAt && <p className="text-xs text-ink-400">{bengaliDateTime(p.createdAt)}</p>}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => void handleApprove(p)}
                      disabled={busy}
                      className="flex items-center gap-2 rounded-lg bg-leaf-600 px-4 py-2 text-white hover:bg-leaf-700 disabled:opacity-60"
                    >
                      {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                      অনুমোদন
                    </button>
                    <button
                      onClick={() => void handleReject(p)}
                      disabled={busy}
                      className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      <XCircle size={16} />
                      বাতিল
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
