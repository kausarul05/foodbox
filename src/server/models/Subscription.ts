import { Schema, Types } from 'mongoose';
import { defineModel } from './define';

export interface ISubscription {
  _id: Types.ObjectId;
  subscriptionId: string;
  userId: Types.ObjectId;
  userName: string;
  phoneNumber: string;
  /** Optional — a customer can sign up without an email. */
  email?: string;
  package: string;
  packageName: string;
  /**
   * The subscription fee alone — non-refundable, and the figure
   * /api/admin/profit-stats counts as revenue. Never the total the customer
   * sent: the food float below is their money, not earnings.
   */
  amount: number;
  /** Everything the customer sent to join: `amount` plus `walletCredit`. */
  paidAmount?: number;
  /** The food float and box deposit, credited to the wallet on approval. */
  walletCredit?: number;
  /** Set when walletCredit was credited, so approving twice cannot double it. */
  walletCreditedAt?: Date;
  startDate: Date;
  endDate: Date;
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentMethod?: 'bkash' | 'nagad' | 'rocket' | 'bank' | 'cash';
  transactionId?: string;
  /** The number the customer sent money from, for reconciliation. */
  senderNumber?: string;
  address: string;
  zone: string;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  cancelledBy?: 'user' | 'admin';
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    subscriptionId: { type: String, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    email: { type: String },
    package: { type: String, required: true },
    packageName: { type: String, required: true },
    amount: { type: Number, required: true },
    paidAmount: { type: Number },
    walletCredit: { type: Number, default: 0 },
    walletCreditedAt: { type: Date },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'active', 'expired', 'cancelled'], default: 'pending' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    paymentMethod: { type: String, enum: ['bkash', 'nagad', 'rocket', 'bank', 'cash'] },
    transactionId: { type: String },
    senderNumber: { type: String },
    address: { type: String, required: true },
    zone: { type: String, required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
    approvedAt: { type: Date },
    cancelledBy: { type: String, enum: ['user', 'admin'] },
    cancellationReason: { type: String },
  },
  { timestamps: true }
);

subscriptionSchema.pre('save', async function () {
  if (this.subscriptionId) return;
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const count = await this.model('Subscription').countDocuments();
  this.subscriptionId = `SUB${year}${month}${(count + 1).toString().padStart(4, '0')}`;
});

export const Subscription = defineModel<ISubscription>('Subscription', subscriptionSchema);
export default Subscription;
