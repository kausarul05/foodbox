'use client';

import { bengaliDateNumeric, taka } from '@/lib/format';
import { DateInput } from '@/components/ui/Field';
import { useDialog } from '@/components/ui/DialogProvider';
import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import { expenseAPI, profitAPI } from '../../lib/api';
import toast from 'react-hot-toast';

interface Expense {
  _id: string;
  category: string;
  categoryName: string;
  amount: number;
  description: string;
  date: string;
}

export default function FinancePage() {
  const { confirm } = useDialog();
  // Manual orders moved to the order list; Finance is expenses and profit.
  const [activeTab, setActiveTab] = useState<'expenses' | 'profit'>('profit');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [profitStats, setProfitStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [expenseForm, setExpenseForm] = useState({
    category: 'daily_bazar',
    categoryName: 'দৈনিক বাজার',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);

  const expenseCategories = [
    { value: 'daily_bazar', label: 'দৈনিক বাজার', icon: '🛒' },
    { value: 'house_rent', label: 'বাসা ভাড়া', icon: '🏠' },
    { value: 'babuchi_khoros', label: 'বাবুর্চি খরচ', icon: '👨‍🍳' },
    { value: 'delivery_boy_salary', label: 'ডেলিভারি বয় বেতন', icon: '🛵' },
    { value: 'others', label: 'অন্যান্য', icon: '📝' },
  ];

  useEffect(() => {
    fetchData();
  }, [activeTab, dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'expenses') {
        const response = await expenseAPI.getAllExpenses(dateRange);
        if (response.success) setExpenses(response.data);
      } else if (activeTab === 'profit') {
        const response = await profitAPI.getStats(dateRange);
        if (response.success) setProfitStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('ডাটা লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async () => {
    if (!expenseForm.amount) {
      toast.error('দয়া করে টাকার পরিমাণ দিন');
      return;
    }

    try {
      setSubmitting(true);
      const response = await expenseAPI.createExpense(expenseForm);
      if (response.success) {
        toast.success('খরচ যোগ করা হয়েছে');
        setShowExpenseModal(false);
        setExpenseForm({
          category: 'daily_bazar',
          categoryName: 'দৈনিক বাজার',
          amount: '',
          description: '',
          date: new Date().toISOString().split('T')[0],
        });
        await fetchData();
      }
    } catch (error: any) {
      toast.error(error.message || 'খরচ যোগ করতে ব্যর্থ হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    const ok = await confirm({
      title: 'খরচ ডিলিট করবেন?',
      message: 'এই খরচটি হিসাব থেকে মুছে যাবে এবং লাভের হিসাব বদলে যাবে।',
      confirmLabel: 'ডিলিট করুন',
      tone: 'danger',
    });
    if (!ok) return;

    try {
      const response = await expenseAPI.deleteExpense(id);
      if (response.success) {
        toast.success('খরচ ডিলিট করা হয়েছে');
        await fetchData();
      }
    } catch {
      toast.error('খরচ ডিলিট করতে ব্যর্থ হয়েছে');
    }
  };


  const calculateTotalExpense = () => expenses.reduce((sum, e) => sum + e.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-12 h-12 text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">ফাইন্যান্স ম্যানেজমেন্ট</h1>
          <p className="text-ink-500 mt-1">খরচ ও লাভের হিসাব</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('profit')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${activeTab === 'profit' ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-700'}`}
          >
            প্রোফিট
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${activeTab === 'expenses' ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-700'}`}
          >
            খরচ সমূহ
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-2xl border border-ink-200 shadow-card p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div>
            <label className="block text-sm text-ink-600 mb-1">শুরু তারিখ</label>
            <DateInput
              value={dateRange.startDate}
              onChange={(startDate) => setDateRange({ ...dateRange, startDate })}
            />
          </div>
          <div>
            <label className="block text-sm text-ink-600 mb-1">শেষ তারিখ</label>
            <DateInput
              value={dateRange.endDate}
              onChange={(endDate) => setDateRange({ ...dateRange, endDate })}
            />
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-ink-100 hover:bg-ink-200 rounded-lg flex items-center gap-2 text-ink-700"
          >
            <RefreshCw size={18} />
            ফিল্টার
          </button>
        </div>
      </div>

      {/* Profit Section */}
      {activeTab === 'profit' && profitStats && (
        <div className="space-y-6">
          {/* Profit Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl border border-ink-200 shadow-card p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-green-100 p-3 rounded-full">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm text-ink-500">মোট রেভিনিউ</p>
              </div>
              <p className="text-3xl font-bold text-green-600">{taka(profitStats.totalRevenue ?? 0)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-ink-200 shadow-card p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-red-100 p-3 rounded-full">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-sm text-ink-500">মোট খরচ</p>
              </div>
              <p className="text-3xl font-bold text-red-600">{taka(profitStats.totalExpense ?? 0)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-ink-200 shadow-card p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-100 p-3 rounded-full">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-sm text-ink-500">নিট মুনাফা</p>
              </div>
              <p className="text-3xl font-bold text-blue-600">{taka(profitStats.profit ?? 0)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-ink-200 shadow-card p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-purple-100 p-3 rounded-full">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <p className="text-sm text-ink-500">মুনাফার হার</p>
              </div>
              <p className="text-3xl font-bold text-purple-600">{profitStats.profitMargin || 0}%</p>
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="bg-white rounded-2xl border border-ink-200 shadow-card p-6">
            <h3 className="text-lg font-bold text-ink-900 mb-4">খরচের বিবরণ</h3>
            <div className="space-y-3">
              {expenseCategories.map((cat) => (
                <div key={cat.value} className="flex justify-between items-center p-3 bg-ink-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{cat.icon}</span>
                    <span className="font-medium text-ink-700">{cat.label}</span>
                  </div>
                  <span className="font-semibold text-ink-900">{taka(profitStats.expenseBreakdown?.[cat.value] ?? 0)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg font-bold">
                <span className="text-ink-900">মোট খরচ</span>
                <span className="text-red-600">{taka(profitStats.totalExpense ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-2xl border border-ink-200 shadow-card p-6">
            <h3 className="text-lg font-bold text-ink-900 mb-4">অর্ডার সামারি</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="text-center p-4 bg-ink-50 rounded-lg">
                <p className="text-sm text-ink-500">নিয়মিত অর্ডার</p>
                <p className="text-2xl font-bold text-ink-900">{profitStats.ordersCount?.regular || 0}</p>
              </div>
              <div className="text-center p-4 bg-ink-50 rounded-lg">
                <p className="text-sm text-ink-500">ম্যানুয়াল অর্ডার</p>
                <p className="text-2xl font-bold text-ink-900">{profitStats.ordersCount?.manual || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expenses Section */}
      {activeTab === 'expenses' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-ink-900">খরচের তালিকা</h2>
              <p className="text-ink-500">মোট খরচ: {taka(calculateTotalExpense())}</p>
            </div>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus size={18} />
              নতুন খরচ
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {expenses.map((expense) => {
              const category = expenseCategories.find(c => c.value === expense.category);
              return (
                <div key={expense._id} className="bg-white rounded-2xl border border-ink-200 shadow-card p-4 hover:shadow-xl transition">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{category?.icon || '📝'}</div>
                      <div>
                        <p className="font-semibold text-ink-900">{expense.categoryName}</p>
                        <p className="text-sm text-ink-500">{expense.description || 'কোন বিবরণ নেই'}</p>
                        <p className="text-xs text-ink-400 mt-1">{bengaliDateNumeric(expense.date)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-red-600">{taka(expense.amount)}</p>
                      <button
                        onClick={() => handleDeleteExpense(expense._id)}
                        className="mt-2 text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {expenses.length === 0 && (
            <div className="bg-white rounded-2xl border border-ink-200 shadow-card p-12 text-center">
              <DollarSign className="w-16 h-16 text-ink-400 mx-auto mb-4" />
              <p className="text-ink-500">কোনো খরচ যোগ করা হয়নি</p>
            </div>
          )}
        </div>
      )}

      {/* Manual Orders Section */}
      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-ink-900">নতুন খরচ যোগ করুন</h3>
              <button onClick={() => setShowExpenseModal(false)} className="p-1 hover:bg-ink-100 rounded">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-ink-700 mb-1">খরচের ধরণ</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => {
                    const cat = expenseCategories.find(c => c.value === e.target.value);
                    setExpenseForm({
                      ...expenseForm,
                      category: e.target.value,
                      categoryName: cat?.label || '',
                    });
                  }}
                  className="w-full rounded-lg border border-ink-300 px-4 py-2.5 text-base text-ink-900 sm:text-sm"
                >
                  {expenseCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-ink-700 mb-1">টাকার পরিমাণ (৳)</label>
                <input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full rounded-lg border border-ink-300 px-4 py-2.5 text-base text-ink-900 sm:text-sm"
                  placeholder="যেমন: 500"
                />
              </div>
              <div>
                <label className="block text-ink-700 mb-1">বিবরণ</label>
                <textarea
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full rounded-lg border border-ink-300 px-4 py-2.5 text-base text-ink-900 sm:text-sm"
                  rows={3}
                  placeholder="বিস্তারিত বিবরণ লিখুন..."
                />
              </div>
              <div>
                <label className="block text-ink-700 mb-1">তারিখ</label>
                <DateInput
                  value={expenseForm.date}
                  onChange={(date) => setExpenseForm({ ...expenseForm, date })}
                />
              </div>
              <button
                onClick={handleAddExpense}
                disabled={submitting}
                className="w-full bg-brand-600 text-white py-2 rounded-lg font-semibold"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'খরচ যোগ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}