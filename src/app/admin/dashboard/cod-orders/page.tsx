'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Truck, 
  Clock, 
  Package as PackageIcon,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  ShoppingBag,
  Users,
  User,
  MapPin,
  Phone,
  Calendar,
  X,
  CreditCard,
  Home,
  Utensils,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  Coffee
} from 'lucide-react';
import { orderAPI } from '../../lib/api';
import toast from 'react-hot-toast';

interface CODOrder {
  _id: string;
  orderId: string;
  userName: string;
  phoneNumber: string;
  items: Array<{ name: string; price: number; quantity: number }>;
  totalAmount: number;
  deliveryCharge: number;
  package: string;
  specialInstructions?: string;
  orderType?: 'self' | 'guest';
  status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  deliveryDate: string;
  deliveryTime: string;
  address: string;
  zone: string;
  createdAt: string;
  paymentMethod?: string;
}

// Meal time icons and labels
const mealTimeConfig = {
  morning: { icon: Coffee, label: 'সকালের খাবার', color: 'bg-amber-500', iconColor: 'text-amber-500' },
  lunch: { icon: Sun, label: 'দুপুরের খাবার', color: 'bg-yellow-500', iconColor: 'text-yellow-500' },
  dinner: { icon: Moon, label: 'রাতের খাবার', color: 'bg-blue-500', iconColor: 'text-blue-500' }
};

