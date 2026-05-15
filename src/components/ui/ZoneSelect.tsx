'use client';

import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Loader2, X, Edit2 } from 'lucide-react';
import { zoneAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface Zone {
  _id: string;
  name: string;
  deliveryCharge: number;
  isActive: boolean;
}

interface ZoneSelectProps {
  value: string;
  onChange: (value: string, customZoneName?: string) => void;
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
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherZoneName, setOtherZoneName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customZoneId, setCustomZoneId] = useState<string | null>(null);

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const response = await zoneAPI.getAllZones();
      if (response.success) {
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
    const selectedValue = e.target.value;
    
    if (selectedValue === 'other') {
      setShowOtherInput(true);
      onChange('', '');
    } else {
      setShowOtherInput(false);
      setOtherZoneName('');
      onChange(selectedValue, '');
      
      if (onZoneData) {
        const selectedZone = zones.find(z => z._id === selectedValue);
        onZoneData(selectedZone || null);
      }
    }
  };

  const handleOtherZoneSubmit = async () => {
    if (!otherZoneName.trim()) {
      toast.error('দয়া করে আপনার এলাকার নাম দিন');
      return;
    }

    try {
      setIsSubmitting(true);
      // Create zone immediately (public API, no auth needed)
      const response = await zoneAPI.createZone({
        name: otherZoneName,
      });
      
      if (response.success) {
        toast.success('আপনার এলাকা যোগ করা হয়েছে! অ্যাডমিন অনুমোদনের পর এটি সক্রিয় হবে।');
        
        // Store the custom zone ID temporarily
        const tempZoneId = `custom_${Date.now()}`;
        setCustomZoneId(tempZoneId);
        
        // Pass the zone name to parent (will be stored with registration)
        onChange(tempZoneId, otherZoneName);
        
        // Refresh zones list in background
        fetchZones();
      }
    } catch (error: any) {
      toast.error(error.message || 'জোন যোগ করতে ব্যর্থ হয়েছে');
    } finally {
      setIsSubmitting(false);
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
    <div className="relative">
      <select
        value={value && !value.startsWith('custom_') ? value : ''}
        onChange={handleZoneChange}
        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white text-gray-800 ${className}`}
        required={required && !showOtherInput && !value}
      >
        <option value="">সিলেক্ট করুন</option>
        {zones.map((zone) => (
          <option key={zone._id} value={zone._id}>
            {zone.name} - ডেলিভারি চার্জ: ৳{zone.deliveryCharge}
          </option>
        ))}
        <option value="other" className="text-[#3B82F6] font-semibold">
          + অন্যান্য (আমার এলাকা এখানে নেই)
        </option>
      </select>

      {/* Other Zone Input Modal */}
      {showOtherInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">আপনার এলাকা যোগ করুন</h3>
              <button
                onClick={() => {
                  setShowOtherInput(false);
                  setOtherZoneName('');
                }}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  আপনার এলাকার নাম (ইংরেজি)
                </label>
                <input
                  type="text"
                  value={otherZoneName}
                  onChange={(e) => setOtherZoneName(e.target.value)}
                  placeholder="যেমন: Bashundhara, Paltan, Motijheel"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  উদাহরণ: Bashundhara, Paltan, Motijheel, Mohammadpur
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  ℹ️ আপনার এলাকা যোগ করা হবে। অ্যাডমিন অনুমোদনের পর এটি সকলের জন্য উপলব্ধ হবে। আপনি এখনই রেজিস্ট্রেশন সম্পন্ন করতে পারবেন।
                </p>
              </div>
              <button
                onClick={handleOtherZoneSubmit}
                disabled={isSubmitting}
                className="w-full bg-gradient-to-br from-[#3B82F6] to-[#111827] text-white py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'এলাকা যোগ করে রেজিস্ট্রেশন সম্পন্ন করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}