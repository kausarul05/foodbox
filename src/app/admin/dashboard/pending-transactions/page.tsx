'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, Clock, Loader2, Package, Phone, RefreshCw, Wallet, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDialog } from '@/components/ui/DialogProvider';
import { bengaliDateTime, bn, taka } from '@/lib/format';
import { isHandCash, paymentLabel } from '@/lib/payment';
import { subscriptionAPI, transactionAPI } from '../../lib/api';

/**
 * Every payment waiting for an admin to check it.
 *
 * Two kinds of money arrive by bKash / Nagad / Rocket / hand cash: wallet
 * top-ups (Transaction) and subscription requests (Subscription). This page
 * used to list only the first, so a subscriber's payment never showed up here
 * and could only be found on the pending-subscribers screen. Both now sit in
 * one list; approving goes through each kind's own route, exactly as before.
 */

type Kind = 'wallet' | 'subscription';

interface Payment {
  kind: Kind;
  _id: string;
  userName: string;
  phoneNumber?: string;
  amount: number;
  paymentMethod: string;
  transactionId?: string;
  senderNumber?: string;
  /** Subscription only — what is being paid for. */
  packageName?: string;
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
  packageName?: string;
  package?: string;
  createdAt?: string;
  requestedDate?: string;
}

const KIND_META: Record<Kind, { label: string; icon: typeof Wallet; pill: string }> = {
  wallet: { label: 'ওয়ালেট রিচার্জ', icon: Wallet, pill: 'bg-brand-100 text-brand-800' },
  subscription: { label: 'সাবস্ক্রিপশন', icon: Package, pill: 'bg-leaf-100 text-leaf-700' },
};

function toPayment(row: ApiRow, kind: Kind): Payment {
  return {
    kind,
    _id: row._id,
    userName: row.userName ?? '—',
    phoneNumber: row.phoneNumber,
    amount: Number(row.amount ?? 0),
    paymentMethod: row.paymentMethod ?? '',
    transactionId: row.transactionId,
    senderNumber: row.senderNumber,
    packageName: kind === 'subscription' ? row.packageName || row.package : undefined,
    createdAt: row.createdAt ?? row.requestedDate ?? '',
  };
}

export default function PendingTransactionsPage() {
  const { promptText } = useDialog();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | Kind>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    // Independent sources: one failing must not blank out the other.
    const [wallet, subs] = await Promise.allSettled([
      transactionAPI.getPendingTransactions(),
      subscriptionAPI.getPendingSubscriptions(),
    ]);

    const out: Payment[] = [];
    if (wallet.status === 'fulfilled' && wallet.value?.success) {
      for (const row of wallet.value.data ?? []) out.push(toPayment(row, 'wallet'));
    }
    if (subs.status === 'fulfilled' && subs.value?.success) {
      for (const row of subs.value.data ?? []) out.push(toPayment(row, 'subscription'));
    }
    if (wallet.status === 'rejected' || subs.status === 'rejected') {
      toast.error('কিছু পেমেন্ট লোড করা যায়নি');
    }

    // Oldest first: whoever has waited longest is checked first.
    out.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    setPayments(out);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchPayments();
  }, [fetchPayments]);

  const counts = useMemo(
    () => ({
      all: payments.length,
      wallet: payments.filter((p) => p.kind === 'wallet').length,
      subscription: payments.filter((p) => p.kind === 'subscription').length,
    }),
    [payments]
  );

  const visible = filter === 'all' ? payments : payments.filter((p) => p.kind === filter);
  const keyOf = (p: Payment) => `${p.kind}-${p._id}`;

  const handleApprove = async (p: Payment) => {
    try {
      setProcessingId(keyOf(p));
      const res =
        p.kind === 'wallet'
          ? await transactionAPI.approveTransaction(p._id)
          : await subscriptionAPI.approveSubscription(p._id);
      if (res.success) {
        toast.success(p.kind === 'wallet' ? 'রিচার্জ অনুমোদন করা হয়েছে' : 'সাবস্ক্রিপশন অনুমোদন করা হয়েছে');
        setPayments((prev) => prev.filter((x) => keyOf(x) !== keyOf(p)));
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
      title: p.kind === 'wallet' ? 'রিচার্জ বাতিল করবেন?' : 'সাবস্ক্রিপশন বাতিল করবেন?',
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
      setProcessingId(keyOf(p));
      const res =
        p.kind === 'wallet'
          ? await transactionAPI.rejectTransaction(p._id, reason)
          : await subscriptionAPI.rejectSubscription(p._id, reason);
      if (res.success) {
        toast.success('বাতিল করা হয়েছে');
        setPayments((prev) => prev.filter((x) => keyOf(x) !== keyOf(p)));
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

  const FILTERS: { key: 'all' | Kind; label: string; count: number }[] = [
    { key: 'all', label: 'সব', count: counts.all },
    { key: 'wallet', label: 'ওয়ালেট রিচার্জ', count: counts.wallet },
    { key: 'subscription', label: 'সাবস্ক্রিপশন', count: counts.subscription },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">পেন্ডিং ট্রানজেকশন</h1>
          <p className="text-ink-500">ওয়ালেট রিচার্জ ও সাবস্ক্রিপশনের পেমেন্ট — যাচাই করে অনুমোদন দিন</p>
        </div>
        <button
          onClick={() => void fetchPayments()}
          className="flex items-center gap-2 rounded-lg bg-ink-100 px-4 py-2 hover:bg-ink-200"
        >
          <RefreshCw size={18} />
          রিফ্রেশ
        </button>
      </div>

      <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-ink-100 p-1 sm:w-fit">
        {FILTERS.map((f) => {
          const active = f.key === filter;
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                active ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-600 hover:text-ink-900'
              }`}
            >
              {f.label}
              <span className={`ml-1.5 text-xs ${active ? 'text-brand-700' : 'text-ink-400'}`}>{bn(f.count)}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-ink-200 bg-white p-12 text-center shadow-card">
          <Clock className="mx-auto mb-4 h-16 w-16 text-ink-400" />
          <p className="text-ink-500">কোনো পেন্ডিং পেমেন্ট নেই</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {visible.map((p) => {
            const meta = KIND_META[p.kind];
            const KindIcon = meta.icon;
            const busy = processingId === keyOf(p);
            const cash = isHandCash(p.paymentMethod);

            return (
              <div key={keyOf(p)} className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.pill}`}
                    >
                      <KindIcon size={12} />
                      {meta.label}
                      {p.packageName && <span className="font-normal">· {p.packageName}</span>}
                    </span>
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
