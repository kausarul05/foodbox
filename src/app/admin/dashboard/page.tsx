'use client';

import React, { useEffect, useState } from 'react';
import { DollarSign, ShoppingBag, Users, Clock, TrendingUp, Package } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatsCard from '@/app/admin/components/admin/StatsCard';
import { dashboardAPI, orderAPI, subscriptionAPI } from '@/app/admin/lib/api';
import toast from 'react-hot-toast';

// Define the Order type
interface Order {
  _id?: string;
  id?: string;
  orderId?: string;
  userName: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

// Define the Stats type
interface Stats {
  totalOrders: number;
  totalRevenue: number;
  activeSubscribers: number;
  pendingSubscribers: number;
}

// Define Chart Data type
interface ChartData {
  month: string;
  orders: number;
  revenue: number;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    totalRevenue: 0,
    activeSubscribers: 0,
    pendingSubscribers: 0,
  });
  
  const [chartData, setChartData] = useState<ChartData[]>([
    { month: 'Jan', orders: 0, revenue: 0 },
    { month: 'Feb', orders: 0, revenue: 0 },
    { month: 'Mar', orders: 0, revenue: 0 },
    { month: 'Apr', orders: 0, revenue: 0 },
    { month: 'May', orders: 0, revenue: 0 },
    { month: 'Jun', orders: 0, revenue: 0 },
  ]);
  
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [statsResponse, orderStatsResponse, subscriptionStatsResponse, ordersResponse] = await Promise.all([
        dashboardAPI.getStats(),
        orderAPI.getOrderStats(),
        subscriptionAPI.getSubscriptionStats(),
        orderAPI.getAllOrders({ limit: 5 })
      ]);
      
      console.log('Stats:', statsResponse);
      console.log('Order Stats:', orderStatsResponse);
      console.log('Subscription Stats:', subscriptionStatsResponse);
      
      // Update stats
      setStats({
        totalOrders: statsResponse.data?.orders?.total || 0,
        totalRevenue: statsResponse.data?.revenue?.total || 0,
        activeSubscribers: subscriptionStatsResponse.data?.activeSubscriptions || 0,
        pendingSubscribers: subscriptionStatsResponse.data?.pendingSubscriptions || 0,
      });
      
      // Update chart data if available
      if (orderStatsResponse.data?.monthlyOrders) {
        const monthlyData = orderStatsResponse.data.monthlyOrders;
        const updatedChartData = chartData.map((item, index) => ({
          ...item,
          orders: monthlyData[index]?.count || 0,
          revenue: monthlyData[index]?.revenue || 0,
        }));
        setChartData(updatedChartData);
      }
      
      // Update recent orders
      if (ordersResponse.data && ordersResponse.data.length > 0) {
        setRecentOrders(ordersResponse.data.slice(0, 5));
      } else {
        // Fallback mock data for development/demo
        setRecentOrders([
          // { id: 'ORD001', userName: 'রহিম', totalAmount: 350, status: 'pending', createdAt: '2024-01-15' },
          // { id: 'ORD002', userName: 'করিম', totalAmount: 2500, status: 'delivered', createdAt: '2024-01-14' },
          // { id: 'ORD003', userName: 'জবা', totalAmount: 3500, status: 'preparing', createdAt: '2024-01-14' },
        ]);
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('ডাটা লোড করতে ব্যর্থ হয়েছে');
      
      // Fallback to mock data if API fails
      setStats({
        totalOrders: 0,
        totalRevenue: 0,
        activeSubscribers: 0,
        pendingSubscribers: 0,
      });
      
      setChartData([
        { month: 'Jan', orders: 0, revenue: 0 },
        { month: 'Feb', orders: 0, revenue: 0 },
        { month: 'Mar', orders: 0, revenue: 0 },
        { month: 'Apr', orders: 0, revenue: 0 },
        { month: 'May', orders: 0, revenue: 0 },
        { month: 'Jun', orders: 0, revenue: 0 },
      ]);
      
      setRecentOrders([
        { id: 'ORD001', userName: 'রহিম', totalAmount: 350, status: 'pending', createdAt: '2024-01-15' },
        { id: 'ORD002', userName: 'করিম', totalAmount: 2500, status: 'delivered', createdAt: '2024-01-14' },
        { id: 'ORD003', userName: 'জবা', totalAmount: 3500, status: 'preparing', createdAt: '2024-01-14' },
      ]);
    } finally {
      setLoading(false);
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

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'preparing': return 'bg-blue-100 text-blue-700';
      case 'out_for_delivery': return 'bg-purple-100 text-purple-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3B82F6] mx-auto"></div>
          <p className="mt-4 text-gray-600">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-[#3B82F6] to-[#111827] rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">ড্যাশবোর্ড ওভারভিউ</h1>
        <p className="text-blue-200">আজকের সমস্ত আপডেট এখানে দেখুন</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="মোট অর্ডার"
          value={stats.totalOrders}
          icon={ShoppingBag}
          color="blue"
          change="+12%"
        />
        <StatsCard
          title="মোট রেভিনিউ"
          value={`৳ ${stats.totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          color="green"
          change="+18%"
        />
        <StatsCard
          title="একটিভ সাবস্ক্রাইবার"
          value={stats.activeSubscribers}
          icon={Users}
          color="purple"
          change="+5%"
        />
        <StatsCard
          title="পেন্ডিং রিকোয়েস্ট"
          value={stats.pendingSubscribers}
          icon={Clock}
          color="orange"
          change="+2"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">অর্ডার ট্রেন্ড</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="orders" stroke="#3B82F6" fill="#3B82F680" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">রেভিনিউ ট্রেন্ড</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="#10B98180" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">সাম্প্রতিক অর্ডার</h3>
          <button 
            onClick={() => window.location.href = '/admin/dashboard/orders'}
            className="text-[#3B82F6] hover:text-blue-700 text-sm font-medium"
          >
            সব দেখুন →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-black min-w-[600px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">অর্ডার আইডি</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">ইউজার</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">এমাউন্ট</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">স্ট্যাটাস</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">তারিখ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentOrders.map((order, index) => (
                <tr key={order._id || order.id || index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{order.orderId || order.id || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm">{order.userName}</td>
                  <td className="px-4 py-3 text-sm">৳ {order.totalAmount}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(order.createdAt).toLocaleDateString('bn-BD')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {recentOrders.length === 0 && (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">কোনো অর্ডার পাওয়া যায়নি</p>
          </div>
        )}
      </div>
    </div>
  );
}