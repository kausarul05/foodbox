'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Clock, DollarSign, Package, ShoppingBag, Users } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import StatsCard from '@/app/admin/components/admin/StatsCard';
import DataTable, { type Column } from '@/app/admin/components/ui/DataTable';
import { EmptyState, LoadingBlock, Panel, Pill, type Tone } from '@/app/admin/components/ui/Shell';
import { dashboardAPI, orderAPI, subscriptionAPI } from '@/app/admin/lib/api';
import { bengaliDate, bn, taka } from '@/lib/format';

interface Order {
  _id?: string;
  id?: string;
  orderId?: string;
  userName: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

const BN_MONTHS = [
  'জানু', 'ফেব', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্ট', 'অক্টো', 'নভে', 'ডিসে',
];

const STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: 'পেন্ডিং', tone: 'warning' },
  confirmed: { label: 'কনফার্মড', tone: 'info' },
  preparing: { label: 'রান্না হচ্ছে', tone: 'brand' },
  out_for_delivery: { label: 'ডেলিভারিতে', tone: 'info' },
  delivered: { label: 'ডেলিভারি হয়েছে', tone: 'success' },
  cancelled: { label: 'বাতিল', tone: 'danger' },
};

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: 0, activeSubscribers: 0, pendingSubscribers: 0 });
  const [monthly, setMonthly] = useState<{ _id: number; count: number; revenue: number }[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, orderStatsRes, subRes, ordersRes] = await Promise.all([
        dashboardAPI.getStats(),
        orderAPI.getOrderStats(),
        subscriptionAPI.getSubscriptionStats(),
        orderAPI.getAllOrders({ limit: 5 }),
      ]);

      setStats({
        totalOrders: statsRes.data?.orders?.total ?? 0,
        totalRevenue: statsRes.data?.revenue?.total ?? 0,
        activeSubscribers: subRes.data?.activeSubscriptions ?? statsRes.data?.subscriptions?.active ?? 0,
        pendingSubscribers: subRes.data?.pendingSubscriptions ?? statsRes.data?.subscriptions?.pending ?? 0,
      });

      setMonthly(orderStatsRes.data?.monthlyOrders ?? []);
      setRecentOrders((ordersRes.data ?? []).slice(0, 5));
    } catch {
      // No placeholder rows on failure — an empty dashboard is honest, a
      // dashboard full of invented orders is not.
      toast.error('ডাটা লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  /** Only months that actually have orders; the aggregate returns month 1-12. */
  const chartData = useMemo(
    () =>
      [...monthly]
        .sort((a, b) => a._id - b._id)
        .map((row) => ({
          month: BN_MONTHS[row._id - 1] ?? String(row._id),
          orders: row.count,
          revenue: row.revenue,
        })),
    [monthly]
  );

  const columns: Column<Order>[] = [
    {
      header: 'অর্ডার আইডি',
      primary: true,
      cell: (o) => <span className="font-mono text-sm">{o.orderId || o.id || '—'}</span>,
    },
    { header: 'গ্রাহক', cell: (o) => o.userName || '—' },
    { header: 'এমাউন্ট', align: 'right', cell: (o) => taka(o.totalAmount) },
    {
      header: 'স্ট্যাটাস',
      cell: (o) => {
        const s = STATUS[o.status] ?? { label: o.status, tone: 'neutral' as Tone };
        return <Pill tone={s.tone}>{s.label}</Pill>;
      },
    },
    { header: 'তারিখ', cell: (o) => (o.createdAt ? bengaliDate(o.createdAt) : '—') },
  ];

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-ink-100" />
          ))}
        </div>
        <LoadingBlock rows={3} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="মোট অর্ডার" value={bn(stats.totalOrders)} icon={ShoppingBag} tone="brand" />
        <StatsCard title="মোট রেভিনিউ" value={taka(stats.totalRevenue)} icon={DollarSign} tone="leaf" hint="ডেলিভারি হওয়া অর্ডার থেকে" />
        <StatsCard title="একটিভ সাবস্ক্রাইবার" value={bn(stats.activeSubscribers)} icon={Users} tone="sky" />
        <StatsCard title="পেন্ডিং রিকোয়েস্ট" value={bn(stats.pendingSubscribers)} icon={Clock} tone="amber" />
      </div>

      {chartData.length > 0 && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="মাসিক অর্ডার">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#78716c' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#78716c' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e7e5e4', fontSize: 13 }} />
                <Area type="monotone" dataKey="orders" name="অর্ডার" stroke="#ea580c" fill="#fed7aa" />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="মাসিক রেভিনিউ">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#78716c' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#78716c' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e7e5e4', fontSize: 13 }} />
                <Area type="monotone" dataKey="revenue" name="রেভিনিউ" stroke="#16a34a" fill="#bbf7d0" />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>
        </div>
      )}

      <Panel
        title="সাম্প্রতিক অর্ডার"
        action={
          <Link href="/admin/dashboard/orders" className="text-sm font-semibold text-brand-700 hover:underline">
            সব দেখুন →
          </Link>
        }
      >
        <DataTable
          columns={columns}
          rows={recentOrders}
          keyOf={(o) => o._id || o.id || o.orderId || String(Math.random())}
          empty={<EmptyState icon={Package} title="কোনো অর্ডার নেই" hint="নতুন অর্ডার এলে এখানে দেখা যাবে।" />}
        />
      </Panel>
    </div>
  );
}
