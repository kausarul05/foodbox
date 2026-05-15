'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Calendar, 
  MapPin, 
  Phone,
  X,
  AlertCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Sun,
  Moon,
  Coffee,
  Package,
  Truck
} from 'lucide-react';
import { orderAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Order {
  _id: string;
  orderId: string;
  deliveryDate: string;
  deliveryTime: string;
  items: Array<{ name: string; price?: number }>;
  status: string;
  totalAmount: number;
  address: string;
  zone: string;
  paymentMethod: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [mealTypeFilter, setMealTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, statusFilter, mealTypeFilter, searchTerm]);

  const fetchOrders = async () => {
    try {
      const response = await orderAPI.getMyOrders();
      console.log('Orders response:', response);
      
      if (response.success && response.data) {
        const sortedOrders = response.data.sort((a: Order, b: Order) => 
          new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime()
        );
        setOrders(sortedOrders);
        // Expand current and future dates by default
        const today = new Date().toDateString();
        const expanded = new Set<string>();
        sortedOrders.forEach(order => {
          const orderDate = new Date(order.deliveryDate);
          if (orderDate >= new Date(today)) {
            const dateKey = orderDate.toLocaleDateString('bn-BD');
            expanded.add(dateKey);
          }
        });
        setExpandedDates(expanded);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('অর্ডার লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    // Filter by meal type
    if (mealTypeFilter !== 'all') {
      filtered = filtered.filter(order => order.deliveryTime === mealTypeFilter);
    }
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.items?.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    setFilteredOrders(filtered);
  };

  const checkIfCancellable = (order: Order) => {
    const now = new Date();
    const deliveryDate = new Date(order.deliveryDate);
    const deliveryTime = order.deliveryTime;
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinutes;
    
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return { canCancel: false, message: 'এই অর্ডারটি আর বাতিল করা যাবে না' };
    }
    
    if (order.status !== 'pending' && order.status !== 'confirmed') {
      return { canCancel: false, message: 'অর্ডারটি প্রক্রিয়াধীন, বাতিল করা যাচ্ছে না' };
    }
    
    if (deliveryDate.toDateString() === now.toDateString()) {
      switch(deliveryTime) {
        case 'lunch':
          const lunchDeadline = 8 * 60 + 30;
          if (currentTimeInMinutes > lunchDeadline) {
            return { canCancel: false, message: 'দুপুরের খাবার বাতিলের সময় পার হয়ে গেছে (সকাল ৮:৩০ এর মধ্যে বাতিল করতে হবে)' };
          }
          return { canCancel: true, message: 'আপনি এই অর্ডারটি বাতিল করতে পারেন' };
        case 'dinner':
          const dinnerDeadline = 13 * 60;
          if (currentTimeInMinutes > dinnerDeadline) {
            return { canCancel: false, message: 'রাতের খাবার বাতিলের সময় পার হয়ে গেছে (দুপুর ১:০০ টার মধ্যে বাতিল করতে হবে)' };
          }
          return { canCancel: true, message: 'আপনি এই অর্ডারটি বাতিল করতে পারেন' };
        case 'morning':
          return { canCancel: false, message: 'সকালের খাবার আজকের জন্য বাতিল করা যাবে না (আগের দিন রাত ১০টার মধ্যে বাতিল করতে হবে)' };
      }
    } else if (deliveryDate.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString()) {
      if (deliveryTime === 'morning') {
        const morningDeadline = 22 * 60;
        if (currentTimeInMinutes > morningDeadline) {
          return { canCancel: false, message: 'সকালের খাবার বাতিলের সময় পার হয়ে গেছে (রাত ১০:০০ টার মধ্যে বাতিল করতে হবে)' };
        }
        return { canCancel: true, message: 'আপনি এই অর্ডারটি বাতিল করতে পারেন' };
      }
    }
    
    return { canCancel: true, message: 'আপনি এই অর্ডারটি বাতিল করতে পারেন' };
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    if (!cancelReason.trim()) {
      toast.error('বাতিলের কারণ লিখুন');
      return;
    }
    
    try {
      setCancellingId(selectedOrder._id);
      const response = await orderAPI.cancelOrder(selectedOrder._id, cancelReason);
      
      if (response.success) {
        toast.success('অর্ডার বাতিল করা হয়েছে');
        setShowCancelModal(false);
        setCancelReason('');
        setSelectedOrder(null);
        await fetchOrders();
      } else {
        toast.error(response.message || 'অর্ডার বাতিল করতে ব্যর্থ হয়েছে');
      }
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      toast.error(error.message || 'অর্ডার বাতিল করতে ব্যর্থ হয়েছে');
    } finally {
      setCancellingId(null);
    }
  };

  const openCancelModal = (order: Order) => {
    const { canCancel, message } = checkIfCancellable(order);
    if (!canCancel) {
      toast.error(message);
      return;
    }
    setSelectedOrder(order);
    setShowCancelModal(true);
  };

  const toggleDateExpand = (dateKey: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(dateKey)) {
      newExpanded.delete(dateKey);
    } else {
      newExpanded.add(dateKey);
    }
    setExpandedDates(newExpanded);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return { className: 'bg-yellow-100 text-yellow-700', label: 'পেন্ডিং', icon: Clock };
      case 'confirmed': return { className: 'bg-blue-100 text-blue-700', label: 'কনফার্মড', icon: CheckCircle };
      case 'preparing': return { className: 'bg-purple-100 text-purple-700', label: 'প্রস্তুত হচ্ছে', icon: Package };
      case 'out_for_delivery': return { className: 'bg-indigo-100 text-indigo-700', label: 'ডেলিভারিতে', icon: Truck };
      case 'delivered': return { className: 'bg-green-100 text-green-700', label: 'ডেলিভারি হয়েছে', icon: CheckCircle };
      case 'cancelled': return { className: 'bg-red-100 text-red-700', label: 'বাতিল', icon: XCircle };
      default: return { className: 'bg-gray-100 text-gray-700', label: status, icon: Clock };
    }
  };

  const getMealIcon = (time: string) => {
    switch(time) {
      case 'morning': return <Coffee size={14} className="text-amber-500" />;
      case 'lunch': return <Sun size={14} className="text-yellow-500" />;
      case 'dinner': return <Moon size={14} className="text-blue-500" />;
      default: return <Clock size={14} />;
    }
  };

  const getMealTimeText = (time: string) => {
    switch(time) {
      case 'morning': return 'সকালের খাবার';
      case 'lunch': return 'দুপুরের খাবার';
      case 'dinner': return 'রাতের খাবার';
      default: return time;
    }
  };

  // Group orders by date
  const groupedOrders = filteredOrders.reduce((groups: { [key: string]: Order[] }, order) => {
    const date = new Date(order.deliveryDate);
    const dateKey = date.toLocaleDateString('bn-BD');
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(order);
    return groups;
  }, {});

  const statusOptions = [
    { value: 'all', label: 'সব স্ট্যাটাস' },
    { value: 'pending', label: 'পেন্ডিং' },
    { value: 'confirmed', label: 'কনফার্মড' },
    { value: 'preparing', label: 'প্রস্তুত হচ্ছে' },
    { value: 'out_for_delivery', label: 'ডেলিভারিতে' },
    { value: 'delivered', label: 'ডেলিভারি হয়েছে' },
    { value: 'cancelled', label: 'বাতিল' },
  ];

  const mealOptions = [
    { value: 'all', label: 'সব খাবার' },
    { value: 'morning', label: 'সকালের খাবার', icon: Coffee },
    { value: 'lunch', label: 'দুপুরের খাবার', icon: Sun },
    { value: 'dinner', label: 'রাতের খাবার', icon: Moon },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-12 h-12 text-[#3B82F6] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-[#3B82F6] to-[#111827] p-2 rounded-xl">
            <ShoppingBag className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">আমার অর্ডার</h1>
            <p className="text-xs md:text-sm text-gray-500">আপনার সব অর্ডারের ইতিহাস</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="অর্ডার আইডি বা খাবারের নাম দিয়ে সার্চ করুন..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={mealTypeFilter}
            onChange={(e) => setMealTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
          >
            {mealOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 bg-gray-100">
            <ShoppingBag className="w-8 h-8 md:w-10 md:h-10 text-gray-400" />
          </div>
          <h3 className="text-lg md:text-xl font-semibold text-gray-800 mb-2">কোনো অর্ডার নেই</h3>
          <p className="text-sm md:text-base text-gray-500 mb-4 md:mb-6">আপনি এখনো কোনো অর্ডার করেননি</p>
          <Link href="/order">
            <button className="bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white px-5 py-2 md:px-6 md:py-2 rounded-lg font-semibold text-sm md:text-base">
              প্রথম অর্ডার করুন
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedOrders).map(([dateKey, dateOrders]) => {
            const isExpanded = expandedDates.has(dateKey);
            const cancellableCount = dateOrders.filter(order => 
              checkIfCancellable(order).canCancel && order.status !== 'cancelled'
            ).length;
            
            return (
              <div key={dateKey} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                {/* Date Header - Collapsible */}
                <button
                  onClick={() => toggleDateExpand(dateKey)}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-[#3B82F6]" />
                    <div className="text-left">
                      <p className="font-semibold text-gray-800">{dateKey}</p>
                      <p className="text-xs text-gray-500">{dateOrders.length}টি অর্ডার</p>
                    </div>
                    {cancellableCount > 0 && (
                      <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                        {cancellableCount}টি বাতিল করা যাবে
                      </span>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {/* Orders List */}
                {isExpanded && (
                  <div className="divide-y divide-gray-100">
                    {dateOrders.map((order) => {
                      const status = getStatusBadge(order.status);
                      const StatusIcon = status.icon;
                      const { canCancel } = checkIfCancellable(order);
                      const mealIcon = getMealIcon(order.deliveryTime);
                      const isDelivered = order.status === 'delivered';
                      const isCancelled = order.status === 'cancelled';
                      
                      return (
                        <div key={order._id} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex flex-wrap justify-between items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                  #{order.orderId?.slice(-8)}
                                </span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${status.className}`}>
                                  <StatusIcon size={12} />
                                  {status.label}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2 mb-2">
                                {mealIcon}
                                <span className="text-sm font-medium text-gray-700">
                                  {getMealTimeText(order.deliveryTime)}
                                </span>
                              </div>
                              
                              <div className="text-sm text-gray-600 mb-2">
                                <span className="font-medium">খাবার:</span>{' '}
                                {order.items?.map(i => i.name).join(', ') || 'N/A'}
                              </div>
                              
                              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <MapPin size={12} />
                                  <span>{order.zone}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span>📍</span>
                                  <span className="truncate max-w-[200px]">{order.address}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <p className="text-lg font-bold text-[#3B82F6]">
                                {order.totalAmount === 0 ? 'ফ্রি' : `৳ ${order.totalAmount}`}
                              </p>
                              {!isDelivered && !isCancelled && canCancel && (
                                <button
                                  onClick={() => openCancelModal(order)}
                                  className="mt-2 text-xs text-red-500 hover:text-red-700 flex items-center gap-1 ml-auto"
                                >
                                  <Trash2 size={12} />
                                  বাতিল করুন
                                </button>
                              )}
                              {isCancelled && (
                                <span className="mt-2 inline-block text-xs text-red-500">
                                  বাতিল করা হয়েছে
                                </span>
                              )}
                              {isDelivered && (
                                <span className="mt-2 inline-block text-xs text-green-600">
                                  ডেলিভারি সম্পন্ন
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Order Modal */}
      {showCancelModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                <h3 className="text-xl font-bold text-gray-800">অর্ডার বাতিল করুন</h3>
              </div>
              <button onClick={() => setShowCancelModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-yellow-50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-800">
                      {getMealTimeText(selectedOrder.deliveryTime)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(selectedOrder.deliveryDate).toLocaleDateString('bn-BD')}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      অর্ডার আইডি: #{selectedOrder.orderId?.slice(-8)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-gray-700 font-medium mb-2">বাতিলের কারণ</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-black"
                  placeholder="কেন এই অর্ডারটি বাতিল করতে চান? (ঐচ্ছিক)"
                />
              </div>
              
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-800 flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                  <span>অর্ডার বাতিল করলে আপনার টাকা ওয়ালেটে ফেরত যোগ হবে (যদি পেমেন্ট ওয়ালেট থেকে হয়ে থাকে)</span>
                </p>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  ফিরে যান
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={cancellingId === selectedOrder._id}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {cancellingId === selectedOrder._id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                  অর্ডার বাতিল করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add missing imports */}
      {/* {(() => { const Truck = () => null; return null; })()} */}
    </div>
  );
}