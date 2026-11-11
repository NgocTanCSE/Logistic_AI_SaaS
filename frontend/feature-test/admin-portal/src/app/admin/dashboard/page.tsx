'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  initStore,
  fetchFromStoreOrAPI,
  getAll,
  DashboardStats,
  LogisticsData,
  AuditLog,
  Order,
} from '@/lib/local-store';
import { MRRChart } from '@/components/dashboard/MRRChart';
import { GrowthChart } from '@/components/dashboard/GrowthChart';
import { ShipmentMap } from '@/components/dashboard/ShipmentMap';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';
import { DataState, TableState } from 'ui-components';
import {
  getRoleGroup,
  canViewFinancialData,
  canViewLogisticsKPIs,
  canViewAIModules,
  canViewAuditLogs,
  ROLE_LABELS,
} from '@/lib/rbac';
import { EditorialPageHeader, EditorialSection, EmptyNote, MetricBand, StatusLabel } from 'ui-kit';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/format';

type StatData = {
  totalTenants: number;
  totalUsers: number;
  totalMrr: number;
  revenueData: { month: string; amount: number }[];
  growthData: { month: string; tenants: number }[];
};

type AuditActivity = {
  id: string | number;
  actorEmail?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  createdAt?: string;
};

function formatMoney(value?: number) {
  if (value == null) return '—';
  return `$${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}`;
}

