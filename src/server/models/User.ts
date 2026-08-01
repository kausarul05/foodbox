import mongoose, { Schema, Types, model, models } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser {
  _id: Types.ObjectId;
  fullName: string;
  phoneNumber: string;
  email: string;
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
    email: { type: String, required: [true, 'Please add email'], unique: true, lowercase: true, trim: true },
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

userSchema.methods.matchPassword = function (entered: string) {
  return bcrypt.compare(entered, this.password);
};

export const User = (models.User || model<IUser>('User', userSchema)) as mongoose.Model<IUser>;
export default User;
