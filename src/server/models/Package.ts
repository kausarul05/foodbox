import mongoose, { Schema, Types, model, models } from 'mongoose';

export interface IPackage {
  _id: Types.ObjectId;
  name: string;
  title: string;
  price: number;
  originalPrice: number;
  features: string[];
  duration: number;
  discount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const packageSchema = new Schema<IPackage>(
  {
    name: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number, required: true },
    features: [{ type: String, required: true }],
    duration: { type: Number, default: 30 },
    discount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Package = (models.Package || model<IPackage>('Package', packageSchema)) as mongoose.Model<IPackage>;
export default Package;
