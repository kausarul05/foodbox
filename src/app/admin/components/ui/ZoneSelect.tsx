'use client';

import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Loader2, X } from 'lucide-react';
import { publicZoneAPI } from '../../lib/api';
import toast from 'react-hot-toast';

interface Zone {
  _id: string;
  name: string;
  nameBn: string;
  deliveryCharge: number;
  isActive: boolean;
  isCustom: boolean;
}

interface ZoneSelectProps {
  value: string;
  onChange: (value: string) => void;
  onZoneData?: (zone: Zone | null) => void;
  className?: string;
  required?: boolean;
  label?: string;
}

export default function ZoneSelect({ 
  value, 
  onChange, 
  onZoneData, 
  className = '', 
  required = false,
  label = 'জোন / এলাকা'
}: ZoneSelectProps) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneNameBn, setNewZoneNameBn] = useState('');
  const [newZoneDeliveryCharge, setNewZoneDeliveryCharge] = useState('50');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const response = await publicZoneAPI.getAllZones();
      if (response.success) {
        // Filter only active zones
        const activeZones = response.data.filter((zone: Zone) => zone.isActive);
        setZones(activeZones);
      }
    } catch (error) {
      console.error('Error fetching zones:', error);
      toast.error('জোন লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleZoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const zoneId = e.target.value;
    onChange(zoneId);
    
    if (onZoneData) {
      const selectedZone = zones.find(z => z._id === zoneId);
      onZoneData(selectedZone || null);
    }
  };

  const handleAddZone = async () => {
    if (!newZoneName.trim()) {
      toast.error('জোনের নাম দিন');
      return;
    }
    if (!newZoneNameBn.trim()) {
      toast.error('বাংলা জোনের নাম দিন');
      return;
    }

    try {
      setSubmitting(true);
      const response = await publicZoneAPI.createZone({
        name: newZoneName,
        nameBn: newZoneNameBn,
        deliveryCharge: parseInt(newZoneDeliveryCharge),
      });
      
      if (response.success) {
        toast.success('নতুন জোন যোগ করা হয়েছে');
        await fetchZones();
        setShowAddModal(false);
        setNewZoneName('');
        setNewZoneNameBn('');
        setNewZoneDeliveryCharge('50');
        // Auto-select the newly added zone
        onChange(response.data._id);
        if (onZoneData) {
          onZoneData(response.data);
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'জোন যোগ করতে ব্যর্থ হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="relative">
        <label className="block text-gray-700 font-medium mb-2">{label}</label>
        <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50">
          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <div className="flex gap-2">
          <select
            value={value}
            onChange={handleZoneChange}
            className={`flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white text-gray-800 ${className}`}
            required={required}
          >
            <option value="">সিলেক্ট করুন</option>
            {zones.map((zone) => (
              <option key={zone._id} value={zone._id}>
                {zone.nameBn} ({zone.name}) - ডেলিভারি চার্জ: ৳{zone.deliveryCharge}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-50 text-[#3B82F6] rounded-lg hover:bg-blue-100 transition flex items-center gap-1"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">নতুন</span>
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          আপনার এলাকা না থাকলে "নতুন" বাটনে ক্লিক করে যোগ করুন
        </p>
      </div>

      {/* Add Zone Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-black">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-black">নতুন জোন যোগ করুন</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  জোনের নাম (ইংরেজি)
                </label>
                <input
                  type="text"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder="যেমন: Uttara"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  জোনের নাম (বাংলা)
                </label>
                <input
                  type="text"
                  value={newZoneNameBn}
                  onChange={(e) => setNewZoneNameBn(e.target.value)}
                  placeholder="যেমন: উত্তরা"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  ডেলিভারি চার্জ (৳)
                </label>
                <input
                  type="number"
                  value={newZoneDeliveryCharge}
                  onChange={(e) => setNewZoneDeliveryCharge(e.target.value)}
                  placeholder="ডেলিভারি চার্জ"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  min="0"
                />
              </div>
              <div className="bg-yellow-50 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  ⚠️ আপনার যোগ করা জোন অ্যাডমিন দ্বারা অনুমোদিত হবে। অনুমোদনের পর এটি সকলের জন্য উপলব্ধ হবে।
                </p>
              </div>
              <button
                onClick={handleAddZone}
                disabled={submitting}
                className="w-full bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 disabled:opacity-50"
              >
                {submitting ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'জোন যোগ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}