export default function AdminDashboardPage() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState<StatData | null>(null);
  const [logistics, setLogistics] = useState<LogisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [systemActivities, setSystemActivities] = useState<AuditActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);

  // --- Role-based visibility (dashboard sections differ per role group) ---
  const userRole = (user?.role as any) || null;
  const roleGroup = getRoleGroup(userRole);
  const showFinancial = canViewFinancialData(userRole);
  const showLogistics = canViewLogisticsKPIs(userRole);
  const showAI = canViewAIModules(userRole);
  const showAudit = canViewAuditLogs(userRole);
  const roleLabel = userRole
    ? (ROLE_LABELS[userRole as keyof(typeof ROLE_LABELS)] || String(userRole).replace(/_/g, ' '))
    : 'Guest';

  const fetchStats = async () => {
    if (!token) return;
    try {
      setApiError(null);
      initStore();
      const data = await fetchFromStoreOrAPI<DashboardStats>('dashboardStats', '/admin/dashboard/stats');
      setStats({
        totalTenants: Number(data?.totalTenants) || 0,
        totalUsers: Number(data?.totalUsers) || 0,
        totalMrr: Number(data?.totalMrr) || 0,
        revenueData: Array.isArray(data?.revenueData) ? data.revenueData : [],
        growthData: Array.isArray(data?.growthData) ? data.growthData : [],
      });
    } catch (error: any) {
      setApiError(error.response?.data?.message || error.message || 'Failed to fetch dashboard data.');
      const cached = getAll<DashboardStats>('dashboardStats');
      if (cached) {
        setStats({
          totalTenants: Number(cached.totalTenants) || 0,
          totalUsers: Number(cached.totalUsers) || 0,
          totalMrr: Number(cached.totalMrr) || 0,
          revenueData: Array.isArray(cached.revenueData) ? cached.revenueData : [],
          growthData: Array.isArray(cached.growthData) ? cached.growthData : [],
        });
      } else {
        setStats(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchLogistics = async () => {
    if (!token) return;
    try {
      initStore();
      const data = await fetchFromStoreOrAPI<LogisticsData>('logisticsData', '/admin/dashboard/logistics');
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
      const cached = getAll<LogisticsData>('logisticsData');
      setLogistics(
        cached
          ? {
              totalOrders: Number(cached.totalOrders) || 0,
              activeShipments: Number(cached.activeShipments) || 0,
              inTransit: Number(cached.inTransit) || 0,
              deliveredToday: Number(cached.deliveredToday) || 0,
              delayedShipments: Number(cached.delayedShipments) || 0,
              activeVehicles: Number(cached.activeVehicles) || 0,
              activeDrivers: Number(cached.activeDrivers) || 0,
              inventoryAlerts: Number(cached.inventoryAlerts) || 0,
              avgOptimization: cached.avgOptimization || '—',
              onTimeDelivery: cached.onTimeDelivery || '—',
              predictedShipments: Array.isArray(cached.predictedShipments) ? cached.predictedShipments : [],
            }
          : null,
      );
    }
  };

  const fetchActivities = async () => {
    if (!token) return;
    setActivitiesLoading(true);
    try {
      setActivitiesError(null);
      initStore();
      const data = await fetchFromStoreOrAPI<AuditLog[]>('auditLogs', '/admin/audit-logs?limit=10');
      setSystemActivities(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setActivitiesError(error.response?.data?.message || error.message || 'Failed to load activities.');
      setSystemActivities(getAll<AuditLog[]>('auditLogs'));
    } finally {
      setActivitiesLoading(false);
    }
  };

  useEffect(() => {
    void fetchStats();
    void fetchLogistics();
    void fetchActivities();
  }, [token]);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchLogistics(), fetchActivities()]);
    setRefreshing(false);
  };

  const pageLoading = loading || activitiesLoading || !stats;

  return (
    <DataState
      loading={pageLoading}
      error={apiError || activitiesError}
      empty={!stats && !logistics}
      onRetry={refresh}
      retryLabel="Refresh"
      loadingRows={8}
    >
      {/* Role indicator banner */}
      <div className="mb-4 flex items-center justify-between rounded-lg border border-line bg-surface-alt px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Active role
          </span>
          <span className="text-[13px] font-semibold text-ink">{roleLabel}</span>
          <span className="text-[11px] text-ink-faint">({roleGroup})</span>
        </div>
        {roleGroup === 'CLIENT' ? (
          <span className="text-[11px] text-ink-soft">
            You see a simplified client view. Contact an administrator to change your role.
          </span>
        ) : null}
      </div>

      <EditorialPageHeader
        eyebrow={
          <>
            <span>
              {new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())}
            </span>
            <span className="text-line-strong" aria-hidden="true">
              /
            </span>
            <span>
              {roleGroup === 'PLATFORM' ? 'Platform control' :
                roleGroup === 'WAREHOUSE' ? 'Warehouse operations' :
                roleGroup === 'LOGISTICS' ? 'Logistics operations' :
                roleGroup === 'DELIVERY' ? 'Delivery operations' :
                'Client portal'}
            </span>
          </>
        }
        title={
          roleGroup === 'PLATFORM' ? 'Operations overview' :
            roleGroup === 'WAREHOUSE' ? 'Warehouse overview' :
            roleGroup === 'LOGISTICS' ? 'Logistics overview' :
            roleGroup === 'DELIVERY' ? 'My deliveries' :
            'My orders'
        }
        description={
          roleGroup === 'PLATFORM' ? 'Platform health, revenue, tenant growth, and live logistics in one view. Figures come directly from the admin API.' :
            roleGroup === 'WAREHOUSE' ? 'Warehouse KPIs, active shipments, and delivery forecasts for your team.' :
            roleGroup === 'LOGISTICS' ? 'Route optimization, shipment tracking, and delivery predictions.' :
            roleGroup === 'DELIVERY' ? 'View your active deliveries and delivery performance.' :
            'Track your orders and delivery status.'
        }
        meta={
          roleGroup === 'PLATFORM' ? (
            <>
              <p>{stats ? `${formatNumber(stats.totalTenants)} tenants · ${formatNumber(stats.totalUsers)} users` : 'Platform totals unavailable'}</p>
              <p className="mt-0.5">
                <StatusLabel tone={apiError ? 'danger' : refreshing ? 'warning' : 'success'}>
                  {apiError ? 'Degraded' : refreshing ? 'Syncing' : 'Operational'}
                </StatusLabel>
              </p>
            </>
          ) : roleGroup === 'DELIVERY' ? (
            <>
              <p>{logistics ? `${formatNumber(logistics.inTransit)} shipments in progress` : 'Delivery data unavailable'}</p>
              <p className="mt-0.5">
                <StatusLabel tone={apiError ? 'danger' : refreshing ? 'warning' : 'success'}>
                  {apiError ? 'Degraded' : refreshing ? 'Syncing' : 'Operational'}
                </StatusLabel>
              </p>
            </>
          ) : roleGroup === 'CLIENT' ? (
            <>
              <p className="text-[11px] text-ink-soft">Client view — order tracking only</p>
              <p className="mt-0.5">
                <StatusLabel tone={apiError ? 'danger' : refreshing ? 'warning' : 'success'}>
                  {apiError ? 'Degraded' : refreshing ? 'Syncing' : 'Operational'}
                </StatusLabel>
              </p>
            </>
          ) : (
            <>
              <p>{logistics ? `${formatNumber(logistics.activeShipments)} active shipments` : 'Logistics data unavailable'}</p>
              <p className="mt-0.5">
                <StatusLabel tone={apiError ? 'danger' : refreshing ? 'warning' : 'success'}>
                  {apiError ? 'Degraded' : refreshing ? 'Syncing' : 'Operational'}
                </StatusLabel>
              </p>
            </>
          )
        }
        actions={
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="h-9 rounded-md border border-line px-3 text-[12px] font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-wait disabled:opacity-60"
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      {/* Platform-level financial metrics — SUPER_ADMIN + TENANT_ADMIN only */}
      {showFinancial && (
        <>
          <MetricBand
            metrics={[
              { label: 'Monthly recurring revenue', value: formatMoney(stats?.totalMrr), meta: 'Platform-wide MRR' },
              { label: 'Tenants', value: stats ? formatNumber(stats.totalTenants) : '—', meta: 'Provisioned workspaces' },
              { label: 'Users', value: stats ? formatNumber(stats.totalUsers) : '—', meta: 'Across all portals' },
              { label: 'API status', value: apiError ? 'Degraded' : refreshing ? 'Syncing' : 'Operational', meta: apiError ? 'Dashboard data may be stale' : 'api-gateway reachable', tone: apiError ? 'danger' : refreshing ? 'warning' : 'success' },
            ]}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <EditorialSection eyebrow="Revenue" title="Monthly recurring revenue">
              <div className="h-64">
                <MRRChart data={stats?.revenueData} />
              </div>
            </EditorialSection>
            <EditorialSection eyebrow="Growth" title="Tenant acquisition">
              <div className="h-64">
                <GrowthChart data={stats?.growthData} />
              </div>
            </EditorialSection>
          </div>
        </>
      )}

      {/* Client/User role — simplified order tracking view */}
      {roleGroup === 'CLIENT' && (
        <EditorialSection eyebrow="My Orders" title="Your recent orders">
          {(() => {
            const myOrders = getAll<Order[]>('orders');
            const filtered = Array.isArray(myOrders) ? myOrders.filter((o) => o.recipientName || o.client?.name) : [];
            if (filtered.length === 0) {
              return <EmptyNote>No orders found in local storage. Orders will appear here once synced from the API.</EmptyNote>;
            }
            return (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <caption className="sr-only">Your recent orders</caption>
                  <thead>
                    <tr className="border-b border-line">
                      <th scope="col" className="h-8 pr-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Tracking</th>
                      <th scope="col" className="h-8 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Recipient</th>
                      <th scope="col" className="h-8 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Amount</th>
                      <th scope="col" className="h-8 pl-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableState
                      loading={loading}
                      empty={filtered.length === 0}
                      colSpan={4}
                      emptyTitle="No orders found"
                      emptyDescription="Orders synced from the API will appear here."
                    >
                      {filtered.slice(0, 10).map((order) => (
                        <tr key={order.id} className="h-[42px] border-b border-line/80 transition-colors hover:bg-surface-alt/60">
                          <td className="pr-3 text-[12px] tabular-nums text-ink-soft">{order.trackingCode || '—'}</td>
                          <td className="px-3 text-[12px] font-medium text-ink">{order.recipientName || order.client?.name || '—'}</td>
                          <td className="px-3 text-[12px] text-ink-soft">{order.codAmount ? formatCurrency(order.codAmount) : '—'}</td>
                          <td className="pl-3 text-right">
                            <StatusLabel tone={order.status === 'DELIVERED' ? 'success' : order.status === 'CANCELLED' || order.status === 'RETURNED' ? 'danger' : 'info'}>
                              {order.status?.replace(/_/g, ' ') || '—'}
                            </StatusLabel>
                          </td>
                        </tr>
                      ))}
                    </TableState>
                  </tbody>
                </table>
              </div>
            );
          })()}
        </EditorialSection>
      )}

      {/* Logistics KPIs — operations + delivery roles */}
      {showLogistics && (
        <EditorialSection eyebrow="Logistics" title="Operations">
          <MetricBand
            metrics={[
              {
                label: 'Active shipments',
                value: logistics ? formatNumber(logistics.activeShipments) : '—',
                meta: logistics ? `${formatNumber(logistics.inTransit)} in transit` : 'Logistics data unavailable',
              },
              {
                label: 'Delayed',
                value: logistics ? formatNumber(logistics.delayedShipments) : '—',
                meta: logistics ? 'Needs attention' : 'Logistics data unavailable',
                tone: logistics && logistics.delayedShipments > 0 ? 'warning' : 'default',
              },
              { label: 'On-time delivery', value: logistics?.onTimeDelivery ?? '—', meta: '24h rolling average' },
              { label: 'Route optimization', value: logistics?.avgOptimization ?? '—', meta: 'AI route efficiency' },
            ]}
          />
        </EditorialSection>
      )}

      {/* Predictive chart — operations + delivery roles */}
      {showLogistics && (
        <EditorialSection eyebrow="Forecast" title="Predicted vs actual shipments">
          {(() => {
            const predicted = logistics?.predictedShipments ?? [];
            return predicted.length === 0 ? (
              <EmptyNote>No forecast data available. The AI demand predictor has not returned a series yet.</EmptyNote>
            ) : (
              <div className="h-64">
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
            );
          })()}
        </EditorialSection>
      )}

      {/* Shipment map — operations + delivery; AI panel — platform + warehouse + logistics only */}
      {showLogistics && (
        <div className={`grid gap-6 ${showAI ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
          <ShipmentMap logistics={logistics} />
          {showAI ? <AIInsightsPanel token={token} /> : null}
        </div>
      )}

      {/* Audit logs — platform-level only */}
      {showAudit && (
        <EditorialSection
          eyebrow="Audit"
          title="Recent activity"
          action={activitiesLoading ? 'Loading…' : `${systemActivities.length} entries`}
        >
          {activitiesLoading ? (
            <p className="text-[12px] text-ink-faint">Loading activity log…</p>
          ) : activitiesError ? (
            <div className="border-l-2 border-danger bg-surface px-3 py-2 text-[12px] leading-5 text-ink-soft">
              {activitiesError}
            </div>
          ) : systemActivities.length === 0 ? (
            <EmptyNote>No audit entries yet.</EmptyNote>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <caption className="sr-only">Latest platform audit log entries</caption>
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="h-8 pr-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                      Time
                    </th>
                    <th scope="col" className="h-8 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                      Actor
                    </th>
                    <th scope="col" className="h-8 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                      Action
                    </th>
                    <th scope="col" className="h-8 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                      Resource
                    </th>
                    <th scope="col" className="h-8 pl-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                      Result
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <TableState
                    loading={activitiesLoading}
                    empty={systemActivities.length === 0}
                    error={activitiesError}
                    colSpan={5}
                    emptyTitle="No activity found"
                    emptyDescription="Audit entries will be logged here."
                    onRetry={fetchActivities}
                  >
                    {systemActivities.map((activity) => {
                      const result = activity.result === 'FAILED' ? 'Failed' : activity.result === 'SUCCESS' ? 'Success' : '—';
                      return (
                        <tr
                          key={activity.id}
                          className="h-[42px] border-b border-line/80 transition-colors hover:bg-surface-alt/60"
                        >
                          <td className="pr-3 text-[12px] tabular-nums text-ink-soft">{formatDateTime(activity.createdAt)}</td>
                          <td className="px-3 text-[12px] text-ink-soft">
                            <span className="block max-w-[240px] truncate">{activity.actorEmail || '—'}</span>
                          </td>
                          <td className="px-3 text-[12px] font-medium uppercase text-ink">{activity.action || '—'}</td>
                          <td className="px-3 text-[12px] text-ink-soft">{activity.resourceType || '—'}</td>
                          <td className="pl-3 text-right">
                            <StatusLabel tone={result === 'Failed' ? 'danger' : result === 'Success' ? 'success' : 'neutral'}>
                              {result}
                            </StatusLabel>
                          </td>
                        </tr>
                      );
                    })}
                  </TableState>
                </tbody>
              </table>
            </div>
          )}
        </EditorialSection>
      )}
    </DataState>
  );
}
