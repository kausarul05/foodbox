'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Edit, Save, X, Plus, Loader2, RefreshCw, Utensils, Package, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { menuAPI, packageAPI } from '@/app/admin/lib/api';

interface MenuItem {
  _id?: string;
  day: string;
  morning: string;
  lunch: string;
  dinner: string;
  morningPrice: number;
  lunchPrice: number;
  dinnerPrice: number;
  package: string;
  isActive?: boolean;
}

interface PackageType {
  _id: string;
  name: string;
  title: string;
  price: number;
  originalPrice: number;
  features: string[];
  isActive: boolean;
}

export default function WeeklyMenuPage() {
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [editingCell, setEditingCell] = useState<{ day: string; meal: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editingPrice, setEditingPrice] = useState<{ day: string; meal: string } | null>(null);
  const [editPriceValue, setEditPriceValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [menuData, setMenuData] = useState<{ [key: string]: MenuItem[] }>({});

  const days = ['শনিবার', 'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার'];

  // Fetch packages on load
  useEffect(() => {
    fetchPackages();
  }, []);

  // Fetch menu data when package changes
  useEffect(() => {
    if (selectedPackageId) {
      fetchMenuData();
    }
  }, [selectedPackageId]);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await packageAPI.getAllPackages();
      console.log('Packages response:', response);

      if (response.success && response.data && response.data.length > 0) {
        const activePackages = response.data.filter((pkg: PackageType) => pkg.isActive);
        setPackages(activePackages);
        if (activePackages.length > 0) {
          setSelectedPackageId(activePackages[0]._id);
        }
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('প্যাকেজ লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuData = async () => {
    try {
      setSaving(true);
      const selectedPkg = packages.find(p => p._id === selectedPackageId);
      if (!selectedPkg) return;

      const response = await menuAPI.getMenuByPackage(selectedPkg.name);
      console.log('Menu response:', response);

      if (response.success && response.data && response.data.length > 0) {
        const sortedData = response.data.sort((a: MenuItem, b: MenuItem) =>
          days.indexOf(a.day) - days.indexOf(b.day)
        );
        setMenuData(prev => ({ ...prev, [selectedPackageId]: sortedData }));
      } else {
        setMenuData(prev => ({ ...prev, [selectedPackageId]: [] }));
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
      toast.error('মেনু লোড করতে ব্যর্থ হয়েছে');
      setMenuData(prev => ({ ...prev, [selectedPackageId]: [] }));
    } finally {
      setSaving(false);
    }
  };

  const handleAddNewMenu = async () => {
    const selectedPkg = packages.find(p => p._id === selectedPackageId);
    if (!selectedPkg) return;

    const defaultMenuItems = days.map(day => ({
      day,
      package: selectedPkg.name,
      morning: 'নতুন আইটেম যোগ করুন',
      lunch: 'নতুন আইটেম যোগ করুন',
      dinner: 'নতুন আইটেম যোগ করুন',
      morningPrice: 50,
      lunchPrice: 80,
      dinnerPrice: 100,
    }));

    try {
      setSaving(true);

      for (const item of defaultMenuItems) {
        await menuAPI.createMenuItem(item);
      }

      toast.success('নতুন মেনু তৈরি হয়েছে!');
      await fetchMenuData();

    } catch (error) {
      console.error('Error creating menu:', error);
      toast.error('মেনু তৈরি করতে ব্যর্থ হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSingleDayMenu = async (day: string) => {
    const selectedPkg = packages.find(p => p._id === selectedPackageId);
    if (!selectedPkg) return;

    const defaultMenuItem = {
      day,
      package: selectedPkg.name,
      morning: 'নতুন আইটেম যোগ করুন',
      lunch: 'নতুন আইটেম যোগ করুন',
      dinner: 'নতুন আইটেম যোগ করুন',
      morningPrice: 50,
      lunchPrice: 80,
      dinnerPrice: 100,
    };

    try {
      setSaving(true);
      const response = await menuAPI.createMenuItem(defaultMenuItem);

      if (response.success) {
        toast.success(`${day} এর মেনু যোগ হয়েছে!`);
        await fetchMenuData();
      }
    } catch (error) {
      console.error('Error creating menu item:', error);
      toast.error('মেনু আইটেম তৈরি করতে ব্যর্থ হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (day: string, meal: string, currentValue: string) => {
    setEditingCell({ day, meal });
    setEditValue(currentValue);
  };

  const handleEditPrice = (day: string, meal: string, currentPrice: number) => {
    setEditingPrice({ day, meal });
    setEditPriceValue(currentPrice.toString());
  };

  const handleSavePrice = async () => {
    if (!editingPrice) return;

    const selectedPkg = packages.find(p => p._id === selectedPackageId);
    if (!selectedPkg) return;

    try {
      setSaving(true);

      const currentMenu = menuData[selectedPackageId] || [];
      const updatedMenu = currentMenu.map(item => {
        if (item.day === editingPrice.day) {
          const priceField = `${editingPrice.meal}Price` as keyof MenuItem;
          return { ...item, [priceField]: parseInt(editPriceValue) };
        }
        return item;
      });

      setMenuData(prev => ({ ...prev, [selectedPackageId]: updatedMenu }));

      const updatedItem = updatedMenu.find(item => item.day === editingPrice.day);

      if (updatedItem) {
        const menuDataToSave = {
          day: updatedItem.day,
          package: selectedPkg.name,
          morning: updatedItem.morning,
          lunch: updatedItem.lunch,
          dinner: updatedItem.dinner,
          morningPrice: updatedItem.morningPrice,
          lunchPrice: updatedItem.lunchPrice,
          dinnerPrice: updatedItem.dinnerPrice,
        };

        if (updatedItem._id) {
          await menuAPI.updateMenuItem(updatedItem._id, menuDataToSave);
        } else {
          await menuAPI.createMenuItem(menuDataToSave);
        }

        toast.success(`${getMealName(editingPrice.meal)}র মূল্য আপডেট হয়েছে!`);
      }

      setEditingPrice(null);
      setEditPriceValue('');
      await fetchMenuData();

    } catch (error: any) {
      console.error('Error saving price:', error);
      toast.error(error.message || 'মূল্য সেভ করতে ব্যর্থ হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!editingCell) return;

    const selectedPkg = packages.find(p => p._id === selectedPackageId);
    if (!selectedPkg) return;

    try {
      setSaving(true);

      const currentMenu = menuData[selectedPackageId] || [];
      const updatedMenu = currentMenu.map(item => {
        if (item.day === editingCell.day) {
          return { ...item, [editingCell.meal]: editValue };
        }
        return item;
      });

      setMenuData(prev => ({ ...prev, [selectedPackageId]: updatedMenu }));

      const updatedItem = updatedMenu.find(item => item.day === editingCell.day);

      if (updatedItem) {
        const menuDataToSave = {
          day: updatedItem.day,
          package: selectedPkg.name,
          morning: updatedItem.morning,
          lunch: updatedItem.lunch,
          dinner: updatedItem.dinner,
          morningPrice: updatedItem.morningPrice,
          lunchPrice: updatedItem.lunchPrice,
          dinnerPrice: updatedItem.dinnerPrice,
        };

        if (updatedItem._id) {
          await menuAPI.updateMenuItem(updatedItem._id, menuDataToSave);
        } else {
          await menuAPI.createMenuItem(menuDataToSave);
        }

        toast.success('মেনু আপডেট হয়েছে!');
      }

      setEditingCell(null);
      setEditValue('');
      await fetchMenuData();

    } catch (error: any) {
      console.error('Error saving menu:', error);
      toast.error(error.message || 'মেনু সেভ করতে ব্যর্থ হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  const getMealName = (meal: string) => {
    switch(meal) {
      case 'morning': return 'সকালের খাবারে';
      case 'lunch': return 'দুপুরের খাবারে';
      case 'dinner': return 'রাতের খাবারে';
      default: return meal;
    }
  };

  const meals = [
    { key: 'morning', label: 'সকালের খাবার', icon: '🌅', priceKey: 'morningPrice' },
    { key: 'lunch', label: 'দুপুরের খাবার', icon: '☀️', priceKey: 'lunchPrice' },
    { key: 'dinner', label: 'রাতের খাবার', icon: '🌙', priceKey: 'dinnerPrice' },
  ];

  const currentMenu = menuData[selectedPackageId] || [];
  const selectedPackage = packages.find(p => p._id === selectedPackageId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand-600 animate-spin mx-auto mb-4" />
          <p className="text-ink-500">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">উইকলি মেনু ম্যানেজমেন্ট</h1>
          <p className="text-ink-500 mt-1">প্যাকেজের মেনু এডিট করুন</p>
        </div>
        <div className="bg-white rounded-2xl border border-ink-200 shadow-card p-12 text-center">
          <div className="w-24 h-24 bg-ink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-12 h-12 text-ink-400" />
          </div>
          <h3 className="text-xl font-semibold text-ink-900 mb-2">কোনো প্যাকেজ নেই</h3>
          <p className="text-ink-500 mb-6">প্যাকেজ ম্যানেজমেন্ট থেকে প্রথমে একটি প্যাকেজ তৈরি করুন</p>
        </div>
      </div>
    );
  }

  // Show empty state if no menu exists
  if (currentMenu.length === 0 && !saving) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">উইকলি মেনু ম্যানেজমেন্ট</h1>
            <p className="text-ink-500 mt-1">{selectedPackage?.title} প্যাকেজের মেনু এডিট করুন</p>
          </div>
        </div>

        {/* Package Selection Buttons - Dynamic */}
        <div className="flex flex-wrap gap-4">
          {packages.map((pkg) => (
            <button
              key={pkg._id}
              onClick={() => setSelectedPackageId(pkg._id)}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${selectedPackageId === pkg._id
                ? 'bg-brand-600 text-white shadow-lg'
                : 'bg-ink-200 text-ink-600 hover:bg-gray-300'
                }`}
            >
              {pkg.title}
            </button>
          ))}
        </div>

        {/* Empty State */}
        <div className="bg-white rounded-2xl border border-ink-200 shadow-card p-12 text-center">
          <div className="w-24 h-24 bg-ink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Utensils className="w-12 h-12 text-ink-400" />
          </div>
          <h3 className="text-xl font-semibold text-ink-900 mb-2">কোনো মেনু পাওয়া যায়নি</h3>
          <p className="text-ink-500 mb-6">
            {selectedPackage?.title} প্যাকেজের জন্য এখনো কোনো মেনু তৈরি করা হয়নি।
          </p>
          <button
            onClick={handleAddNewMenu}
            disabled={saving}
            className="bg-brand-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center gap-2 mx-auto"
          >
            {saving ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
            নতুন মেনু তৈরি করুন
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">উইকলি মেনু ম্যানেজমেন্ট</h1>
          <p className="text-ink-500 mt-1">{selectedPackage?.title} প্যাকেজের মেনু এডিট করুন</p>
        </div>

        {/* Refresh Button */}
        <button
          onClick={fetchMenuData}
          disabled={saving}
          className="bg-ink-100 hover:bg-ink-200 text-ink-700 px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2"
        >
          <RefreshCw size={18} className={saving ? 'animate-spin' : ''} />
          রিফ্রেশ
        </button>
      </div>

      {/* Package Selection Buttons - Dynamic */}
      <div className="flex flex-wrap gap-4">
        {packages.map((pkg) => (
          <button
            key={pkg._id}
            onClick={() => setSelectedPackageId(pkg._id)}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${selectedPackageId === pkg._id
              ? 'bg-brand-600 text-white shadow-lg'
              : 'bg-ink-200 text-ink-600 hover:bg-gray-300'
              }`}
          >
            {pkg.title}
          </button>
        ))}
      </div>

      {/* Menu Table */}
      <div className="bg-white rounded-2xl border border-ink-200 shadow-card overflow-hidden">
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[800px]">
            <thead className="bg-brand-600">
              <tr>
                <th className="px-4 py-3 text-left text-white font-semibold">দিন</th>
                <th className="px-4 py-3 text-left text-white font-semibold">
                  🌅 সকালের খাবার
                </th>
                <th className="px-4 py-3 text-left text-white font-semibold">
                  💰 দাম
                </th>
                <th className="px-4 py-3 text-left text-white font-semibold">
                  ☀️ দুপুরের খাবার
                </th>
                <th className="px-4 py-3 text-left text-white font-semibold">
                  💰 দাম
                </th>
                <th className="px-4 py-3 text-left text-white font-semibold">
                  🌙 রাতের খাবার
                </th>
                <th className="px-4 py-3 text-left text-white font-semibold">
                  💰 দাম
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {days.map((day) => {
                const menuItem = currentMenu.find(item => item.day === day);

                if (!menuItem) {
                  return (
                    <tr key={day} className="hover:bg-ink-50">
                      <td className="px-4 py-3 font-medium text-ink-900">{day}</td>
                      <td colSpan={6} className="px-4 py-3 text-center text-ink-400">
                        <button
                          onClick={() => handleAddSingleDayMenu(day)}
                          disabled={saving}
                          className="text-brand-600 hover:text-brand-700 text-sm flex items-center gap-1 mx-auto"
                        >
                          <Plus size={14} />
                          মেনু যোগ করুন
                        </button>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={day} className="hover:bg-ink-50">
                    <td className="px-4 py-3 font-medium text-ink-900">{menuItem.day}</td>
                    
                    {/* Morning Meal */}
                    <td className="px-4 py-3">
                      {editingCell?.day === menuItem.day && editingCell?.meal === 'morning' ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 text-ink-900 px-2 py-1 border border-ink-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-500"
                            autoFocus
                          />
                          <button onClick={handleSave} disabled={saving} className="p-1 text-green-600 hover:bg-green-50 rounded">
                            <Save size={16} />
                          </button>
                          <button onClick={() => setEditingCell(null)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center group">
                          <span className="text-ink-700">{menuItem.morning}</span>
                          <button
                            onClick={() => handleEdit(menuItem.day, 'morning', menuItem.morning)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-ink-400 hover:text-brand-600 transition"
                          >
                            <Edit size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                    
                    {/* Morning Price */}
                    <td className="px-4 py-3">
                      {editingPrice?.day === menuItem.day && editingPrice?.meal === 'morning' ? (
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={editPriceValue}
                            onChange={(e) => setEditPriceValue(e.target.value)}
                            className="w-24 text-ink-900 px-2 py-1 border border-ink-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-500"
                            autoFocus
                          />
                          <button onClick={handleSavePrice} disabled={saving} className="p-1 text-green-600 hover:bg-green-50 rounded">
                            <Save size={16} />
                          </button>
                          <button onClick={() => setEditingPrice(null)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center group">
                          <span className="text-ink-700 font-semibold text-brand-600">৳ {menuItem.morningPrice}</span>
                          <button
                            onClick={() => handleEditPrice(menuItem.day, 'morning', menuItem.morningPrice)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-ink-400 hover:text-brand-600 transition"
                          >
                            <Edit size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                    
                    {/* Lunch Meal */}
                    <td className="px-4 py-3">
                      {editingCell?.day === menuItem.day && editingCell?.meal === 'lunch' ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 text-ink-900 px-2 py-1 border border-ink-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-500"
                            autoFocus
                          />
                          <button onClick={handleSave} disabled={saving} className="p-1 text-green-600 hover:bg-green-50 rounded">
                            <Save size={16} />
                          </button>
                          <button onClick={() => setEditingCell(null)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center group">
                          <span className="text-ink-700">{menuItem.lunch}</span>
                          <button
                            onClick={() => handleEdit(menuItem.day, 'lunch', menuItem.lunch)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-ink-400 hover:text-brand-600 transition"
                          >
                            <Edit size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                    
                    {/* Lunch Price */}
                    <td className="px-4 py-3">
                      {editingPrice?.day === menuItem.day && editingPrice?.meal === 'lunch' ? (
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={editPriceValue}
                            onChange={(e) => setEditPriceValue(e.target.value)}
                            className="w-24 text-ink-900 px-2 py-1 border border-ink-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-500"
                            autoFocus
                          />
                          <button onClick={handleSavePrice} disabled={saving} className="p-1 text-green-600 hover:bg-green-50 rounded">
                            <Save size={16} />
                          </button>
                          <button onClick={() => setEditingPrice(null)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center group">
                          <span className="text-ink-700 font-semibold text-brand-600">৳ {menuItem.lunchPrice}</span>
                          <button
                            onClick={() => handleEditPrice(menuItem.day, 'lunch', menuItem.lunchPrice)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-ink-400 hover:text-brand-600 transition"
                          >
                            <Edit size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                    
                    {/* Dinner Meal */}
                    <td className="px-4 py-3">
                      {editingCell?.day === menuItem.day && editingCell?.meal === 'dinner' ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 text-ink-900 px-2 py-1 border border-ink-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-500"
                            autoFocus
                          />
                          <button onClick={handleSave} disabled={saving} className="p-1 text-green-600 hover:bg-green-50 rounded">
                            <Save size={16} />
                          </button>
                          <button onClick={() => setEditingCell(null)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center group">
                          <span className="text-ink-700">{menuItem.dinner}</span>
                          <button
                            onClick={() => handleEdit(menuItem.day, 'dinner', menuItem.dinner)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-ink-400 hover:text-brand-600 transition"
                          >
                            <Edit size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                    
                    {/* Dinner Price */}
                    <td className="px-4 py-3">
                      {editingPrice?.day === menuItem.day && editingPrice?.meal === 'dinner' ? (
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={editPriceValue}
                            onChange={(e) => setEditPriceValue(e.target.value)}
                            className="w-24 text-ink-900 px-2 py-1 border border-ink-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-500"
                            autoFocus
                          />
                          <button onClick={handleSavePrice} disabled={saving} className="p-1 text-green-600 hover:bg-green-50 rounded">
                            <Save size={16} />
                          </button>
                          <button onClick={() => setEditingPrice(null)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center group">
                          <span className="text-ink-700 font-semibold text-brand-600">৳ {menuItem.dinnerPrice}</span>
                          <button
                            onClick={() => handleEditPrice(menuItem.day, 'dinner', menuItem.dinnerPrice)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-ink-400 hover:text-brand-600 transition"
                          >
                            <Edit size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/*
          Phone view. The desktop table is seven columns wide and cannot shrink
          below ~800px, so on a phone each day becomes a card with the same
          inline editing behaviour.
        */}
        <div className="divide-y divide-ink-100 lg:hidden">
          {days.map((day) => {
            const menuItem = currentMenu.find((item) => item.day === day);

            if (!menuItem) {
              return (
                <div key={day} className="flex items-center justify-between gap-3 p-4">
                  <span className="font-semibold text-ink-900">{day}</span>
                  <button
                    onClick={() => handleAddSingleDayMenu(day)}
                    disabled={saving}
                    className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700 disabled:opacity-50"
                  >
                    <Plus size={14} />
                    মেনু যোগ করুন
                  </button>
                </div>
              );
            }

            const meals = [
              { key: 'morning' as const, label: 'সকাল', name: menuItem.morning, price: menuItem.morningPrice },
              { key: 'lunch' as const, label: 'দুপুর', name: menuItem.lunch, price: menuItem.lunchPrice },
              { key: 'dinner' as const, label: 'রাত', name: menuItem.dinner, price: menuItem.dinnerPrice },
            ];

            return (
              <div key={day} className="p-4">
                <p className="mb-3 font-bold text-ink-900">{menuItem.day}</p>
                <div className="space-y-3">
                  {meals.map((meal) => (
                    <div key={meal.key} className="rounded-xl bg-ink-50 p-3">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs font-semibold text-ink-500">{meal.label}</span>
                        <button
                          onClick={() => handleEditPrice(menuItem.day, meal.key, meal.price)}
                          className="text-sm font-semibold text-brand-700"
                        >
                          {editingPrice?.day === menuItem.day && editingPrice?.meal === meal.key ? null : `৳ ${meal.price}`}
                        </button>
                      </div>

                      {editingPrice?.day === menuItem.day && editingPrice?.meal === meal.key && (
                        <div className="mb-2 flex gap-2">
                          <input
                            type="number"
                            value={editPriceValue}
                            onChange={(e) => setEditPriceValue(e.target.value)}
                            className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm text-ink-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                            autoFocus
                          />
                          <button onClick={handleSavePrice} disabled={saving} className="rounded-lg bg-leaf-600 px-3 text-white">
                            <Save size={16} />
                          </button>
                          <button onClick={() => setEditingPrice(null)} className="rounded-lg bg-ink-200 px-3 text-ink-700">
                            <X size={16} />
                          </button>
                        </div>
                      )}

                      {editingCell?.day === menuItem.day && editingCell?.meal === meal.key ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm text-ink-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                            autoFocus
                          />
                          <button onClick={handleSave} disabled={saving} className="rounded-lg bg-leaf-600 px-3 text-white">
                            <Save size={16} />
                          </button>
                          <button onClick={() => setEditingCell(null)} className="rounded-lg bg-ink-200 px-3 text-ink-700">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(menuItem.day, meal.key, meal.name)}
                          className="flex w-full items-center justify-between gap-2 text-left text-sm text-ink-800"
                        >
                          <span>{meal.name || 'এখনো ঠিক হয়নি'}</span>
                          <Edit size={14} className="shrink-0 text-ink-400" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-800 flex items-center gap-2">
            💡 টিপ: কোনো খাবারের নামের উপর ক্লিক করলে এডিট করতে পারবেন
          </p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-green-800 flex items-center gap-2">
            💰 প্রতিটি খাবারের দাম আলাদাভাবে এডিট করতে পারবেন
          </p>
        </div>
      </div>
    </div>
  );
}
