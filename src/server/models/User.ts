import mongoose, { Schema, Types, model, models } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser {
  _id: Types.ObjectId;
  fullName: string;
  phoneNumber: string;
  /** The number used for the subscriber WhatsApp group. Required. */
  whatsappNumber: string;
  /** Optional — most customers sign up with a phone number only. */
  email?: string;
  password: string;
  zone: Types.ObjectId;
  address: string;
  walletBalance: number;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  matchPassword(entered: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: [true, 'Please add full name'], trim: true },
    phoneNumber: { type: String, required: [true, 'Please add phone number'], unique: true, trim: true },
    whatsappNumber: { type: String, required: [true, 'Please add WhatsApp number'], trim: true },
    /**
     * Optional, and the unique index must be sparse.
     *
     * A plain `unique` index treats a missing value as one value, so the second
     * account without an email is rejected with a duplicate-key error. `sparse`
     * leaves those documents out of the index entirely. `default: undefined`
     * keeps mongoose from writing an explicit null, which a sparse index *does*
     * store — so two nulls would still collide.
     */
    email: { type: String, unique: true, sparse: true, default: undefined, lowercase: true, trim: true },
    password: { type: String, required: [true, 'Please add password'], minlength: 6 },
    zone: { type: Schema.Types.ObjectId, ref: 'Zone', required: true },
    address: { type: String, required: true },
    walletBalance: { type: Number, default: 0 },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// NOTE: the original Express model called next() without returning, so any save
// that did not touch the password (profile edits, wallet top-ups) re-hashed the
// already-hashed value and locked the user out. The early return fixes that.
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Accounts created before whatsappNumber existed have none, and `required`
 * is checked on every save — including the wallet deduction inside
 * POST /api/orders. Falling back to the phone number keeps those saves from
 * failing validation on a field the customer was never asked for.
 * `scripts/migrate-user-contact.mjs` backfills the same value.
 */
userSchema.pre('validate', function () {
  if (!this.whatsappNumber && this.phoneNumber) this.whatsappNumber = this.phoneNumber;
});

userSchema.methods.matchPassword = function (entered: string) {
  return bcrypt.compare(entered, this.password);
};

export const User = (models.User || model<IUser>('User', userSchema)) as mongoose.Model<IUser>;
export default User;
