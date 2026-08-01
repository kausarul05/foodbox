'use client';

import React, { useState, useEffect } from 'react';
import { Package, Edit, Trash2, Plus, Crown, Diamond, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { packageAPI } from '@/app/admin/lib/api';

interface PackageType {
  _id: string;
  name: string;  // Changed from 'golden' | 'diamond' to string
  title: string;
  price: number;
  originalPrice: number;
  features: string[];
  isActive: boolean;
  icon?: string;
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    price: '',
    originalPrice: '',
    features: '',
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await packageAPI.getAllPackages();
      console.log('Packages response:', response);
      
      if (response.success && response.data) {
        setPackages(response.data);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('প্যাকেজ লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingPackage(null);
    setFormData({
      name: '',
      title: '',
      price: '',
      originalPrice: '',
      features: '',
    });
    setShowModal(true);
  };

  const handleEdit = (pkg: PackageType) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      title: pkg.title,
      price: pkg.price.toString(),
      originalPrice: pkg.originalPrice.toString(),
      features: pkg.features.join(', '),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.title || !formData.price || !formData.originalPrice) {
      toast.error('দয়া করে সব ফিল্ড পূরণ করুন');
      return;
    }

    try {
      setSubmitting(true);
      
      const packageData = {
        name: formData.name.toLowerCase().trim(),
        title: formData.title,
        price: parseInt(formData.price),
        originalPrice: parseInt(formData.originalPrice),
        features: formData.features.split(',').map(f => f.trim()).filter(f => f),
      };

      if (editingPackage) {
        const response = await packageAPI.updatePackage(editingPackage._id, packageData);
        if (response.success) {
          toast.success('প্যাকেজ আপডেট হয়েছে!');
          fetchPackages();
        } else {
          toast.error(response.message || 'আপডেট ব্যর্থ হয়েছে');
        }
      } else {
        const response = await packageAPI.createPackage(packageData);
        if (response.success) {
          toast.success('নতুন প্যাকেজ তৈরি হয়েছে!');
          fetchPackages();
        } else {
          toast.error(response.message || 'তৈরি করতে ব্যর্থ হয়েছে');
        }
      }
      
      setShowModal(false);
      setEditingPackage(null);
      setFormData({
        name: '',
        title: '',
        price: '',
        originalPrice: '',
        features: '',
      });
    } catch (error: any) {
      console.error('Error saving package:', error);
      toast.error(error.message || 'সেভ করতে ব্যর্থ হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`"${title}" প্যাকেজটি ডিলিট করতে চান?`)) {
      try {
        const response = await packageAPI.deletePackage(id);
        if (response.success) {
          toast.success('প্যাকেজ ডিলিট করা হয়েছে!');
          fetchPackages();
        } else {
          toast.error(response.message || 'ডিলিট ব্যর্থ হয়েছে');
        }
      } catch (error) {
        console.error('Error deleting package:', error);
        toast.error('প্যাকেজ ডিলিট করতে ব্যর্থ হয়েছে');
      }
    }
  };

  const getIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('golden') || lowerName.includes('গোল্ডেন')) {
      return <Crown size={32} />;
    }
    return <Diamond size={32} />;
  };

  const getIconColor = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('golden') || lowerName.includes('গোল্ডেন')) {
      return 'from-amber-500 to-orange-500';
    }
    return 'from-blue-500 to-purple-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#3B82F6] animate-spin mx-auto mb-4" />
          <p className="text-gray-500">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">প্যাকেজ ম্যানেজমেন্ট</h1>
          <p className="text-gray-500 mt-1">প্যাকেজ যোগ করুন, এডিট করুন ও ম্যানেজ করুন</p>
        </div>
        
        <button
          onClick={handleAddNew}
          className="bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center gap-2"
        >
          <Plus size={18} />
          নতুন প্যাকেজ
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {packages.map((pkg) => (
          <div key={pkg._id} className={`bg-white rounded-2xl shadow-lg overflow-hidden border-2 ${pkg.isActive ? 'border-[#3B82F6]' : 'border-gray-300'}`}>
            <div className={`p-6 bg-gradient-to-r ${getIconColor(pkg.name)} text-white`}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  {getIcon(pkg.name)}
                  <div>
                    <h2 className="text-2xl font-bold">{pkg.title}</h2>
                    <p className="text-white/80 text-sm">
                      {pkg.isActive ? '✅ সক্রিয়' : '❌ নিষ্ক্রিয়'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(pkg._id, pkg.title)}
                  className="px-3 py-1 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <span className="text-3xl font-bold text-[#3B82F6]">৳ {pkg.price}</span>
                <span className="text-gray-400 line-through ml-2">৳ {pkg.originalPrice}</span>
              </div>

              <ul className="space-y-2 mb-6">
                {pkg.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-gray-700">
                    <div className="w-1.5 h-1.5 bg-[#3B82F6] rounded-full"></div>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleEdit(pkg)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Edit size={18} />
                এডিট করুন
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-black">
                {editingPackage ? 'প্যাকেজ এডিট করুন' : 'নতুন প্যাকেজ যোগ করুন'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-1">প্যাকেজ নাম (ইংরেজি)</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="যেমন: premium, standard, basic"
                  className="w-full text-black px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
                <p className="text-xs text-gray-500 mt-1">প্যাকেজের ইউনিক আইডেন্টিফায়ার (ছোট হাতের অক্ষরে)</p>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">টাইটেল (বাংলা/ইংরেজি)</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="যেমন: প্রিমিয়াম প্যাকেজ"
                  className="w-full text-black px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">মূল্য (৳)</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="যেমন: 2500"
                  className="w-full text-black px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">মূল মূল্য (৳)</label>
                <input
                  type="number"
                  value={formData.originalPrice}
                  onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                  placeholder="যেমন: 3500"
                  className="w-full text-black px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  ফিচারসমূহ (কমা দিয়ে আলাদা করুন)
                </label>
                <textarea
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  rows={4}
                  placeholder="যেমন: সপ্তাহের ৭ দিন ডেলিভারি, প্রতিদিন ৩ বেলা খাবার, ফ্রি হোম ডেলিভারি"
                  className="w-full text-black px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={submitting}
                className="w-full bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    সেভ হচ্ছে...
                  </>
                ) : (
                  <>
                    <Package size={18} />
                    {editingPackage ? 'আপডেট করুন' : 'প্যাকেজ তৈরি করুন'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}