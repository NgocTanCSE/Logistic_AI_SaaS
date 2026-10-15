'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { StatCard } from '@/components/StatCard';
import { MRRChart } from '@/components/dashboard/MRRChart';
import { GrowthChart } from '@/components/dashboard/GrowthChart';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import api from '@/lib/api';

type StatData = {
  totalTenants: number;
  totalUsers: number;
  totalMrr: number;
  revenueData: { month: string; amount: number }[];
  growthData: { month: string; tenants: number }[];
};

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<StatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [systemActivities, setSystemActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!token) return;
    try {
      setApiError(null);
      const response = await api.get('/admin/dashboard/stats');
      const data = response.data;
      setStats({
        totalTenants: Number(data?.totalTenants) || 0,
        totalUsers: Number(data?.totalUsers) || 0,
        totalMrr: Number(data?.totalMrr) || 0,
        revenueData: Array.isArray(data?.revenueData) ? data.revenueData : [],
        growthData: Array.isArray(data?.growthData) ? data.growthData : []
      });
    } catch (err: any) {
      setApiError(err.response?.data?.message || err.message || 'Failed to fetch dashboard data');
      setStats({ totalTenants: 0, totalUsers: 0, totalMrr: 0, revenueData: [], growthData: [] });
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    if (!token) return;
    try {
      setActivitiesError(null);
      const res = await api.get('/admin/audit-logs?limit=10');
      setSystemActivities(res.data?.data || []);
    } catch (err: any) {
      setActivitiesError(err.response?.data?.message || err.message || 'Failed to load activities');
    } finally {
      setActivitiesLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchActivities();
  }, [token]);

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-10">
        {[1,2,3,4].map((i) => (
          <div key={i} className="h-32 rounded-xl border border-slate-200 bg-white animate-pulse"></div>
        ))}
        <div className="h-80 rounded-xl border border-slate-200 bg-white animate-pulse mt-4 lg:col-span-2"></div>
        <div className="h-80 rounded-xl border border-slate-200 bg-white animate-pulse mt-4 lg:col-span-2"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink">Dashboard Overview</h2>
          <p className="mt-1 text-sm text-ink-soft">Monitor platform performance, revenue, and system health.</p>
        </div>
      </div>

      {apiError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {apiError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total MRR"
          value={`$${(stats.totalMrr / 1000).toFixed(1)}k`}
          trend={{ value: "+15.2%", isPositive: true }}
          icon={
            <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 10v1m-6-5a6 6 0 1112 0 6 6 0 01-12 0z" />
            </svg>
          }
        />
        <StatCard
          title="Active Tenants"
          value={stats.totalTenants.toString()}
          trend={{ value: "+3 this week", isPositive: true }}
          icon={
            <svg className="h-6 w-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          trend={{ value: "+120", isPositive: true }}
          icon={
            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.533.167-1.04.447-1.484L9.8 12.94a2 2 0 011.611-.806h.178M7 20H2v-2a3 3 0 013-3h3m0 0v-5a3 3 0 016 0v5m0 0h3" />
            </svg>
          }
        />
        <StatCard
          title="System Health"
          value="Operational"
          trend={{ value: "All systems nominal", isPositive: true }}
          icon={
            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15l3-3m0 0l3-3m-3 3l-3-3m3 3v6" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-ink">Monthly Recurring Revenue</h3>
              <p className="mt-1 text-sm text-ink-soft">Platform-wide MRR over 6 months</p>
            </div>
          </div>
          <div className="h-80 -ml-4 mt-2">
            <MRRChart data={stats.revenueData} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-ink">Tenant Growth</h3>
              <p className="mt-1 text-sm text-ink-soft">Active tenant acquisition trend</p>
            </div>
          </div>
          <div className="h-80 -ml-4 mt-2">
            <GrowthChart data={stats.growthData} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-ink">Recent Activity</h3>
            <p className="mt-1 text-sm text-ink-soft">Latest platform audit log entries</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          {activitiesLoading ? (
            <div className="py-8 text-center text-slate-400">Loading activity log...</div>
          ) : activitiesError ? (
            <div className="py-8 text-center text-rose-600">
              {activitiesError}
            </div>
          ) : (
            <ActivityFeed activities={systemActivities} />
          )}
        </div>
      </div>
    </div>
  );
}
