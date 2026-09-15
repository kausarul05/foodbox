'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, Plus, Wallet, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { transactionAPI, walletAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import PaymentFields, { validatePayment, type PaymentDetails } from '@/components/ui/PaymentFields';
import { bengaliDate, bn, taka } from '@/lib/format';

interface Transaction {
  _id: string;
  amount: number;
  transactionId: string;
  paymentMethod: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

const MIN_RECHARGE = 50;
const QUICK_AMOUNTS = [200, 500, 1000, 2000];

const EMPTY_PAYMENT: PaymentDetails = { paymentMethod: 'bkash', transactionId: '', senderNumber: '' };

const STATUS = {
  pending: { label: 'পেন্ডিং', icon: Clock, className: 'bg-amber-100 text-amber-800' },
  approved: { label: 'অনুমোদিত', icon: CheckCircle2, className: 'bg-leaf-100 text-leaf-700' },
  rejected: { label: 'বাতিল', icon: XCircle, className: 'bg-red-100 text-red-700' },
} as const;

export default function WalletPage() {
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecharge, setShowRecharge] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [payment, setPayment] = useState<PaymentDetails>(EMPTY_PAYMENT);
  const [submitting, setSubmitting] = useState(false);

  const fetchWalletData = useCallback(async () => {
    try {
      const [wallet, txns] = await Promise.all([walletAPI.getBalance(), transactionAPI.getMyTransactions()]);
      if (wallet.success) setWalletBalance(wallet.data.balance);
      if (txns.success) setTransactions(txns.data);
    } catch {
      toast.error('ওয়ালেট ডাটা লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWalletData();
  }, [fetchWalletData]);

  const closeRecharge = () => {
    setShowRecharge(false);
    setRechargeAmount('');
    setPayment(EMPTY_PAYMENT);
  };

  const handleRecharge = async () => {
    const amount = Number(rechargeAmount);
    if (!amount || amount < MIN_RECHARGE) {
      toast.error(`ন্যূনতম ${bn(MIN_RECHARGE)} টাকা রিচার্জ করতে হবে`);
      return;
    }
    const problem = validatePayment(payment);
    if (problem) {
      toast.error(problem);
      return;
    }

    try {
      setSubmitting(true);
      const res = await transactionAPI.createRechargeRequest({
        amount,
        transactionId: payment.transactionId.trim(),
        paymentMethod: payment.paymentMethod,
      });

      if (res.success) {
        toast.success('রিচার্জ রিকোয়েস্ট পাঠানো হয়েছে! অ্যাডমিন অনুমোদনের অপেক্ষায়।');
        closeRecharge();
        await fetchWalletData();
      } else {
        toast.error(res.message || 'রিচার্জ রিকোয়েস্ট ব্যর্থ হয়েছে');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'রিচার্জ রিকোয়েস্ট ব্যর্থ হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-44 animate-pulse rounded-3xl bg-ink-100" />
        <div className="h-72 animate-pulse rounded-3xl bg-ink-100" />
      </div>
    );
  }

  const pendingTotal = transactions
    .filter((t) => t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-5">
      {/* Balance */}
      <section className="relative overflow-hidden rounded-3xl bg-ink-900 p-7 text-white shadow-card md:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_15%,rgb(249_115_22/0.35),transparent_50%)]"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="flex items-center gap-2 text-sm text-ink-300">
              <Wallet size={16} />
              বর্তমান ব্যালেন্স
            </p>
            <p className="mt-2 text-5xl font-bold tracking-tight">{taka(walletBalance)}</p>
            {pendingTotal > 0 && (
              <p className="mt-2 text-sm text-brand-300">{taka(pendingTotal)} অনুমোদনের অপেক্ষায়</p>
            )}
          </div>
          <Button size="lg" icon={<Plus size={18} />} onClick={() => setShowRecharge(true)}>
            রিচার্জ করুন
          </Button>
        </div>
      </section>

      {/* History */}
      <section className="rounded-3xl border border-ink-200 bg-white p-6 shadow-card">
        <h2 className="text-base font-bold text-ink-900">লেনদেনের ইতিহাস</h2>

        {transactions.length === 0 ? (
          <div className="py-14 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-ink-100 text-ink-400">
              <Wallet size={24} />
            </div>
            <p className="mt-4 font-semibold text-ink-800">কোনো লেনদেন নেই</p>
            <p className="mt-1 text-sm text-ink-500">প্রথম রিচার্জ করে শুরু করুন।</p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-ink-100">
            {transactions.map((tx) => {
              const status = STATUS[tx.status] ?? STATUS.pending;
              const StatusIcon = status.icon;
              return (
                <li key={tx._id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-ink-900">{taka(tx.amount)}</p>
                    <p className="mt-0.5 text-xs text-ink-500">{bengaliDate(tx.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden text-right sm:block">
                      <span className="block text-[11px] text-ink-400">ট্রানজেকশন আইডি</span>
                      <span className="block font-mono text-xs text-ink-600">{tx.transactionId}</span>
                    </span>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
                    >
                      <StatusIcon size={13} />
                      {status.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {showRecharge && (
        <Modal
          title="ওয়ালেট রিচার্জ"
          description="টাকা পাঠিয়ে ট্রানজেকশন আইডি দিন"
          busy={submitting}
          onClose={closeRecharge}
          footer={
            <Button fullWidth size="lg" loading={submitting} icon={<Plus size={18} />} onClick={handleRecharge}>
              {submitting ? 'পাঠানো হচ্ছে...' : 'রিকোয়েস্ট পাঠান'}
            </Button>
          }
        >
          <Field label="কত টাকা রিচার্জ করবেন?" htmlFor="amount" required hint={`ন্যূনতম ${bn(MIN_RECHARGE)} টাকা`}>
            <Input
              id="amount"
              type="number"
              inputMode="numeric"
              min={MIN_RECHARGE}
              step={10}
              value={rechargeAmount}
              onChange={(e) => setRechargeAmount(e.target.value)}
              placeholder="যেমন ৫০০"
            />
            <div className="mt-2.5 grid grid-cols-4 gap-2">
              {QUICK_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setRechargeAmount(String(amount))}
                  className={`rounded-full border py-2 text-sm font-medium transition ${
                    rechargeAmount === String(amount)
                      ? 'border-brand-500 bg-brand-50 text-brand-800'
                      : 'border-ink-200 text-ink-600 hover:border-ink-300'
                  }`}
                >
                  {taka(amount)}
                </button>
              ))}
            </div>
          </Field>

          <div className="mt-5 border-t border-ink-100 pt-5">
            <PaymentFields amount={Number(rechargeAmount) || undefined} value={payment} onChange={setPayment} />
          </div>

          <p className="mt-5 rounded-xl bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900">
            অ্যাডমিন অনুমোদনের পরেই ব্যালেন্স যোগ হবে। ভুল আইডি দিলে রিকোয়েস্ট বাতিল হয়ে যাবে।
          </p>
        </Modal>
      )}
    </div>
  );
}
