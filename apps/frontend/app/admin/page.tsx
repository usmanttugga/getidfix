'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Users, ClipboardList, TrendingUp, DollarSign } from 'lucide-react';
import api from '../../lib/api';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <div className={`rounded-xl p-5 hover:shadow-md transition-shadow ${color}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{title}</p>
        <div className="p-2.5 bg-white/20 rounded-xl">{icon}</div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/admin/dashboard').then((r) => r.data.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D2137]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Platform overview and key metrics.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Funded"
          value={`₦${Number(data?.totalFunded ?? 0).toLocaleString()}`}
          icon={<DollarSign size={18} className="text-white" />}
          color="bg-emerald-600 text-white"
        />
        <StatCard
          title="Total Usage"
          value={`₦${Number(data?.totalUsage ?? 0).toLocaleString()}`}
          icon={<TrendingUp size={18} className="text-white" />}
          color="bg-rose-600 text-white"
        />
        <StatCard
          title="Wallet Balance"
          value={`₦${Number(data?.totalWalletBalance ?? 0).toLocaleString()}`}
          icon={<DollarSign size={18} className="text-white" />}
          color="bg-[#C9A84C] text-white"
        />
        <StatCard
          title="Total Users"
          value={data?.totalUsers ?? 0}
          icon={<Users size={18} className="text-white" />}
          color="bg-violet-600 text-white"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Pending Requests"
          value={data?.pendingRequests ?? 0}
          icon={<ClipboardList size={18} className="text-white" />}
          color="bg-orange-500 text-white"
        />
        <StatCard
          title="Today's Requests"
          value={data?.todayRequests ?? 0}
          icon={<TrendingUp size={18} className="text-white" />}
          color="bg-sky-600 text-white"
        />
        <StatCard
          title="Today's Credits"
          value={`₦${Number(data?.todayCredits ?? 0).toLocaleString()}`}
          icon={<DollarSign size={18} className="text-white" />}
          color="bg-teal-600 text-white"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-300 p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Quick Actions</h2>
          <div className="space-y-2">
            <Link href="/admin/requests?status=PENDING" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
              <ClipboardList size={18} className="text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-slate-800">Review Pending Requests</p>
                <p className="text-xs text-slate-500">{data?.pendingRequests ?? 0} requests awaiting response</p>
              </div>
            </Link>
            <Link href="/admin/users" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
              <Users size={18} className="text-blue-500" />
              <div>
                <p className="text-sm font-medium text-slate-800">Manage Users</p>
                <p className="text-xs text-slate-500">View and manage user accounts</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
