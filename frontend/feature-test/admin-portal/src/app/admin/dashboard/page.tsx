'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { StatCard } from '@/components/dashboard/StatCard';
import { MRRChart } from '@/components/dashboard/MRRChart';
import { GrowthChart } from '@/components/dashboard/GrowthChart';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { ShipmentMap } from '@/components/dashboard/ShipmentMap';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type StatData = {
  totalTenants: number;
  totalUsers: number;
  totalMrr: number;
  revenueData: { month: string; amount: number }[];
  growthData: { month: string; tenants: number }[];
};

type LogisticsData = {
  totalOrders: number;
  activeShipments: number;
  inTransit: number;
  deliveredToday: number;
  delayedShipments: number;
  activeVehicles: number;
  activeDrivers: number;
  inventoryAlerts: number;
  avgOptimization: string;
  onTimeDelivery: string;
  predictedShipments: { day: string; predicted: number; actual: number }[];
};

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<StatData | null>(null);
  const [logistics, setLogistics] = useState<LogisticsData | null>(null);
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
        growthData: Array.isArray(data?.growthData) ? data.growthData : [],
      });
    } catch (err: any) {
      setApiError(err.response?.data?.message || err.message || 'Failed to fetch dashboard data');
      setStats({ totalTenants: 0, totalUsers: 0, totalMrr: 0, revenueData: [], growthData: [] });
    } finally {
      setLoading(false);
    }
  };

  const fetchLogistics = async () => {
    if (!token) return;
    try {
      const response = await api.get('/admin/dashboard/logistics');
      const data = response.data;
      setLogistics({
        totalOrders: Number(data?.totalOrders) || 0,
        activeShipments: Number(data?.activeShipments) || 0,
        inTransit: Number(data?.inTransit) || 0,
        deliveredToday: Number(data?.deliveredToday) || 0,
        delayedShipments: Number(data?.delayedShipments) || 0,
        activeVehicles: Number(data?.activeVehicles) || 0,
        activeDrivers: Number(data?.activeDrivers) || 0,
        inventoryAlerts: Number(data?.inventoryAlerts) || 0,
        avgOptimization: data?.avgOptimization || '—',
        onTimeDelivery: data?.onTimeDelivery || '—',
        predictedShipments: Array.isArray(data?.predictedShipments) ? data.predictedShipments : [],
      });
    } catch {
      setLogistics(null);
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
    fetchLogistics();
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
    <div>
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-ink">Dashboard Overview</h2>
          <p className="mt-1 text-sm text-inkSoft">Monitor platform performance, revenue, and logistics operations.</p>
        </div>
      </div>

      {apiError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 mb-6">
          {apiError}
        </div>
      )}

      {/* ── Platform KPIs ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total MRR"
          value={`$${(stats.totalMrr || 0).toLocaleString()}`}
          trend={{ value: "+15.2%", isPositive: true }}
          icon={
            <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 10v1m-6-5a6 6 0 1112 0 6 6 0 01-12 0z" />
            </svg>
          }
        />
        <StatCard
          title="Active Tenants"
          value={String(stats.totalTenants || 0)}
          trend={{ value: "+3 this week", isPositive: true }}
          icon={
            <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
        <StatCard
          title="Total Users"
          value={String(stats.totalUsers || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
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

      {/* ── Revenue & Growth charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-ink">Monthly Recurring Revenue</h3>
              <p className="mt-1 text-sm text-inkSoft">Platform-wide MRR over 6 months</p>
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
              <p className="mt-1 text-sm text-inkSoft">Active tenant acquisition trend</p>
            </div>
          </div>
          <div className="h-80 -ml-4 mt-2">
            <GrowthChart data={stats.growthData} />
          </div>
        </div>
      </div>

      {/* ── Logistics KPIs ── */}
      <h3 className="text-lg font-semibold text-ink mb-4">Logistics Operations</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Active Shipments"
          value={String(logistics?.activeShipments || 0)}
          trend={{ value: `${logistics?.delayedShipments || 0} delayed`, isPositive: false }}
          icon={
            <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5l.415-.208a3 3 0 013.277.356l.7.593a3 3 0 002.113.857L19.5 10.5a3 3 0 011.5 2.612v2.136a3 3 0 01-1.5 2.612l-1.5.75a3 3 0 01-2.25.133l-2-.7a3 3 0 00-2.75-.655l-1.15.46a3 3 0 01-1.85.14l-2.5-.5a3 3 0 01-1.75-1.75l-.5-2.5a3 3 0 01.655-2.75l1.25-1.25a3 3 0 011.85-.955l1.65-.66a3 3 0 001.5-1.164L14.25 7.5a3 3 0 013-3h.75" />
            </svg>
          }
        />
        <StatCard
          title="In Transit"
          value={String(logistics?.inTransit || 0)}
          trend={{ value: "+5 live", isPositive: true }}
          icon={
            <svg className="h-6 w-6 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 12h6M9.5 12a3 3 0 11-3-3 3 3 0 013 3zm0 0v.01M15.5 12a3 3 0 11-3-3 3 3 0 013 3zm0 0v.01M15.5 12h-6" />
            </svg>
          }
        />
        <StatCard
          title="On-Time Delivery"
          value={logistics?.onTimeDelivery || '—'}
          trend={{ value: "24h rolling avg", isPositive: true }}
          icon={
            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3M12 8V6m0 0L9 9m3-3l3 3" />
            </svg>
          }
        />
        <StatCard
          title="AI Optimization"
          value={logistics?.avgOptimization || '—'}
          trend={{ value: "Route efficiency", isPositive: true }}
          icon={
            <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.674 18.25a8.25 8.25 0 11-1.44-1.44 8.25 8.25 0 011.44 1.44zM12 20a8 8 0 100-16 8 8 0 000 16zM8 12h.01M16 12h.01" />
            </svg>
          }
        />
      </div>

      {/* ── Predictive Delivery Chart ── */}
      {logistics && logistics.predictedShipments.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card mb-8">
          <h3 className="text-lg font-semibold text-ink mb-1">Predicted vs Actual Shipments</h3>
          <p className="text-sm text-inkSoft mb-4">7-day forecast accuracy from AI demand predictor</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={logistics.predictedShipments} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="1 1" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#1e293b' }}
                  formatter={(value, name) => [value, name]}
                />
                <Bar dataKey="predicted" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Shipment Map + AI Insights ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ShipmentMap logistics={logistics} />
        <AIInsightsPanel token={token} />
      </div>

      {/* ── Recent Activity ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-ink">Recent Activity</h3>
            <p className="mt-1 text-sm text-inkSoft">Latest platform audit log entries</p>
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
