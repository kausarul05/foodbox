import mongoose, { Schema, Types, model, models } from 'mongoose';
import bcrypt from 'bcryptjs';

export type AdminRole = 'super_admin' | 'manager' | 'support';

export type AdminPermission =
  | 'manage_packages'
  | 'manage_menu'
  | 'manage_orders'
  | 'manage_users'
  | 'manage_subscriptions'
  | 'view_reports';

export interface IAdmin {
  _id: Types.ObjectId;
  fullName: string;
  email: string;
  password: string;
  role: AdminRole;
  permissions: AdminPermission[];
  lastLogin?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  matchPassword(entered: string): Promise<boolean>;
}

const adminSchema = new Schema<IAdmin>(
  {
    fullName: { type: String, required: true, default: 'Super Admin' },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['super_admin', 'manager', 'support'], default: 'super_admin' },
    permissions: [
      {
        type: String,
        enum: [
          'manage_packages',
          'manage_menu',
          'manage_orders',
          'manage_users',
          'manage_subscriptions',
          'view_reports',
        ],
      },
    ],
    lastLogin: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Same double-hash fix as User: return early when the password is untouched.
adminSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

adminSchema.methods.matchPassword = function (entered: string) {
  return bcrypt.compare(entered, this.password);
};

export const Admin = (models.Admin || model<IAdmin>('Admin', adminSchema)) as mongoose.Model<IAdmin>;
export default Admin;
