/**
 * Where customers send money.
 *
 * One list, used by both the wallet top-up and the subscription request, so a
 * changed number cannot end up correct on one screen and stale on the other.
 * Update these when the business changes accounts.
 */
export interface PaymentChannel {
  value: 'bkash' | 'nagad' | 'rocket' | 'bank';
  label: string;
  /** The account money is sent to. */
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
];

export const DEFAULT_CHANNEL = PAYMENT_CHANNELS[0];

export function channelByValue(value: string): PaymentChannel {
  return PAYMENT_CHANNELS.find((c) => c.value === value) ?? DEFAULT_CHANNEL;
}

/** Shortest transaction id any of these providers issues. */
export const MIN_TRANSACTION_ID_LENGTH = 6;
