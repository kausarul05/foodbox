/**
 * Where customers send money.
 *
 * One list, used by both the wallet top-up and the subscription request, so a
 * changed number cannot end up correct on one screen and stale on the other.
 * Update these when the business changes accounts.
 */
export interface PaymentChannel {
  value: 'bkash' | 'nagad' | 'rocket' | 'bank' | 'cash';
  label: string;
  /** The account money is sent to. Empty for hand cash. */
  number: string;
  /** What the customer does in their app. */
  instruction: string;
  /** Brand colour, used for the account card. */
  accent: string;
}

export const PAYMENT_CHANNELS: PaymentChannel[] = [
  {
    value: 'bkash',
    label: 'বিকাশ',
    number: '01792695939',
    instruction: 'বিকাশ অ্যাপ বা *247# থেকে "সেন্ড মানি" করুন',
    accent: '#e2136e',
  },
  {
    value: 'nagad',
    label: 'নগদ',
    number: '01792695939',
    instruction: 'নগদ অ্যাপ বা *167# থেকে "সেন্ড মানি" করুন',
    accent: '#ec1c24',
  },
  {
    value: 'rocket',
    label: 'রকেট',
    number: '017926959391',
    instruction: 'রকেট অ্যাপ বা *322# থেকে "সেন্ড মানি" করুন',
    accent: '#8c3494',
  },
  {
    value: 'cash',
    label: 'হ্যান্ড ক্যাশ',
    number: '',
    instruction: 'টাকা সরাসরি আমাদের প্রতিনিধির হাতে দিন। টাকা পাওয়ার পর অ্যাডমিন অনুমোদন করবেন।',
    accent: '#3f3a36',
  },
];

export const DEFAULT_CHANNEL = PAYMENT_CHANNELS[0];

export function channelByValue(value: string): PaymentChannel {
  return PAYMENT_CHANNELS.find((c) => c.value === value) ?? DEFAULT_CHANNEL;
}

/** Shortest transaction id any of these providers issues. */
export const MIN_TRANSACTION_ID_LENGTH = 6;

/** Paid in person, so there is no transaction id to give. */
export function isHandCash(method: string | undefined): boolean {
  return method === 'cash';
}

/** "বিকাশ", "হ্যান্ড ক্যাশ" … — the raw value when it is not one of ours. */
export function paymentLabel(method: string | undefined): string {
  return PAYMENT_CHANNELS.find((c) => c.value === method)?.label ?? method ?? '—';
}

/**
 * Stand-in id for a hand-cash top-up. `Transaction.transactionId` is required
 * and unique, and a cash payment has no id from any provider.
 */
export function cashReference(): string {
  return `CASH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
