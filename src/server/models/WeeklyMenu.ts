import mongoose, { Schema, Types, model, models } from 'mongoose';

export const MENU_DAYS = [
  'শনিবার',
  'রবিবার',
  'সোমবার',
  'মঙ্গলবার',
  'বুধবার',
  'বৃহস্পতিবার',
  'শুক্রবার',
] as const;

export interface IWeeklyMenu {
  _id: Types.ObjectId;
  day: (typeof MENU_DAYS)[number];
  package: string;
  morning: string;
  lunch: string;
  dinner: string;
  morningPrice: number;
  lunchPrice: number;
  dinnerPrice: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const weeklyMenuSchema = new Schema<IWeeklyMenu>(
  {
    day: { type: String, required: true, enum: MENU_DAYS },
    package: { type: String, required: true },
    morning: { type: String, required: true },
    lunch: { type: String, required: true },
    dinner: { type: String, required: true },
    morningPrice: { type: Number, required: true, default: 0 },
    lunchPrice: { type: Number, required: true, default: 0 },
    dinnerPrice: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// One menu row per day per package.
weeklyMenuSchema.index({ day: 1, package: 1 }, { unique: true });

export const WeeklyMenu = (models.WeeklyMenu ||
  model<IWeeklyMenu>('WeeklyMenu', weeklyMenuSchema)) as mongoose.Model<IWeeklyMenu>;
export default WeeklyMenu;
