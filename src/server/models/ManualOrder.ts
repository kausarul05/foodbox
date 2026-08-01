import mongoose, { Schema, Types, model, models } from 'mongoose';
import type { DeliveryTime, IOrderItem, OrderStatus } from './Order';

export interface IManualOrder {
  _id: Types.ObjectId;
  orderId: string;
  customerName: string;
  phoneNumber: string;
  address: string;
  zone: string;
  items: IOrderItem[];
  totalAmount: number;
  deliveryCharge: number;
  paymentMethod: 'cash' | 'bkash' | 'nagad';
  status: OrderStatus;
  deliveryDate: Date;
  deliveryTime: DeliveryTime;
  specialInstructions: string;
  addedBy: Types.ObjectId;
  isManual: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const manualOrderSchema = new Schema<IManualOrder>(
  {
    orderId: { type: String, unique: true },
    customerName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    address: { type: String, required: true },
    zone: { type: String, required: true },
    items: [{ name: String, price: Number, quantity: Number }],
    totalAmount: { type: Number, required: true },
    deliveryCharge: { type: Number, default: 15 },
    paymentMethod: { type: String, enum: ['cash', 'bkash', 'nagad'], default: 'cash' },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'pending',
    },
    deliveryDate: { type: Date, required: true },
    deliveryTime: { type: String, enum: ['morning', 'lunch', 'dinner'], required: true },
    specialInstructions: { type: String, default: '' },
    addedBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    isManual: { type: Boolean, default: true },
  },
  { timestamps: true }
);

manualOrderSchema.pre('save', async function () {
  if (this.orderId) return;
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const count = await this.model('ManualOrder').countDocuments();
  this.orderId = `MAN${year}${month}${(count + 1).toString().padStart(4, '0')}`;
});

export const ManualOrder = (models.ManualOrder ||
  model<IManualOrder>('ManualOrder', manualOrderSchema)) as mongoose.Model<IManualOrder>;
export default ManualOrder;
