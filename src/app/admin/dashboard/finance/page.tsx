'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Plus,
  Edit,
  Trash2,
  Loader2,
  RefreshCw,
  Search,
  X,
  CheckCircle,
  Clock,
  Truck,
  Package,
  UserPlus,
  Phone,
  MapPin,
  Home
} from 'lucide-react';
import { expenseAPI, manualOrderAPI, profitAPI } from '../../lib/api';
import toast from 'react-hot-toast';

interface Expense {
  _id: string;
  category: string;
  categoryName: string;
  amount: number;
  description: string;
  date: string;
}

interface ManualOrder {
  _id: string;
  orderId: string;
  customerName: string;
  phoneNumber: string;
  address: string;
  zone: string;
  items: Array<{ name: string; price: number; quantity: number }>;
  totalAmount: number;
  deliveryCharge: number;
  paymentMethod: string;
  status: string;
  deliveryDate: string;
  deliveryTime: string;
  specialInstructions: string;
}

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<'expenses' | 'manual-orders' | 'profit'>('profit');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [manualOrders, setManualOrders] = useState<ManualOrder[]>([]);
  const [profitStats, setProfitStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [expenseForm, setExpenseForm] = useState({
    category: 'daily_bazar',
    categoryName: 'দৈনিক বাজার',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [orderForm, setOrderForm] = useState({
    customerName: '',
    phoneNumber: '',
    address: '',
    zone: '',
    items: [{ name: '', price: '', quantity: '1' }],
    deliveryDate: new Date().toISOString().split('T')[0],
    deliveryTime: 'lunch',
    paymentMethod: 'cash',
    orderType: 'cod', // 'subscription' or 'cod'
    specialInstructions: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const zones = ['উত্তরা', 'ধানমন্ডি', 'গুলশান', 'বনানী', 'মিরপুর', 'মোহাম্মদপুর', 'পুরান ঢাকা', 'যাত্রাবাড়ী', 'নিউ মার্কেট', 'বসুন্ধরা'];
  const deliveryTimes = [
    { value: 'morning', label: 'সকালের খাবার', icon: '🌅' },
    { value: 'lunch', label: 'দুপুরের খাবার', icon: '☀️' },
    { value: 'dinner', label: 'রাতের খাবার', icon: '🌙' },
  ];

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
      } else if (activeTab === 'manual-orders') {
        const response = await manualOrderAPI.getAllOrders(dateRange);
        if (response.success) setManualOrders(response.data);
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
    if (confirm('এই খরচটি ডিলিট করতে চান?')) {
      try {
        const response = await expenseAPI.deleteExpense(id);
        if (response.success) {
          toast.success('খরচ ডিলিট করা হয়েছে');
          await fetchData();
        }
      } catch (error) {
        toast.error('খরচ ডিলিট করতে ব্যর্থ হয়েছে');
      }
    }
  };

  const handleAddManualOrder = async () => {
    if (!orderForm.customerName || !orderForm.phoneNumber || !orderForm.address || !orderForm.zone) {
      toast.error('দয়া করে সব তথ্য পূরণ করুন');
      return;
    }

    if (!orderForm.orderType) {
      toast.error('দয়া করে অর্ডার টাইপ নির্বাচন করুন');
      return;
    }

    // Calculate total amount
    let totalAmount = 0;
    orderForm.items.forEach(item => {
      totalAmount += (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0);
    });

    try {
      setSubmitting(true);

      // Determine payment method based on order type
      const paymentMethod = orderForm.orderType === 'subscription' ? 'wallet' : 'cash';

      const response = await manualOrderAPI.createOrder({
        ...orderForm,
        totalAmount,
        paymentMethod,
        items: orderForm.items.map(item => ({
          name: item.name,
          price: parseFloat(item.price),
          quantity: parseInt(item.quantity),
        })),
      });

      if (response.success) {
        const orderTypeText = orderForm.orderType === 'subscription' ? 'সাবস্ক্রিপশন অর্ডার' : 'ক্যাশ অন ডেলিভারি অর্ডার';
        toast.success(`${orderTypeText} যোগ করা হয়েছে`);
        setShowOrderModal(false);
        setOrderForm({
          customerName: '',
          phoneNumber: '',
          address: '',
          zone: '',
          items: [{ name: '', price: '', quantity: '1' }],
          deliveryDate: new Date().toISOString().split('T')[0],
          deliveryTime: 'lunch',
          paymentMethod: 'cash',
          orderType: 'cod',
          specialInstructions: '',
        });
        await fetchData();
      }
    } catch (error: any) {
      toast.error(error.message || 'অর্ডার যোগ করতে ব্যর্থ হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  const updateOrderItem = (index: number, field: string, value: string) => {
    const newItems = [...orderForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setOrderForm({ ...orderForm, items: newItems });
  };

  const addOrderItem = () => {
    setOrderForm({
      ...orderForm,
      items: [...orderForm.items, { name: '', price: '', quantity: '1' }],
    });
  };

  const removeOrderItem = (index: number) => {
    const newItems = orderForm.items.filter((_, i) => i !== index);
    setOrderForm({ ...orderForm, items: newItems });
  };

  const updateOrderStatus = async (id: string, newStatus: string) => {
    try {
      const response = await manualOrderAPI.updateOrderStatus(id, newStatus);
      if (response.success) {
        toast.success('স্ট্যাটাস আপডেট হয়েছে');
        await fetchData();
      }
    } catch (error) {
      toast.error('স্ট্যাটাস আপডেট করতে ব্যর্থ হয়েছে');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-purple-100 text-purple-800',
      out_for_delivery: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      pending: 'পেন্ডিং',
      confirmed: 'কনফার্মড',
      preparing: 'প্রস্তুত হচ্ছে',
      out_for_delivery: 'ডেলিভারিতে',
      delivered: 'ডেলিভারি হয়েছে',
      cancelled: 'বাতিল',
    };
    return { className: styles[status] || 'bg-gray-100 text-gray-800', label: labels[status] || status };
  };

  const calculateTotalExpense = () => expenses.reduce((sum, e) => sum + e.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-12 h-12 text-[#3B82F6] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ফাইন্যান্স ম্যানেজমেন্ট</h1>
          <p className="text-gray-500 mt-1">খরচ ব্যবস্থাপনা এবং ম্যানুয়াল অর্ডার</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('profit')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${activeTab === 'profit' ? 'bg-[#3B82F6] text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            প্রোফিট
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${activeTab === 'expenses' ? 'bg-[#3B82F6] text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            খরচ সমূহ
          </button>
          <button
            onClick={() => setActiveTab('manual-orders')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${activeTab === 'manual-orders' ? 'bg-[#3B82F6] text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            ম্যানুয়াল অর্ডার
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div>
            <label className="block text-sm text-gray-600 mb-1">শুরু তারিখ</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg text-black"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">শেষ তারিখ</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg text-black"
            />
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 text-gray-700"
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
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-green-100 p-3 rounded-full">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm text-gray-500">মোট রেভিনিউ</p>
              </div>
              <p className="text-3xl font-bold text-green-600">৳ {profitStats.totalRevenue?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-red-100 p-3 rounded-full">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-sm text-gray-500">মোট খরচ</p>
              </div>
              <p className="text-3xl font-bold text-red-600">৳ {profitStats.totalExpense?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-100 p-3 rounded-full">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-sm text-gray-500">নিট মুনাফা</p>
              </div>
              <p className="text-3xl font-bold text-blue-600">৳ {profitStats.profit?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-purple-100 p-3 rounded-full">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <p className="text-sm text-gray-500">মুনাফার হার</p>
              </div>
              <p className="text-3xl font-bold text-purple-600">{profitStats.profitMargin || 0}%</p>
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">খরচের বিবরণ</h3>
            <div className="space-y-3">
              {expenseCategories.map((cat) => (
                <div key={cat.value} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{cat.icon}</span>
                    <span className="font-medium text-gray-700">{cat.label}</span>
                  </div>
                  <span className="font-semibold text-gray-800">৳ {profitStats.expenseBreakdown?.[cat.value]?.toLocaleString() || 0}</span>
                </div>
              ))}
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg font-bold">
                <span className="text-gray-800">মোট খরচ</span>
                <span className="text-red-600">৳ {profitStats.totalExpense?.toLocaleString() || 0}</span>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">অর্ডার সামারি</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">নিয়মিত অর্ডার</p>
                <p className="text-2xl font-bold text-gray-800">{profitStats.ordersCount?.regular || 0}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">ম্যানুয়াল অর্ডার</p>
                <p className="text-2xl font-bold text-gray-800">{profitStats.ordersCount?.manual || 0}</p>
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
              <h2 className="text-xl font-bold text-gray-800">খরচের তালিকা</h2>
              <p className="text-gray-500">মোট খরচ: ৳ {calculateTotalExpense().toLocaleString()}</p>
            </div>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus size={18} />
              নতুন খরচ
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {expenses.map((expense) => {
              const category = expenseCategories.find(c => c.value === expense.category);
              return (
                <div key={expense._id} className="bg-white rounded-2xl shadow-lg p-4 hover:shadow-xl transition">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{category?.icon || '📝'}</div>
                      <div>
                        <p className="font-semibold text-gray-800">{expense.categoryName}</p>
                        <p className="text-sm text-gray-500">{expense.description || 'কোন বিবরণ নেই'}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(expense.date).toLocaleDateString('bn-BD')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-red-600">৳ {expense.amount.toLocaleString()}</p>
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
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">কোনো খরচ যোগ করা হয়নি</p>
            </div>
          )}
        </div>
      )}

      {/* Manual Orders Section */}
      {activeTab === 'manual-orders' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">ম্যানুয়াল অর্ডার</h2>
            <button
              onClick={() => setShowOrderModal(true)}
              className="bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <UserPlus size={18} />
              নতুন অর্ডার
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {manualOrders.map((order) => {
              const status = getStatusBadge(order.status);
              return (
                <div key={order._id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition">
                  <div className="p-4 bg-gradient-to-r from-orange-500 to-red-500 text-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-sm font-mono opacity-80">#{order.orderId}</span>
                        <div className="mt-1">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${status.className}`}>
                            {status.label}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">৳ {order.totalAmount + order.deliveryCharge}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="font-semibold text-gray-800">{order.customerName}</p>
                      <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                        <Phone size={14} />
                        <span>{order.phoneNumber}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin size={14} />
                      <span>{order.zone}</span>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-500">আইটেম</p>
                      <p className="text-sm text-gray-700">{order.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {order.status === 'pending' && (
                        <button
                          onClick={() => updateOrderStatus(order._id, 'confirmed')}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm"
                        >
                          কনফার্ম
                        </button>
                      )}
                      {order.status === 'confirmed' && (
                        <button
                          onClick={() => updateOrderStatus(order._id, 'preparing')}
                          className="px-3 py-1 bg-purple-600 text-white rounded-lg text-sm"
                        >
                          প্রস্তুত
                        </button>
                      )}
                      {order.status === 'preparing' && (
                        <button
                          onClick={() => updateOrderStatus(order._id, 'out_for_delivery')}
                          className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm"
                        >
                          ডেলিভারি
                        </button>
                      )}
                      {order.status === 'out_for_delivery' && (
                        <button
                          onClick={() => updateOrderStatus(order._id, 'delivered')}
                          className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm"
                        >
                          সম্পন্ন
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {manualOrders.length === 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <UserPlus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">কোনো ম্যানুয়াল অর্ডার নেই</p>
            </div>
          )}
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-black">নতুন খরচ যোগ করুন</h3>
              <button onClick={() => setShowExpenseModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-1">খরচের ধরণ</label>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                >
                  {expenseCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-1">টাকার পরিমাণ (৳)</label>
                <input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                  placeholder="যেমন: 500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">বিবরণ</label>
                <textarea
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                  rows={3}
                  placeholder="বিস্তারিত বিবরণ লিখুন..."
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">তারিখ</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>
              <button
                onClick={handleAddExpense}
                disabled={submitting}
                className="w-full bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white py-2 rounded-lg font-semibold"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'খরচ যোগ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Manual Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-black">নতুন ম্যানুয়াল অর্ডার</h3>
              <button onClick={() => setShowOrderModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Order Type Selection - Add this first */}
              <div>
                <label className="block text-gray-700 mb-2 font-semibold">
                  অর্ডার টাইপ সিলেক্ট করুন <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${orderForm.orderType === 'subscription' ? 'border-[#3B82F6] bg-blue-50' : 'border-gray-300 hover:border-[#3B82F6]'}`}>
                    <input
                      type="radio"
                      name="orderType"
                      value="subscription"
                      checked={orderForm.orderType === 'subscription'}
                      onChange={(e) => setOrderForm({ ...orderForm, orderType: e.target.value as 'subscription' | 'cod', paymentMethod: e.target.value === 'subscription' ? 'wallet' : 'cash' })}
                      className="w-4 h-4 text-[#3B82F6]"
                    />
                    <div>
                      <p className="font-semibold text-gray-800">সাবস্ক্রিপশন অর্ডার</p>
                      <p className="text-xs text-gray-500">এই অর্ডার "অর্ডার লিস্ট" পেইজে দেখাবে</p>
                    </div>
                  </label>
                  <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${orderForm.orderType === 'cod' ? 'border-[#3B82F6] bg-blue-50' : 'border-gray-300 hover:border-[#3B82F6]'}`}>
                    <input
                      type="radio"
                      name="orderType"
                      value="cod"
                      checked={orderForm.orderType === 'cod'}
                      onChange={(e) => setOrderForm({ ...orderForm, orderType: e.target.value as 'subscription' | 'cod', paymentMethod: e.target.value === 'cod' ? 'cash' : 'wallet' })}
                      className="w-4 h-4 text-[#3B82F6]"
                    />
                    <div>
                      <p className="font-semibold text-gray-800">ক্যাশ অন ডেলিভারি</p>
                      <p className="text-xs text-gray-500">এই অর্ডার "ক্যাশ অন ডেলিভারি" পেইজে দেখাবে</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Customer Name */}
              <div>
                <label className="block text-gray-700 mb-1">গ্রাহকের নাম <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={orderForm.customerName}
                  onChange={(e) => setOrderForm({ ...orderForm, customerName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                  placeholder="গ্রাহকের নাম"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-gray-700 mb-1">ফোন নাম্বার <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  value={orderForm.phoneNumber}
                  onChange={(e) => setOrderForm({ ...orderForm, phoneNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                  placeholder="+8801XXXXXXXXX"
                />
              </div>

              {/* Zone */}
              <div>
                <label className="block text-gray-700 mb-1">জোন <span className="text-red-500">*</span></label>
                <select
                  value={orderForm.zone}
                  onChange={(e) => setOrderForm({ ...orderForm, zone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                >
                  <option value="">সিলেক্ট করুন</option>
                  {zones.map((zone) => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </select>
              </div>

              {/* Address */}
              <div>
                <label className="block text-gray-700 mb-1">ঠিকানা <span className="text-red-500">*</span></label>
                <textarea
                  value={orderForm.address}
                  onChange={(e) => setOrderForm({ ...orderForm, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                  rows={2}
                  placeholder="বিস্তারিত ঠিকানা"
                />
              </div>

              {/* Items */}
              <div>
                <label className="block text-gray-700 mb-1">আইটেম সমূহ <span className="text-red-500">*</span></label>
                {orderForm.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateOrderItem(idx, 'name', e.target.value)}
                      placeholder="আইটেমের নাম"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-black"
                    />
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => updateOrderItem(idx, 'price', e.target.value)}
                      placeholder="দাম"
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-black"
                    />
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateOrderItem(idx, 'quantity', e.target.value)}
                      placeholder="কত"
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-black"
                    />
                    {orderForm.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOrderItem(idx)}
                        className="px-2 py-2 text-red-500 hover:text-red-700"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addOrderItem}
                  className="text-[#3B82F6] text-sm flex items-center gap-1 mt-2"
                >
                  <Plus size={16} /> আরও আইটেম যোগ করুন
                </button>
              </div>

              {/* Delivery Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-1">ডেলিভারির তারিখ</label>
                  <input
                    type="date"
                    value={orderForm.deliveryDate}
                    onChange={(e) => setOrderForm({ ...orderForm, deliveryDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">ডেলিভারির সময়</label>
                  <select
                    value={orderForm.deliveryTime}
                    onChange={(e) => setOrderForm({ ...orderForm, deliveryTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                  >
                    {deliveryTimes.map((time) => (
                      <option key={time.value} value={time.value}>{time.icon} {time.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Method - Auto based on order type, but can be shown as info */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  পেমেন্ট মেথড:
                  <span className="font-semibold ml-1">
                    {orderForm.orderType === 'subscription' ? 'ওয়ালেট (সাবস্ক্রিপশন)' : 'ক্যাশ অন ডেলিভারি'}
                  </span>
                </p>
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block text-gray-700 mb-1">বিশেষ নির্দেশনা</label>
                <textarea
                  value={orderForm.specialInstructions}
                  onChange={(e) => setOrderForm({ ...orderForm, specialInstructions: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                  rows={2}
                  placeholder="কোনো বিশেষ নির্দেশনা থাকলে লিখুন..."
                />
              </div>

              <button
                onClick={handleAddManualOrder}
                disabled={submitting}
                className="w-full bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white py-2 rounded-lg font-semibold"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'অর্ডার তৈরি করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}