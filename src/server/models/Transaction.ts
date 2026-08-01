import mongoose, { Schema, Types, model, models } from 'mongoose';

export interface ITransaction {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  userName: string;
  amount: number;
  transactionId: string;
  paymentMethod: 'bkash' | 'nagad' | 'rocket';
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
    paymentMethod: { type: String, enum: ['bkash', 'nagad', 'rocket'], default: 'bkash' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

export const Transaction = (models.Transaction ||
  model<ITransaction>('Transaction', transactionSchema)) as mongoose.Model<ITransaction>;
export default Transaction;
