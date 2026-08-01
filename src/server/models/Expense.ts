import mongoose, { Schema, Types, model, models } from 'mongoose';

export type ExpenseCategory =
  | 'daily_bazar'
  | 'house_rent'
  | 'babuchi_khoros'
  | 'delivery_boy_salary'
  | 'others';

export interface IExpense {
  _id: Types.ObjectId;
  category: ExpenseCategory;
  categoryName: string;
  amount: number;
  description: string;
  date: Date;
  addedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    category: {
      type: String,
      required: true,
      enum: ['daily_bazar', 'house_rent', 'babuchi_khoros', 'delivery_boy_salary', 'others'],
    },
    categoryName: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, default: '' },
    date: { type: Date, default: Date.now },
    addedBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  },
  { timestamps: true }
);

export const Expense = (models.Expense || model<IExpense>('Expense', expenseSchema)) as mongoose.Model<IExpense>;
export default Expense;
