import mongoose, { Schema, Types, model, models } from 'mongoose';

export interface ISubscription {
  _id: Types.ObjectId;
  subscriptionId: string;
  userId: Types.ObjectId;
  userName: string;
  phoneNumber: string;
  email: string;
  package: string;
  packageName: string;
  amount: number;
  startDate: Date;
  endDate: Date;
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentMethod?: 'bkash' | 'nagad' | 'rocket' | 'bank';
  transactionId?: string;
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
    email: { type: String, required: true },
    package: { type: String, required: true },
    packageName: { type: String, required: true },
    amount: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'active', 'expired', 'cancelled'], default: 'pending' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    paymentMethod: { type: String, enum: ['bkash', 'nagad', 'rocket', 'bank'] },
    transactionId: { type: String },
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

export const Subscription = (models.Subscription ||
  model<ISubscription>('Subscription', subscriptionSchema)) as mongoose.Model<ISubscription>;
export default Subscription;
