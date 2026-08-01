// app/dashboard/zones/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Check,
  Clock,
  Search,
  Filter
} from 'lucide-react';
import { zoneAPI } from '../../lib/api';
import toast from 'react-hot-toast';

interface Zone {
  _id: string;
  name: string;
  nameBn: string;
  deliveryCharge: number;
  isActive: boolean;
  isCustom: boolean;
  createdAt: string;
}

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [filteredZones, setFilteredZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [formData, setFormData] = useState({
    name: '',
    nameBn: '',
    deliveryCharge: '50',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchZones();
  }, []);

  useEffect(() => {
    filterZones();
  }, [zones, searchTerm, statusFilter]);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const response = await zoneAPI.adminGetAllZones();
      if (response.success) {
        setZones(response.data);
      }
    } catch (error) {
      console.error('Error fetching zones:', error);
      toast.error('জোন লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const filterZones = () => {
    let filtered = [...zones];
    
    // Apply status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(z => z.isActive);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(z => !z.isActive);
    }
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(z => 
        z.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (z.nameBn && z.nameBn.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    setFilteredZones(filtered);
  };

  const handleEdit = (zone: Zone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      nameBn: zone.nameBn || '',
      deliveryCharge: zone.deliveryCharge.toString(),
      isActive: zone.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`"${name}" জোনটি ডিলিট করতে চান?`)) {
      try {
        const response = await zoneAPI.adminDeleteZone(id);
        if (response.success) {
          toast.success('জোন ডিলিট করা হয়েছে');
          await fetchZones();
        }
      } catch (error) {
        toast.error('জোন ডিলিট করতে ব্যর্থ হয়েছে');
      }
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await zoneAPI.adminToggleZoneStatus(id);
      if (response.success) {
        toast.success(`জোন ${currentStatus ? 'নিষ্ক্রিয়' : 'সক্রিয়'} করা হয়েছে`);
        await fetchZones();
      }
    } catch (error) {
      toast.error('স্ট্যাটাস পরিবর্তন করতে ব্যর্থ হয়েছে');
    }
  };

  const handleApprove = async (id: string) => {
    const deliveryCharge = prompt('ডেলিভারি চার্জ দিন (৳):', '50');
    if (deliveryCharge === null) return;
    
    try {
      const response = await zoneAPI.approveZone(id, parseInt(deliveryCharge));
      if (response.success) {
        toast.success('জোন অনুমোদন করা হয়েছে');
        await fetchZones();
      }
    } catch (error) {
      toast.error('অনুমোদন করতে ব্যর্থ হয়েছে');
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('দয়া করে জোনের নাম দিন');
      return;
    }

    try {
      setSubmitting(true);
      let response;
      
      if (editingZone) {
        response = await zoneAPI.adminUpdateZone(editingZone._id, {
          name: formData.name,
          nameBn: formData.nameBn,
          deliveryCharge: parseInt(formData.deliveryCharge),
          isActive: formData.isActive,
        });
      } else {
        response = await zoneAPI.adminCreateZone({
          name: formData.name,
          nameBn: formData.nameBn,
          deliveryCharge: parseInt(formData.deliveryCharge),
        });
      }
      
      if (response.success) {
        toast.success(editingZone ? 'জোন আপডেট হয়েছে' : 'জোন তৈরি হয়েছে');
        setShowModal(false);
        setEditingZone(null);
        setFormData({ name: '', nameBn: '', deliveryCharge: '50', isActive: true });
        await fetchZones();
      }
    } catch (error: any) {
      toast.error(error.message || 'সেভ করতে ব্যর্থ হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-12 h-12 text-[#3B82F6] animate-spin" />
      </div>
    );
  }

  // Separate zones into pending and active/inactive
  const pendingZones = zones.filter(z => !z.isActive && z.isCustom);
  const regularZones = filteredZones.filter(z => z.isActive || (!z.isCustom && !z.isActive));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">জোন ম্যানেজমেন্ট</h1>
          <p className="text-gray-500 mt-1">ডেলিভারি জোন যোগ করুন, এডিট করুন ও ম্যানেজ করুন</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchZones}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            <RefreshCw size={18} />
            রিফ্রেশ
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white rounded-lg"
          >
            <Plus size={18} />
            নতুন জোন
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-full">
              <MapPin className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">মোট জোন</p>
              <p className="text-2xl font-bold text-gray-800">{zones.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">সক্রিয় জোন</p>
              <p className="text-2xl font-bold text-gray-800">{zones.filter(z => z.isActive).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-3 rounded-full">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">পেন্ডিং জোন</p>
              <p className="text-2xl font-bold text-gray-800">{pendingZones.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-full">
              <Eye className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">ইউজার সংযোজিত</p>
              <p className="text-2xl font-bold text-gray-800">
                {zones.filter(z => z.isCustom).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Zones Section */}
      {pendingZones.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-yellow-50 px-6 py-3 border-b">
            <h2 className="font-semibold text-yellow-800">⏳ পেন্ডিং জোন (অনুমোদনের অপেক্ষায়)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">জোনের নাম</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">টাইপ</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">স্ট্যাটাস</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">একশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pendingZones.map((zone) => (
                  <tr key={zone._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-800">{zone.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                        ইউজার সংযোজিত
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                        পেন্ডিং
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleApprove(zone._id)}
                        className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        <Check size={14} />
                        অনুমোদন
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters for Regular Zones */}
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="জোনের নাম দিয়ে সার্চ করুন..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800"
            />
          </div>
          <div className="flex gap-2">
            <Filter size={20} className="text-gray-400 mt-2" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-gray-800"
            >
              <option value="all">সব জোন</option>
              <option value="active">সক্রিয় জোন</option>
              <option value="inactive">নিষ্ক্রিয় জোন</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active/Inactive Zones Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gray-50 px-6 py-3 border-b">
          <h2 className="font-semibold text-gray-800">
            {statusFilter === 'active' ? '✅ সক্রিয় জোন' : statusFilter === 'inactive' ? '❌ নিষ্ক্রিয় জোন' : '📋 সব জোন'}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">জোনের নাম</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">বাংলা নাম</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">ডেলিভারি চার্জ</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">টাইপ</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">স্ট্যাটাস</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">একশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {regularZones.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    কোন জোন পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                regularZones.map((zone) => (
                  <tr key={zone._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-800">{zone.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{zone.nameBn || '-'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#3B82F6]">৳ {zone.deliveryCharge}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${zone.isCustom ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {zone.isCustom ? 'ইউজার সংযোজিত' : 'অ্যাডমিন'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${zone.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {zone.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleStatus(zone._id, zone.isActive)}
                          className="p-1 text-gray-500 hover:text-yellow-600"
                          title={zone.isActive ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                        >
                          {zone.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          onClick={() => handleEdit(zone)}
                          className="p-1 text-blue-500 hover:text-blue-700"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(zone._id, zone.name)}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4 text-black">
              <h3 className="text-xl font-bold">
                {editingZone ? 'জোন এডিট করুন' : 'নতুন জোন যোগ করুন'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <XCircle size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-1">জোনের নাম (ইংরেজি)</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-black px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  placeholder="যেমন: Uttara"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">জোনের নাম (বাংলা) - ঐচ্ছিক</label>
                <input
                  type="text"
                  value={formData.nameBn}
                  onChange={(e) => setFormData({ ...formData, nameBn: e.target.value })}
                  className="w-full text-black px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  placeholder="যেমন: উত্তরা"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">ডেলিভারি চার্জ (৳)</label>
                <input
                  type="number"
                  value={formData.deliveryCharge}
                  onChange={(e) => setFormData({ ...formData, deliveryCharge: e.target.value })}
                  className="w-full text-black px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  min="0"
                />
              </div>
              {editingZone && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-[#3B82F6] rounded"
                  />
                  <span className="text-gray-700">সক্রিয়</span>
                </label>
              )}
              <button
                onClick={handleSave}
                disabled={submitting}
                className="w-full bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white py-2 rounded-lg font-semibold"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (editingZone ? 'আপডেট করুন' : 'জোন যোগ করুন')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}