'use client';

import { useState } from 'react';
import { Check, Copy, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import { Field, Input } from './Field';
import { PAYMENT_CHANNELS, channelByValue, MIN_TRANSACTION_ID_LENGTH } from '@/lib/payment';
import { bn, taka } from '@/lib/format';

/**
 * "Send money to this number, then give us the transaction id."
 *
 * Shared by the wallet top-up and the subscription request so both describe the
 * same, real process. The subscription flow previously just asked which payment
 * method you preferred and submitted — it never told the customer where to send
 * money or collected proof, so an admin had a request with nothing to verify.
 */
export interface PaymentDetails {
  paymentMethod: string;
  transactionId: string;
  senderNumber: string;
}

export function validatePayment(details: PaymentDetails): string | null {
  if (!details.paymentMethod) return 'পেমেন্ট মাধ্যম নির্বাচন করুন';
  if (details.transactionId.trim().length < MIN_TRANSACTION_ID_LENGTH) {
    return 'সঠিক ট্রানজেকশন আইডি দিন';
  }
  return null;
}

export default function PaymentFields({
  amount,
  value,
  onChange,
}: {
  /** Shown on the account card so the customer knows what to send. */
  amount?: number;
  value: PaymentDetails;
  onChange: (next: PaymentDetails) => void;
}) {
  const [copied, setCopied] = useState(false);
  const channel = channelByValue(value.paymentMethod);

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(channel.number);
      setCopied(true);
      toast.success('নাম্বার কপি হয়েছে');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked on insecure origins and in some in-app browsers;
      // the number is on screen either way.
      toast.error('কপি করা যায়নি, নাম্বারটি লিখে নিন');
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Which wallet */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink-800">
          <span className="mr-1.5 inline-grid size-5 place-items-center rounded-full bg-ink-900 text-[11px] font-bold text-white">
            {bn(1)}
          </span>
          কোন মাধ্যমে পাঠাবেন?
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_CHANNELS.map((option) => {
            const active = value.paymentMethod === option.value;
            return (
              <label
                key={option.value}
                className={`cursor-pointer rounded-xl border px-3 py-3 text-center text-sm font-semibold transition ${
                  active
                    ? 'border-brand-500 bg-brand-50 text-brand-800'
                    : 'border-ink-200 text-ink-600 hover:border-ink-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={option.value}
                  checked={active}
                  onChange={() => onChange({ ...value, paymentMethod: option.value })}
                  className="sr-only"
                />
                {option.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* 2. Where to send it */}
      <div>
        <p className="mb-2 text-sm font-medium text-ink-800">
          <span className="mr-1.5 inline-grid size-5 place-items-center rounded-full bg-ink-900 text-[11px] font-bold text-white">
            {bn(2)}
          </span>
          এই নাম্বারে টাকা পাঠান
        </p>
        <div className="rounded-2xl p-4 text-white" style={{ backgroundColor: channel.accent }}>
          <p className="text-xs text-white/80">{channel.label} — সেন্ড মানি</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="font-mono text-2xl font-bold tracking-wide">{channel.number}</p>
            <button
              type="button"
              onClick={copyNumber}
              aria-label="নাম্বার কপি করুন"
              className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/20 transition hover:bg-white/30"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
          {amount !== undefined && amount > 0 && (
            <p className="mt-2 rounded-lg bg-white/15 px-2.5 py-1.5 text-sm font-semibold">
              পাঠাতে হবে {taka(amount)}
            </p>
          )}
          <p className="mt-2 text-xs text-white/80">{channel.instruction}</p>
        </div>
      </div>

      {/* 3. Proof */}
      <div>
        <p className="mb-2 text-sm font-medium text-ink-800">
          <span className="mr-1.5 inline-grid size-5 place-items-center rounded-full bg-ink-900 text-[11px] font-bold text-white">
            {bn(3)}
          </span>
          ট্রানজেকশন আইডি দিন
        </p>
        <div className="space-y-4">
          <Field
            label="ট্রানজেকশন আইডি"
            htmlFor="transactionId"
            required
            hint="টাকা পাঠানোর পর যে এসএমএস আসে, তাতে আইডিটি থাকে।"
          >
            <Input
              id="transactionId"
              icon={Hash}
              value={value.transactionId}
              onChange={(e) => onChange({ ...value, transactionId: e.target.value })}
              placeholder="যেমন 8Y7X9K2L5M"
              autoCapitalize="characters"
              autoComplete="off"
            />
          </Field>

          <Field
            label="যে নাম্বার থেকে পাঠিয়েছেন"
            htmlFor="senderNumber"
            hint="মিলিয়ে দেখতে সুবিধা হয় — না দিলেও চলবে।"
          >
            <Input
              id="senderNumber"
              type="tel"
              inputMode="tel"
              value={value.senderNumber}
              onChange={(e) => onChange({ ...value, senderNumber: e.target.value })}
              placeholder="01XXXXXXXXX"
              autoComplete="tel"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
