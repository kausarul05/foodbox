import mongoose, { Schema, Types, model, models } from 'mongoose';

/**
 * One line of a customer's food-box deposit history. Written by
 * src/server/deposit.ts only, never edited or deleted, so it is the record of
 * every hold, deduction and refund — who did it, when, and why.
 */
export interface IDepositEvent {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  userName: string;
  phoneNumber: string;
  /**
   * hold   — box handed over, deposit now held in the wallet
   * deduct — box lost or broken, money taken out of the wallet
   * refund — box returned, hold released (the money never left the wallet)
   */
  type: 'hold' | 'deduct' | 'refund';
  amount: number;
  reason?: string;
  /** Admin who did it; missing for a hold made automatically on approval. */
  byAdminId?: Types.ObjectId;
  byAdminName: string;
  createdAt: Date;
  updatedAt: Date;
}

const depositEventSchema = new Schema<IDepositEvent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userName: { type: String, required: true },
    phoneNumber: { type: String, default: '' },
    type: { type: String, enum: ['hold', 'deduct', 'refund'], required: true },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String },
    byAdminId: { type: Schema.Types.ObjectId, ref: 'Admin' },
    byAdminName: { type: String, required: true },
  },
  { timestamps: true }
);

export const DepositEvent = (models.DepositEvent ||
  model<IDepositEvent>('DepositEvent', depositEventSchema)) as mongoose.Model<IDepositEvent>;
export default DepositEvent;
