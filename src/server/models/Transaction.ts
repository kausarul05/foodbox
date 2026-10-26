import { Schema, Types } from 'mongoose';
import { defineModel } from './define';

export interface ITransaction {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  userName: string;
  amount: number;
  transactionId: string;
  /**
   * Matches PAYMENT_CHANNELS in src/lib/payment.ts. `bank` was missing until
   * the joining payment started writing a transaction of its own — a bank
   * transfer threw on validation, which would have failed the approval that
   * credits the customer's wallet.
   */
  paymentMethod: 'bkash' | 'nagad' | 'rocket' | 'bank' | 'cash';
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    amount: { type: Number, required: true, min: 50 },
    transactionId: { type: String, required: true, unique: true },
    paymentMethod: { type: String, enum: ['bkash', 'nagad', 'rocket', 'bank', 'cash'], default: 'bkash' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

export const Transaction = defineModel<ITransaction>('Transaction', transactionSchema);
export default Transaction;
