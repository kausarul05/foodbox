import mongoose, { Schema, Types, model, models } from 'mongoose';

export interface IBlockedDate {
  _id: Types.ObjectId;
  date: Date;
  reason: string;
  isActive: boolean;
  addedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const blockedDateSchema = new Schema<IBlockedDate>(
  {
    date: { type: Date, required: true, unique: true },
    reason: { type: String, default: 'অনিবার্য কারনবশত আজ মিল বন্ধ থাকবে' },
    isActive: { type: Boolean, default: true },
    addedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

export const BlockedDate = (models.BlockedDate ||
  model<IBlockedDate>('BlockedDate', blockedDateSchema)) as mongoose.Model<IBlockedDate>;
export default BlockedDate;
