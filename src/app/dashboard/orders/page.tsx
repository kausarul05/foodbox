// app/dashboard/orders/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { ShoppingBag, Clock, CheckCircle, XCircle, Loader2, Calendar, MapPin, Phone } from 'lucide-react';
import { orderAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Order {
  _id: string;
  orderId: string;
  deliveryDate: string;
  deliveryTime: string;
  items: Array<{ name: string }>;
  status: string;
  totalAmount: number;
  address: string;
  zone: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await orderAPI.getMyOrders();
      console.log('Orders response:', response);
      
      if (response.success && response.data) {
        setOrders(response.data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('অর্ডার লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'confirmed': return 'bg-blue-100 text-blue-700';
      case 'preparing': return 'bg-purple-100 text-purple-700';
      case 'out_for_delivery': return 'bg-indigo-100 text-indigo-700';
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
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

  const getMealTimeText = (time: string) => {
    switch(time) {
      case 'morning': return 'সকালের খাবার';
      case 'lunch': return 'দুপুরের খাবার';
      case 'dinner': return 'রাতের খাবার';
      default: return time;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-12 h-12 text-[#3B82F6] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-[#3B82F6] to-[#111827] p-2 rounded-xl">
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">আমার অর্ডার</h1>
            <p className="text-gray-500 text-sm">আপনার সব অর্ডারের ইতিহাস</p>
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center mb-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 p-4">
            <ShoppingBag className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">কোনো অর্ডার নেই</h3>
          <p className="text-gray-500 mb-6">আপনি এখনো কোনো অর্ডার করেননি</p>
          <Link href="/order">
            <button className="bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white px-6 py-2 rounded-lg font-semibold mb-4">
              প্রথম অর্ডার করুন
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order._id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-mono text-gray-500">#{order.orderId}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <Calendar size={14} />
                    <span>{new Date(order.deliveryDate).toLocaleDateString('bn-BD')}</span>
                    <span className="mx-1">•</span>
                    <Clock size={14} />
                    <span>{getMealTimeText(order.deliveryTime)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-[#3B82F6]">
                    {order.totalAmount === 0 ? 'ফ্রি' : `৳ ${order.totalAmount}`}
                  </p>
                </div>
              </div>

              <div className="border-t pt-3 mt-2">
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <MapPin size={14} />
                    <span>{order.zone}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>📍</span>
                    <span className="truncate">{order.address}</span>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  <span className="font-medium">খাবার:</span> {order.items?.map(i => i.name).join(', ') || 'N/A'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}