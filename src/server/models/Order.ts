import mongoose, { Schema, Types, model, models } from 'mongoose';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type DeliveryTime = 'morning' | 'lunch' | 'dinner';

export interface IOrderItem {
  name: string;
  price: number;
  quantity: number;
}

export interface IOrder {
  _id: Types.ObjectId;
  orderId: string;
  userId: Types.ObjectId;
  userName: string;
  phoneNumber: string;
  package: string;
  items: IOrderItem[];
  totalAmount: number;
  deliveryCharge: number;
  status: OrderStatus;
  paymentMethod: 'bkash' | 'nagad' | 'rocket' | 'cash' | 'cod' | 'wallet' | 'subscription';
  paymentStatus: 'pending' | 'paid' | 'failed';
  orderDate: Date;
  deliveryDate: Date;
  deliveryTime?: DeliveryTime;
  address: string;
  zone: string;
  specialInstructions?: string;
  cancelledBy?: 'user' | 'admin';
  cancellationReason?: string;
  orderType: 'self' | 'guest';
  guestName: string;
  guestPhone: string;
  createdAt: Date;
  updatedAt: Date;
  isWithinDeadline(): boolean;
}

const orderSchema = new Schema<IOrder>(
  {
    orderId: { type: String, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    package: { type: String, required: true },
    items: [{ name: String, price: Number, quantity: Number }],
    totalAmount: { type: Number, required: true },
    deliveryCharge: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['bkash', 'nagad', 'rocket', 'cash', 'cod', 'wallet', 'subscription'],
      required: true,
    },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    orderDate: { type: Date, default: Date.now },
    deliveryDate: { type: Date, required: true },
    deliveryTime: { type: String, enum: ['morning', 'lunch', 'dinner'] },
    address: { type: String, required: true },
    zone: { type: String, required: true },
    specialInstructions: { type: String },
    cancelledBy: { type: String, enum: ['user', 'admin'] },
    cancellationReason: { type: String },
    orderType: { type: String, enum: ['self', 'guest'], default: 'self' },
    guestName: { type: String, default: '' },
    guestPhone: { type: String, default: '' },
  },
  { timestamps: true }
);

orderSchema.pre('save', async function () {
  if (this.orderId) return;
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const count = await this.model('Order').countDocuments();
  this.orderId = `ORD${year}${month}${(count + 1).toString().padStart(4, '0')}`;
});

/**
 * Cut-off rules: morning meals must be ordered the day before, lunch by 8:30 AM,
 * dinner by 2:30 PM. Future dates are always allowed.
 */
orderSchema.methods.isWithinDeadline = function (this: IOrder): boolean {
  const now = new Date();
  const deliveryDate = new Date(this.deliveryDate);
  const isToday = deliveryDate.toDateString() === now.toDateString();

  if (deliveryDate < now && !isToday) return false;
  if (deliveryDate > now && !isToday) return true;

  const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

  switch (this.deliveryTime) {
    case 'morning':
      return false;
    case 'lunch':
      return currentTimeInMinutes <= 8 * 60 + 30;
    case 'dinner':
      return currentTimeInMinutes <= 14 * 60 + 30;
    default:
      return true;
  }
};

export const Order = (models.Order || model<IOrder>('Order', orderSchema)) as mongoose.Model<IOrder>;
export default Order;
