'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { RoleGuard } from '@/components/auth/RoleGuard';

type KpiCard = {
  label: string;
  value: string;
  trend: 'up' | 'down' | 'neutral';
  subtitle: string;
};

type TripSummary = {
  total: number;
  completed: number;
  inTransit: number;
  delayed: number;
};

type FleetStats = {
  totalVehicles: number;
  active: number;
  utilization: number;
};

function TransportReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('7d');
  const [tripSummary, setTripSummary] = useState<TripSummary | null>(null);
  const [fleetStats, setFleetStats] = useState<FleetStats | null>(null);

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const [tripsRes, fleetRes] = await Promise.allSettled([
        api.get('/logistics/reports/trips', { params: { range: dateRange } }),
        api.get('/logistics/reports/fleet', { params: { range: dateRange } }),
      ]);
      if (tripsRes.status === 'fulfilled') setTripSummary(tripsRes.value.data?.summary || null);
      if (fleetRes.status === 'fulfilled') setFleetStats(fleetRes.value.data || null);
    } catch (err) {
      setError('Transport reports module is not available yet.');
    } finally {
      setLoading(false);
    }
  };

  const kpiCards: KpiCard[] = tripSummary
    ? [
        { label: 'Total Trips', value: String(tripSummary.total), trend: 'neutral', subtitle: 'All time' },
        { label: 'Completed', value: String(tripSummary.completed), trend: 'up', subtitle: `${((tripSummary.completed / tripSummary.total) * 100).toFixed(1)}% success rate` },
        { label: 'In Transit', value: String(tripSummary.inTransit), trend: 'neutral', subtitle: 'Active on road' },
        { label: 'Delayed', value: String(tripSummary.delayed), trend: 'down', subtitle: 'Needs attention' },
      ]
    : fleetStats
    ? [
        { label: 'Fleet Utilization', value: `${(fleetStats.utilization * 100).toFixed(0)}%`, trend: fleetStats.utilization >= 0.7 ? 'up' : 'down', subtitle: `${fleetStats.active} of ${fleetStats.totalVehicles} active` },
      ]
    : [];

  return (
    <RoleGuard allowedRoles={['LOGISTICS_MANAGER', 'TENANT_ADMIN']}>
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-bold text-ink tracking-tight">Transport Reports</h1>
          <p className="text-sm text-inkSoft mt-2 font-medium">
            Fleet performance analytics and operational KPIs.
          </p>
        </div>
        <div className="flex gap-2">
          {['7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all ${
                dateRange === range
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchReports} />}

      {loading ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-slate-400">Loading reports...</p>
        </Card>
      ) : kpiCards.length === 0 && !error ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="font-semibold text-ink">No transport data available</p>
          <p className="text-sm text-slate-500 mt-1">
            Reports will appear here once trips and fleet data are recorded.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {kpiCards.map((kpi, i) => (
              <Card key={i} className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {kpi.label}
                  </p>
                  <Badge variant={kpi.trend === 'up' ? 'success' : kpi.trend === 'down' ? 'error' : 'neutral'}>
                    {kpi.trend === 'up' ? '▲' : kpi.trend === 'down' ? '▼' : '—'}
                  </Badge>
                </div>
                <p className="text-3xl font-bold text-ink mb-1">{kpi.value}</p>
                <p className="text-xs text-slate-500">{kpi.subtitle}</p>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="p-8">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                Trip Distribution
              </p>
              {tripSummary ? (
                <div className="space-y-4">
                  {[
                    { label: 'Completed', value: tripSummary.completed, color: 'bg-emerald-500' },
                    { label: 'In Transit', value: tripSummary.inTransit, color: 'bg-blue-500' },
                    { label: 'Delayed', value: tripSummary.delayed, color: 'bg-amber-500' },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">{item.label}</span>
                        <span className="font-semibold text-ink">{item.value}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className={`${item.color} h-2 rounded-full transition-all duration-500`}
                          style={{ width: `${(item.value / tripSummary.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-8">No trip data available.</p>
              )}
            </Card>

            <Card className="p-8">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                Fleet Overview
              </p>
              {fleetStats ? (
                <div>
                  <div className="flex items-end gap-8 mb-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active</p>
                      <p className="text-4xl font-bold text-ink">{fleetStats.active}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total</p>
                      <p className="text-4xl font-bold text-ink">{fleetStats.totalVehicles}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Utilization</p>
                      <p className="text-4xl font-bold text-ink">{(fleetStats.utilization * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-4">
                    <div
                      className="bg-primary h-4 rounded-full transition-all duration-500"
                      style={{ width: `${fleetStats.utilization * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2 text-right">Fleet utilization rate</p>
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-8">No fleet data available.</p>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
    </RoleGuard>
  );
}

export default TransportReportsPage;
