'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  DollarSign, 
  Loader2, 
  RefreshCw, 
  Mail,
  X,
  Phone,
  MapPin,
  Home,
  CreditCard,
  Clock,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { subscriptionAPI } from '@/app/admin/lib/api';

interface Subscriber {
  _id: string;
  subscriptionId: string;
  userId: string;
  userName: string;
  phoneNumber: string;
  email: string;
  package: 'golden' | 'diamond';
  packageName: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  paymentStatus: 'paid' | 'pending' | 'failed';
  totalAmount: number;
  address: string;
  zone: string;
  createdAt?: string;
  approvedAt?: string;
  paymentMethod?: string;
}

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPackage, setFilterPackage] = useState('all');
  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    try {
      setLoading(true);
      const response = await subscriptionAPI.getAllSubscriptions();
      console.log('Subscribers response:', response);
      
      if (response.success && response.data) {
        const filteredSubs = response.data.filter(
          (sub: Subscriber) => sub.status !== 'pending'
        );
        setSubscribers(filteredSubs);
      } else {
        setSubscribers([]);
      }
    } catch (error) {
      console.error('Error fetching subscribers:', error);
      toast.error('সাবস্ক্রাইবার লোড করতে ব্যর্থ হয়েছে');
      setSubscribers([]);
    } finally {
      setLoading(false);
    }
  };

  const openDetailsModal = (subscriber: Subscriber) => {
    setSelectedSubscriber(subscriber);
    setShowDetailsModal(true);
  };

  const getPackageBadge = (pkg: string) => {
    return pkg === 'golden' 
      ? 'bg-amber-100 text-amber-800' 
      : 'bg-purple-100 text-purple-800';
  };

  const getPackageText = (pkg: string) => {
    return pkg === 'golden' ? 'গোল্ডেন' : 'ডায়মন্ড';
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'active': return 'সক্রিয়';
      case 'expired': return 'মেয়াদ উত্তীর্ণ';
      case 'cancelled': return 'বাতিল';
      default: return status;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch(status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentText = (status: string) => {
    switch(status) {
      case 'paid': return 'পেইড';
      case 'pending': return 'পেন্ডিং';
      case 'failed': return 'ফেইলড';
      default: return status;
    }
  };

  const handleSendMessage = (subscriber: Subscriber) => {
    toast.success(`${subscriber.userName} কে মেসেজ পাঠানো হয়েছে`);
    // Here you would implement actual messaging functionality
  };

  const filteredSubscribers = subscribers.filter(sub => {
    const matchesSearch = sub.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.phoneNumber?.includes(searchTerm) ||
                         sub.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.subscriptionId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
    const matchesPackage = filterPackage === 'all' || sub.package === filterPackage;
    
    return matchesSearch && matchesStatus && matchesPackage;
  });

  const statusOptions = [
    { value: 'all', label: 'সব স্ট্যাটাস' },
    { value: 'active', label: 'সক্রিয়' },
    { value: 'expired', label: 'মেয়াদ উত্তীর্ণ' },
    { value: 'cancelled', label: 'বাতিল' },
  ];

  const packageOptions = [
    { value: 'all', label: 'সব প্যাকেজ' },
    { value: 'golden', label: 'গোল্ডেন' },
    { value: 'diamond', label: 'ডায়মন্ড' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#3B82F6] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">সাবস্ক্রাইবার লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">সাবস্ক্রাইবার লিস্ট</h1>
          <p className="text-gray-500 mt-1">সমস্ত সক্রিয় সাবস্ক্রাইবারদের তালিকা</p>
        </div>
        <button
          onClick={fetchSubscribers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          রিফ্রেশ
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="নাম, ফোন, ইমেইল বা আইডি দিয়ে সার্চ করুন..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={filterPackage}
            onChange={(e) => setFilterPackage(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800"
          >
            {packageOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Subscribers Grid */}
      {filteredSubscribers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-gray-500">কোনো সাবস্ক্রাইবার পাওয়া যায়নি</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubscribers.map((sub) => (
            <div key={sub._id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <div className={`p-4 text-white ${sub.package === 'golden' ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-blue-500 to-purple-600'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{sub.userName}</h3>
                    <p className="text-white/80 text-sm">{sub.phoneNumber}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPackageBadge(sub.package)}`}>
                    {getPackageText(sub.package)}
                  </span>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">স্ট্যাটাস</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(sub.status)}`}>
                    {getStatusText(sub.status)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">পেমেন্ট</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPaymentBadge(sub.paymentStatus)}`}>
                    {getPaymentText(sub.paymentStatus)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Calendar size={14} className="text-gray-400" />
                  <span className="text-gray-700">
                    {new Date(sub.startDate).toLocaleDateString('bn-BD')} - {new Date(sub.endDate).toLocaleDateString('bn-BD')}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <DollarSign size={14} className="text-gray-400" />
                  <span className="text-gray-800 font-semibold">৳ {sub.totalAmount}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Mail size={14} className="text-gray-400" />
                  <span className="text-gray-600 text-xs truncate">{sub.email}</span>
                </div>

                <div className="flex gap-2 pt-2">
                  {/* <button 
                    onClick={() => handleSendMessage(sub)}
                    className="flex-1 bg-[#3B82F6] hover:bg-[#2563EB] text-white py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                  >
                    <Mail size={14} />
                    মেসেজ
                  </button> */}
                  <button 
                    onClick={() => openDetailsModal(sub)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                  >
                    <Eye size={14} />
                    বিস্তারিত
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Subscriber Details Modal */}
      {showDetailsModal && selectedSubscriber && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 text-black">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-800">সাবস্ক্রাইবার বিস্তারিত</h2>
                <p className="text-sm text-gray-500">সাবস্ক্রিপশন আইডি: #{selectedSubscriber.subscriptionId}</p>
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
              {/* Status and Package Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl ${selectedSubscriber.package === 'golden' ? 'bg-amber-50' : 'bg-purple-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${selectedSubscriber.status === 'active' ? 'bg-green-500' : selectedSubscriber.status === 'expired' ? 'bg-gray-500' : 'bg-red-500'}`} />
                    <p className="text-sm font-medium text-gray-600">বর্তমান স্ট্যাটাস</p>
                  </div>
                  <p className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadge(selectedSubscriber.status)}`}>
                    {getStatusText(selectedSubscriber.status)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-medium text-gray-600 mb-2">প্যাকেজ তথ্য</p>
                  <div className="space-y-1">
                    <p className="text-sm">প্যাকেজ: <span className="font-semibold">{selectedSubscriber.packageName}</span></p>
                    <p className="text-2xl font-bold text-[#3B82F6]">৳ {selectedSubscriber.totalAmount}</p>
                    <p className="text-sm text-gray-500">পেমেন্ট: {getPaymentText(selectedSubscriber.paymentStatus)}</p>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Users size={18} className="text-[#3B82F6]" />
                  গ্রাহকের তথ্য
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">নাম</p>
                    <p className="text-sm font-medium">{selectedSubscriber.userName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">ফোন নাম্বার</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Phone size={12} className="text-gray-400" />
                      <p className="text-sm font-medium">{selectedSubscriber.phoneNumber}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">ইমেইল</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Mail size={12} className="text-gray-400" />
                      <p className="text-sm font-medium">{selectedSubscriber.email}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">জোন</p>
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin size={12} className="text-gray-400" />
                      <p className="text-sm font-medium">{selectedSubscriber.zone}</p>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs text-gray-500">ঠিকানা</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Home size={12} className="text-gray-400" />
                      <p className="text-sm font-medium">{selectedSubscriber.address}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subscription Information */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Calendar size={18} className="text-[#3B82F6]" />
                  সাবস্ক্রিপশন তথ্য
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">সাবস্ক্রিপশন আইডি</p>
                    <p className="text-sm font-mono font-medium">{selectedSubscriber.subscriptionId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">রিকোয়েস্টের তারিখ</p>
                    <p className="text-sm font-medium">
                      {selectedSubscriber.createdAt ? new Date(selectedSubscriber.createdAt).toLocaleString('bn-BD') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">শুরুর তারিখ</p>
                    <p className="text-sm font-medium">
                      {new Date(selectedSubscriber.startDate).toLocaleDateString('bn-BD')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">শেষ তারিখ</p>
                    <p className="text-sm font-medium">
                      {new Date(selectedSubscriber.endDate).toLocaleDateString('bn-BD')}
                    </p>
                  </div>
                  {selectedSubscriber.approvedAt && (
                    <div>
                      <p className="text-xs text-gray-500">অনুমোদনের তারিখ</p>
                      <p className="text-sm font-medium">
                        {new Date(selectedSubscriber.approvedAt).toLocaleString('bn-BD')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <CreditCard size={18} className="text-[#3B82F6]" />
                  পেমেন্ট তথ্য
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">পেমেন্ট স্ট্যাটাস</p>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold mt-1 ${getPaymentBadge(selectedSubscriber.paymentStatus)}`}>
                      {getPaymentText(selectedSubscriber.paymentStatus)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">পেমেন্ট মেথড</p>
                    <p className="text-sm font-medium mt-1">{selectedSubscriber.paymentMethod || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <div className="border-t pt-3 mt-2">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-gray-800">মোট প্রদান</p>
                        <p className="text-2xl font-bold text-[#3B82F6]">৳ {selectedSubscriber.totalAmount}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                বন্ধ করুন
              </button>
              {/* <button
                onClick={() => {
                  setShowDetailsModal(false);
                  handleSendMessage(selectedSubscriber);
                }}
                className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition flex items-center gap-2"
              >
                <Mail size={16} />
                মেসেজ পাঠান
              </button> */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}