export default function CODOrdersPage() {
  const [orders, setOrders] = useState<CODOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterOrderType, setFilterOrderType] = useState('all');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<CODOrder | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // State for date-wise grouping
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [expandedMealTimes, setExpandedMealTimes] = useState<Map<string, Set<string>>>(new Map());

  useEffect(() => {
    fetchCODOrders();
  }, []);

  const fetchCODOrders = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getAllOrders({ paymentMethod: 'cash' });
      console.log('COD Orders:', response);
      
      if (response.success && response.data) {
        const processedOrders = response.data.map((order: CODOrder) => ({
          ...order,
          orderType: (order.specialInstructions === 'Guest Meal Order' || order.package === 'Guest') ? 'guest' : 'self'
        }));
        setOrders(processedOrders);
      }
    } catch (error) {
      console.error('Error fetching COD orders:', error);
      toast.error('অর্ডার লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: CODOrder['status']) => {
    try {
      setUpdatingOrderId(orderId);
      const response = await orderAPI.updateOrderStatus(orderId, newStatus);
      
      if (response.success) {
        toast.success(`অর্ডার স্ট্যাটাস আপডেট হয়েছে: ${getStatusText(newStatus)}`);
        await fetchCODOrders();
      } else {
        toast.error(response.message || 'স্ট্যাটাস আপডেট করতে ব্যর্থ হয়েছে');
      }
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast.error(error.message || 'স্ট্যাটাস আপডেট করতে ব্যর্থ হয়েছে');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const openDetailsModal = (order: CODOrder) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-purple-100 text-purple-800';
      case 'out_for_delivery': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'pending': return 'পেন্ডিং';
      case 'confirmed': return 'কনফার্মড';
      case 'preparing': return 'প্রস্তুত হচ্ছে';
      case 'out_for_delivery': return 'ডেলিভারিতে';
      case 'delivered': return 'ডেলিভারি হয়েছে';
      case 'cancelled': return 'বাতিল';
      default: return status;
    }
  };

  const getOrderTypeBadge = (orderType?: string) => {
    if (orderType === 'guest') {
      return { color: 'bg-purple-100 text-purple-700', icon: Users, text: 'গেস্ট অর্ডার' };
    }
    return { color: 'bg-blue-100 text-blue-700', icon: User, text: 'নিয়মিত অর্ডার' };
  };

  const getMealTimeText = (time: string) => {
    switch(time) {
      case 'morning': return 'সকালের খাবার';
      case 'lunch': return 'দুপুরের খাবার';
      case 'dinner': return 'রাতের খাবার';
      default: return time;
    }
  };

  const getStatusButtons = (order: CODOrder) => {
    const buttons = [];
    
    switch(order.status) {
      case 'pending':
        buttons.push(
          <button
            key="confirm"
            onClick={() => updateOrderStatus(order._id, 'confirmed')}
            disabled={updatingOrderId === order._id}
            className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50 text-xs"
          >
            <CheckCircle size={12} />
            কনফার্ম
          </button>
        );
        break;
      case 'confirmed':
        buttons.push(
          <button
            key="prepare"
            onClick={() => updateOrderStatus(order._id, 'preparing')}
            disabled={updatingOrderId === order._id}
            className="flex items-center gap-1 px-2 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition disabled:opacity-50 text-xs"
          >
            <PackageIcon size={12} />
            প্রস্তুত
          </button>
        );
        break;
      case 'preparing':
        buttons.push(
          <button
            key="out_for_delivery"
            onClick={() => updateOrderStatus(order._id, 'out_for_delivery')}
            disabled={updatingOrderId === order._id}
            className="flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition disabled:opacity-50 text-xs"
          >
            <Truck size={12} />
            ডেলিভারি
          </button>
        );
        break;
      case 'out_for_delivery':
        buttons.push(
          <button
            key="deliver"
            onClick={() => updateOrderStatus(order._id, 'delivered')}
            disabled={updatingOrderId === order._id}
            className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:opacity-50 text-xs"
          >
            <CheckCircle size={12} />
            সম্পন্ন
          </button>
        );
        break;
    }
    
    if (!['delivered', 'cancelled'].includes(order.status)) {
      buttons.push(
        <button
          key="cancel"
          onClick={() => updateOrderStatus(order._id, 'cancelled')}
          disabled={updatingOrderId === order._id}
          className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:opacity-50 text-xs"
        >
          <XCircle size={12} />
          বাতিল
        </button>
      );
    }
    
    return buttons;
  };

  // Group orders by date
  const groupOrdersByDate = () => {
    const grouped: { [key: string]: CODOrder[] } = {};
    
    orders.forEach(order => {
      const dateKey = new Date(order.deliveryDate).toLocaleDateString('bn-BD');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(order);
    });
    
    return grouped;
  };

  // Group orders by meal time within a date
  const groupByMealTime = (ordersForDate: CODOrder[]) => {
    const grouped: { [key: string]: CODOrder[] } = {
      morning: [],
      lunch: [],
      dinner: []
    };
    
    ordersForDate.forEach(order => {
      if (order.deliveryTime === 'morning') grouped.morning.push(order);
      else if (order.deliveryTime === 'lunch') grouped.lunch.push(order);
      else if (order.deliveryTime === 'dinner') grouped.dinner.push(order);
    });
    
    return grouped;
  };

  // Toggle date expansion
  const toggleDate = (dateKey: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(dateKey)) {
      newExpanded.delete(dateKey);
    } else {
      newExpanded.add(dateKey);
    }
    setExpandedDates(newExpanded);
  };

  // Toggle meal time expansion within a date
  const toggleMealTime = (dateKey: string, mealTime: string) => {
    const newExpanded = new Map(expandedMealTimes);
    if (!newExpanded.has(dateKey)) {
      newExpanded.set(dateKey, new Set());
    }
    const mealSet = newExpanded.get(dateKey)!;
    if (mealSet.has(mealTime)) {
      mealSet.delete(mealTime);
    } else {
      mealSet.add(mealTime);
    }
    setExpandedMealTimes(newExpanded);
  };

  const groupedOrders = groupOrdersByDate();
  const sortedDates = Object.keys(groupedOrders).sort((a, b) => {
    // Convert Bengali dates to comparable format
    const dateA = new Date(a.split(' ').reverse().join('-'));
    const dateB = new Date(b.split(' ').reverse().join('-'));
    return dateB.getTime() - dateA.getTime(); // Most recent first
  });

  const filteredGroupedOrders = () => {
    const filtered: { [key: string]: CODOrder[] } = {};
    
    Object.keys(groupedOrders).forEach(dateKey => {
      const filteredOrdersForDate = groupedOrders[dateKey].filter(order => {
        const matchesSearch = order.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             order.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             order.phoneNumber?.includes(searchTerm);
        const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
        let matchesOrderType = true;
        if (filterOrderType === 'guest') {
          matchesOrderType = order.orderType === 'guest';
        } else if (filterOrderType === 'self') {
          matchesOrderType = order.orderType === 'self';
        }
        return matchesSearch && matchesStatus && matchesOrderType;
      });
      
      if (filteredOrdersForDate.length > 0) {
        filtered[dateKey] = filteredOrdersForDate;
      }
    });
    
    return filtered;
  };

  const filteredGrouped = filteredGroupedOrders();
  const filteredSortedDates = Object.keys(filteredGrouped).sort((a, b) => {
    const dateA = new Date(a.split(' ').reverse().join('-'));
    const dateB = new Date(b.split(' ').reverse().join('-'));
    return dateB.getTime() - dateA.getTime();
  });

  const totalCODOrders = orders.length;
  const pendingCODOrders = orders.filter(o => o.status === 'pending').length;
  const deliveredCODOrders = orders.filter(o => o.status === 'delivered').length;
  const guestCODOrders = orders.filter(o => o.orderType === 'guest').length;
  const totalCODRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + o.totalAmount + (o.deliveryCharge || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#3B82F6] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">অর্ডার লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ক্যাশ অন ডেলিভারি অর্ডার</h1>
          <p className="text-gray-500 mt-1">তারিখ এবং খাবারের সময় অনুযায়ী অর্ডার দেখুন</p>
        </div>
        <button
          onClick={fetchCODOrders}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          রিফ্রেশ
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-full">
              <ShoppingBag className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">মোট সিওডি অর্ডার</p>
              <p className="text-2xl font-bold text-gray-800">{totalCODOrders}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-3 rounded-full">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">পেন্ডিং অর্ডার</p>
              <p className="text-2xl font-bold text-gray-800">{pendingCODOrders}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">ডেলিভারি সম্পন্ন</p>
              <p className="text-2xl font-bold text-gray-800">{deliveredCODOrders}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-full">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">গেস্ট অর্ডার</p>
              <p className="text-2xl font-bold text-gray-800">{guestCODOrders}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-3 rounded-full">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">মোট রেভিনিউ</p>
              <p className="text-2xl font-bold text-green-600">৳ {totalCODRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="অর্ডার আইডি, নাম বা ফোন নম্বর দিয়ে সার্চ করুন..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800 appearance-none bg-white"
            >
              <option value="all">সব স্ট্যাটাস</option>
              <option value="pending">পেন্ডিং</option>
              <option value="confirmed">কনফার্মড</option>
              <option value="preparing">প্রস্তুত হচ্ছে</option>
              <option value="out_for_delivery">ডেলিভারিতে</option>
              <option value="delivered">ডেলিভারি হয়েছে</option>
              <option value="cancelled">বাতিল</option>
            </select>
          </div>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <select
              value={filterOrderType}
              onChange={(e) => setFilterOrderType(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800 appearance-none bg-white"
            >
              <option value="all">সব অর্ডার</option>
              <option value="self">নিয়মিত অর্ডার</option>
              <option value="guest">গেস্ট অর্ডার</option>
            </select>
          </div>
        </div>
      </div>

      {/* Date Wise Grouped Orders */}
      {filteredSortedDates.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-gray-500">কোনো সিওডি অর্ডার পাওয়া যায়নি</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSortedDates.map((dateKey) => {
            const ordersForDate = filteredGrouped[dateKey];
            const mealGrouped = groupByMealTime(ordersForDate);
            const isDateExpanded = expandedDates.has(dateKey);
            const totalOrdersCount = ordersForDate.length;
            
            return (
              <div key={dateKey} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                {/* Date Header - Click to expand/collapse */}
                <button
                  onClick={() => toggleDate(dateKey)}
                  className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-6 h-6 text-[#3B82F6]" />
                    <div className="text-left">
                      <p className="text-lg font-bold text-gray-800">{dateKey}</p>
                      <p className="text-sm text-gray-500">{totalOrdersCount}টি অর্ডার</p>
                    </div>
                  </div>
                  {isDateExpanded ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                </button>

                {/* Meal Time Sections - Show when date is expanded */}
                {isDateExpanded && (
                  <div className="p-4 space-y-3 border-t border-gray-200">
                    {/* Morning Section */}
                    {mealGrouped.morning.length > 0 && (
                      <MealTimeSection
                        title="সকালের খাবার"
                        icon={Coffee}
                        iconColor="text-amber-500"
                        bgColor="bg-amber-50"
                        borderColor="border-amber-200"
                        orders={mealGrouped.morning}
                        dateKey={dateKey}
                        mealTime="morning"
                        isExpanded={expandedMealTimes.get(dateKey)?.has('morning') || false}
                        onToggle={() => toggleMealTime(dateKey, 'morning')}
                        onOrderClick={openDetailsModal}
                        getStatusColor={getStatusColor}
                        getStatusText={getStatusText}
                        getOrderTypeBadge={getOrderTypeBadge}
                        getStatusButtons={getStatusButtons}
                        updatingOrderId={updatingOrderId}
                      />
                    )}

                    {/* Lunch Section */}
                    {mealGrouped.lunch.length > 0 && (
                      <MealTimeSection
                        title="দুপুরের খাবার"
                        icon={Sun}
                        iconColor="text-yellow-500"
                        bgColor="bg-yellow-50"
                        borderColor="border-yellow-200"
                        orders={mealGrouped.lunch}
                        dateKey={dateKey}
                        mealTime="lunch"
                        isExpanded={expandedMealTimes.get(dateKey)?.has('lunch') || false}
                        onToggle={() => toggleMealTime(dateKey, 'lunch')}
                        onOrderClick={openDetailsModal}
                        getStatusColor={getStatusColor}
                        getStatusText={getStatusText}
                        getOrderTypeBadge={getOrderTypeBadge}
                        getStatusButtons={getStatusButtons}
                        updatingOrderId={updatingOrderId}
                      />
                    )}

                    {/* Dinner Section */}
                    {mealGrouped.dinner.length > 0 && (
                      <MealTimeSection
                        title="রাতের খাবার"
                        icon={Moon}
                        iconColor="text-blue-500"
                        bgColor="bg-blue-50"
                        borderColor="border-blue-200"
                        orders={mealGrouped.dinner}
                        dateKey={dateKey}
                        mealTime="dinner"
                        isExpanded={expandedMealTimes.get(dateKey)?.has('dinner') || false}
                        onToggle={() => toggleMealTime(dateKey, 'dinner')}
                        onOrderClick={openDetailsModal}
                        getStatusColor={getStatusColor}
                        getStatusText={getStatusText}
                        getOrderTypeBadge={getOrderTypeBadge}
                        getStatusButtons={getStatusButtons}
                        updatingOrderId={updatingOrderId}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Order Details Modal - Same as before */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 text-black">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-800">অর্ডার বিস্তারিত</h2>
                <p className="text-sm text-gray-500">অর্ডার আইডি: #{selectedOrder.orderId || selectedOrder._id.slice(-8)}</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${selectedOrder.status === 'delivered' ? 'bg-green-500' : selectedOrder.status === 'cancelled' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                    <p className="text-sm font-medium text-gray-600">বর্তমান স্ট্যাটাস</p>
                  </div>
                  <p className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedOrder.status)}`}>
                    {getStatusText(selectedOrder.status)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-medium text-gray-600 mb-2">পেমেন্ট তথ্য</p>
                  <p className="text-2xl font-bold text-[#3B82F6]">৳ {selectedOrder.totalAmount + (selectedOrder.deliveryCharge || 0)}</p>
                  <p className="text-sm text-gray-500">ডেলিভারি চার্জ: ৳ {selectedOrder.deliveryCharge || 0}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-3">গ্রাহকের তথ্য</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><p className="text-xs text-gray-500">নাম</p><p className="text-sm font-medium">{selectedOrder.userName}</p></div>
                  <div><p className="text-xs text-gray-500">ফোন</p><p className="text-sm font-medium">{selectedOrder.phoneNumber}</p></div>
                  <div><p className="text-xs text-gray-500">জোন</p><p className="text-sm font-medium">{selectedOrder.zone}</p></div>
                  <div><p className="text-xs text-gray-500">ঠিকানা</p><p className="text-sm font-medium">{selectedOrder.address}</p></div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-3">আইটেম সমূহ</h3>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                      <div><p className="font-medium">{item.name}</p><p className="text-xs text-gray-500">পরিমাণ: {item.quantity}</p></div>
                      <p className="font-semibold text-[#3B82F6]">৳ {item.price * item.quantity}</p>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-3 mt-2 border-t border-gray-300">
                    <p className="font-bold">মোট</p>
                    <p className="text-xl font-bold text-[#3B82F6]">৳ {selectedOrder.totalAmount + (selectedOrder.deliveryCharge || 0)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setShowDetailsModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">বন্ধ করুন</button>
              {selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
                <button onClick={() => { setShowDetailsModal(false); updateOrderStatus(selectedOrder._id, 'cancelled'); }} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">অর্ডার বাতিল করুন</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Meal Time Section Component
interface MealTimeSectionProps {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  orders: CODOrder[];
  dateKey: string;
  mealTime: string;
  isExpanded: boolean;
  onToggle: () => void;
  onOrderClick: (order: CODOrder) => void;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
  getOrderTypeBadge: (orderType?: string) => { color: string; icon: React.ElementType; text: string };
  getStatusButtons: (order: CODOrder) => React.ReactNode[];
  updatingOrderId: string | null;
}

function MealTimeSection({
  title,
  icon: Icon,
  iconColor,
  bgColor,
  borderColor,
  orders,
  dateKey,
  mealTime,
  isExpanded,
  onToggle,
  onOrderClick,
  getStatusColor,
  getStatusText,
  getOrderTypeBadge,
  getStatusButtons,
  updatingOrderId
}: MealTimeSectionProps) {
  const OrderTypeIcon = getOrderTypeBadge('self').icon;
  
  return (
    <div className={`border ${borderColor} rounded-xl overflow-hidden`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-3 ${bgColor} hover:opacity-80 transition`}
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          <span className="font-semibold text-gray-800">{title}</span>
          <span className="text-sm text-gray-500">({orders.length}টি অর্ডার)</span>
        </div>
        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {isExpanded && (
        <div className="p-3 space-y-2">
          {orders.map((order) => {
            const orderTypeBadge = getOrderTypeBadge(order.orderType);
            
            return (
              <div key={order._id} className="bg-white rounded-lg border border-gray-100 p-3 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-500">#{order.orderId?.slice(-8)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                      {order.orderType === 'guest' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                          গেস্ট
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-800">{order.userName}</p>
                    <p className="text-xs text-gray-500">{order.phoneNumber}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                      {order.items?.map(i => i.name).join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#3B82F6]">৳ {order.totalAmount + (order.deliveryCharge || 0)}</p>
                    <button
                      onClick={() => onOrderClick(order)}
                      className="mt-1 text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Eye size={12} />
                      বিস্তারিত
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-100">
                  {getStatusButtons(order).map((btn, idx) => (
                    <div key={idx}>{btn}</div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}