'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { EditorialPageHeader, EditorialSection, MetricBand, StatusLabel, EmptyNote } from 'ui-kit';
import { formatNumber } from '@/lib/format';
import {
  AIAnalysis,
  DashboardStats,
  LogisticsData,
  getAll,
  initStore,
} from '@/lib/local-store';

const REVENUE_GRADIENT_ID = 'revenueGradient';

function formatMoney(value: number | null | undefined) {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ManagerialInsightsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [logistics, setLogistics] = useState<LogisticsData | null>(null);
  const [risk, setRisk] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      initStore();
      setStats(getAll<DashboardStats>('dashboardStats'));
      setLogistics(getAll<LogisticsData>('logisticsData'));
      setRisk(getAll<AIAnalysis>('aiAnalysis'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load managerial insights');
    } finally {
      setLoading(false);
    }
  }, []);

  const growthData = stats?.growthData ?? [];
  const lastGrowth = growthData[growthData.length - 1];
  const previousGrowth = growthData[growthData.length - 2];
  const growthTrend =
    lastGrowth && previousGrowth
      ? `${lastGrowth.tenants > previousGrowth.tenants ? '+' : ''}${lastGrowth.tenants - previousGrowth.tenants} from ${previousGrowth.month}`
      : null;

  const revenueData = stats?.revenueData ?? [];
  const revenueEmpty = revenueData.length === 0;
  const predicted = logistics?.predictedShipments ?? [];
  const predictedEmpty = predicted.length === 0;

  return (
    <div className="space-y-6">
      <EditorialPageHeader
        eyebrow="Business"
        title="Managerial insights"
        description="Top line business and logistics KPI summary with six month revenue and demand trends."
      />

      <MetricBand
        metrics={[
          {
            label: 'Total tenants',
            value: formatNumber(stats?.totalTenants),
            meta: 'All active and registered',
          },
          {
            label: 'Total users',
            value: formatNumber(stats?.totalUsers),
            meta: `${loading ? '…' : 'Across every tenant'}`,
          },
          {
            label: 'MRR',
            value: formatMoney(stats?.totalMrr),
            meta: `${loading ? '…' : 'Last closed month'}`,
          },
          {
            label: 'Tenants grown',
            value: lastGrowth ? `${lastGrowth.tenants}` : '—',
            meta: growthTrend ?? `${loading ? '…' : 'No growth data'}`,
            tone: growthTrend && growthTrend.startsWith('+') ? 'success' : 'default',
          },
        ]}
      />

      {error ? (
        <div className="flex items-center gap-3 border-l-2 border-danger bg-surface px-3 py-2">
          <StatusLabel tone="danger">Data error</StatusLabel>
          <span className="text-[12px] text-ink-soft">{error}</span>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <EditorialSection eyebrow="Revenue" title="Revenue (6 months)">
          {revenueEmpty ? (
            <EmptyNote>No revenue data available yet.</EmptyNote>
          ) : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <defs>
                  <linearGradient id={REVENUE_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2f4a3c" stopOpacity={0.16} />
                    <stop offset="95%" stopColor="#2f4a3c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="1 1" vertical={false} stroke="#ded7cb" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#62665c' }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#62665c' }}
                    tickFormatter={(value) => `$${Number(value) > 0 ? Number(value) / 1000 : 0}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fbf9f5',
                      borderRadius: '6px',
                      border: '1px solid #ded7cb',
                      color: '#20241f',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: '#6a6e64' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#2f4a3c"
                    strokeWidth={2}
                    dot={false}
                    fill={`url(#${REVENUE_GRADIENT_ID})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </EditorialSection>

        <EditorialSection eyebrow="Forecast" title="Predicted vs actual">
          {predictedEmpty ? (
            <EmptyNote>No forecast data yet. Demand predictions appear once the model runs.</EmptyNote>
          ) : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={predicted} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="1 1" vertical={false} stroke="#ded7cb" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#62665c' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#62665c' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fbf9f5', borderRadius: '6px', border: '1px solid #ded7cb', color: '#20241f', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#62665c' }} />
                  <Bar dataKey="predicted" name="Predicted" fill="#2f4a3c" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="actual" name="Actual" fill="#c9c0b2" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </EditorialSection>
      </div>

      <EditorialSection eyebrow="Insights" title="Risk log">
        {risk ? (
          <div className="space-y-3">
            <p className="text-[12px] leading-6 text-ink-soft">{risk.summary}</p>
            <div className="flex flex-col gap-2">
              {risk.risks.map((item, index) => (
                <p key={index} className="text-[12px] leading-6 text-ink">
                  <span className="text-ink-faint">R{index + 1}</span>: {item}
                </p>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              {risk.recommendations.map((item, index) => (
                <p key={index} className="text-[12px] leading-6 text-ink">
                  <span className="text-ink-faint">Recommendation {index + 1}:</span> {item}
                </p>
              ))}
            </div>
          </div>
        ) : (
          <EmptyNote>No risk log available. The AI risk engine has not returned findings yet.</EmptyNote>
        )}
      </EditorialSection>
    </div>
  );
}
