import {
  Ban,
  Calendar,
  ClipboardList,
  Clock,
  DollarSign,
  LayoutDashboard,
  MapPin,
  Package,
  Settings,
  ShoppingBag,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

/**
 * Grouped so the sidebar is scannable. A flat list of twelve links is hard to
 * search on a phone, where only a few rows are visible at a time.
 */
export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'ওভারভিউ',
    items: [
      { name: 'ড্যাশবোর্ড', href: '/admin/dashboard', icon: LayoutDashboard },
      { name: 'ফাইন্যান্স', href: '/admin/dashboard/finance', icon: DollarSign },
    ],
  },
  {
    label: 'অর্ডার',
    items: [
      { name: 'অর্ডার লিস্ট', href: '/admin/dashboard/orders', icon: ShoppingBag },
      { name: 'ক্যাশ অন ডেলিভারি', href: '/admin/dashboard/cod-orders', icon: Wallet },
      { name: 'মিল বন্ধের তারিখ', href: '/admin/dashboard/blocked-dates', icon: Ban },
    ],
  },
  {
    label: 'গ্রাহক',
    items: [
      { name: 'সাবস্ক্রাইবার', href: '/admin/dashboard/subscribers', icon: Users },
      { name: 'পেন্ডিং সাবস্ক্রাইবার', href: '/admin/dashboard/pending-subscribers', icon: Clock },
      { name: 'পেন্ডিং ট্রানজেকশন', href: '/admin/dashboard/pending-transactions', icon: ClipboardList },
    ],
  },
  {
    label: 'ক্যাটালগ',
    items: [
      { name: 'প্যাকেজ', href: '/admin/dashboard/packages', icon: Package },
      { name: 'উইকলি মেনু', href: '/admin/dashboard/weekly-menu', icon: Calendar },
      { name: 'জোন', href: '/admin/dashboard/zones', icon: MapPin },
    ],
  },
  {
    label: 'সিস্টেম',
    items: [{ name: 'সেটিংস', href: '/admin/dashboard/settings', icon: Settings }],
  },
];

/** Shown in the phone bottom bar — the four screens used every day. */
export const QUICK_NAV: NavItem[] = [
  { name: 'ড্যাশবোর্ড', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'অর্ডার', href: '/admin/dashboard/orders', icon: ShoppingBag },
  { name: 'সাবস্ক্রাইবার', href: '/admin/dashboard/subscribers', icon: Users },
  { name: 'ফাইন্যান্স', href: '/admin/dashboard/finance', icon: DollarSign },
];
