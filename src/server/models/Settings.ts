import mongoose, { Schema, Types, model, models } from 'mongoose';

export interface ISettings {
  _id: Types.ObjectId;
  siteName: string;
  adminEmail: string;
  phoneNumber: string;
  deliveryCharge: number;
  minOrderAmount: number;
  maxOrderAmount: number;
  notificationEmail: boolean;
  notificationSMS: boolean;
  notificationPush: boolean;
  autoConfirmOrder: boolean;
  workingDays: string[];
  deliveryTimeSlots: string[];
  zones: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface SettingsModel extends mongoose.Model<ISettings> {
  getSettings(): Promise<ISettings>;
}

const settingsSchema = new Schema<ISettings, SettingsModel>(
  {
    siteName: { type: String, default: 'FoodBox' },
    adminEmail: { type: String, default: 'admin@foodbox.com' },
    phoneNumber: { type: String, default: '+8801913945595' },
    deliveryCharge: { type: Number, default: 50 },
    minOrderAmount: { type: Number, default: 300 },
    maxOrderAmount: { type: Number, default: 10000 },
    notificationEmail: { type: Boolean, default: true },
    notificationSMS: { type: Boolean, default: true },
    notificationPush: { type: Boolean, default: false },
    autoConfirmOrder: { type: Boolean, default: false },
    workingDays: {
      type: [String],
      default: ['শনিবার', 'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার'],
    },
    deliveryTimeSlots: {
      type: [String],
      default: ['সকাল (8AM-12PM)', 'দুপুর (12PM-4PM)', 'রাত (4PM-9PM)'],
    },
    zones: {
      type: [String],
      default: [
        'উত্তরা',
        'ধানমন্ডি',
        'গুলশান',
        'বনানী',
        'মিরপুর',
        'মোহাম্মদপুর',
        'পুরান ঢাকা',
        'যাত্রাবাড়ী',
        'নিউ মার্কেট',
        'বসুন্ধরা',
      ],
    },
  },
  { timestamps: true }
);

/** Settings is a singleton — create the row on first read. */
settingsSchema.statics.getSettings = async function (this: SettingsModel) {
  return (await this.findOne()) ?? (await this.create({}));
};

export const Settings = (models.Settings ||
  model<ISettings, SettingsModel>('Settings', settingsSchema)) as SettingsModel;
export default Settings;
