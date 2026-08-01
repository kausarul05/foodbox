import mongoose, { Schema, Types, model, models } from 'mongoose';

export interface IZone {
  _id: Types.ObjectId;
  name: string;
  nameBn: string | null;
  deliveryCharge: number;
  isActive: boolean;
  isCustom: boolean;
  addedBy: Types.ObjectId | null;
  addedByAdmin: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const zoneSchema = new Schema<IZone>(
  {
    name: { type: String, required: [true, 'Zone name is required'], unique: true, trim: true, lowercase: true },
    nameBn: { type: String, trim: true, default: null },
    deliveryCharge: { type: Number, default: 50 },
    isActive: { type: Boolean, default: true },
    isCustom: { type: Boolean, default: false },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    addedByAdmin: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
);

export const Zone = (models.Zone || model<IZone>('Zone', zoneSchema)) as mongoose.Model<IZone>;
export default Zone;
