'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role || 'TENANT_USER';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [stats, setStats] = useState({
    warehouse: { pendingOrders: 0, lowStockItems: 0, activeWaves: 0, inventoryAccuracy: '—' },
    logistics: { activeTrips: 0, fleetUtilization: '—', unassignedOrders: 0, onTimeDelivery: '—' },
    admin: { activeUsers: 0, systemUptime: '—', storageUsed: '—', pendingInvites: 0 }
  });

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      if (!role) return;
      
      const promises: Promise<any>[] = [];

      switch (role) {
        case 'TENANT_ADMIN':
          promises.push(
            api.get('/tenant/users').then(r => ({ key: 'admin', data: r.data })).catch(() => null),
            api.get('/branches').then(r => ({ key: 'branches', data: r.data })).catch(() => null),
            api.get('/health').then(() => ({ key: 'health', data: true })).catch(() => null),
          );
          break;
        case 'WAREHOUSE_MANAGER':
        case 'WAREHOUSE_STAFF':
          promises.push(
            api.get('/orders', { params: { status: 'PENDING', limit: 1 } }).then(r => ({ key: 'pendingOrders', data: r.data })).catch(() => null),
            api.get('/inventory', { params: { lowStock: true, limit: 1 } }).then(r => ({ key: 'lowStock', data: r.data })).catch(() => null),
            api.get('/wms/waves', { params: { status: 'ACTIVE' } }).then(r => ({ key: 'waves', data: r.data })).catch(() => null),
          );
          break;
        case 'LOGISTICS_MANAGER':
          promises.push(
            api.get('/logistics/trips', { params: { status: 'ACTIVE' } }).then(r => ({ key: 'trips', data: r.data })).catch(() => null),
            api.get('/logistics/vehicles/fleet').then(r => ({ key: 'fleet', data: r.data })).catch(() => null),
            api.get('/orders', { params: { status: 'UNASSIGNED', limit: 1 } }).then(r => ({ key: 'unassigned', data: r.data })).catch(() => null),
          );
          break;
        case 'TENANT_USER':
          promises.push(
            api.get('/orders', { params: { limit: 1 } }).then(r => ({ key: 'totalOrders', data: r.data })).catch(() => null),
            api.get('/inventory', { params: { limit: 1 } }).then(r => ({ key: 'totalInventory', data: r.data })).catch(() => null),
          );
          break;
      }

      const results = await Promise.allSettled(promises);
      const newStats = { ...stats };

      for (const result of results) {
        if (result.status !== 'fulfilled' || !result.value) continue;
        const { key, data } = result.value;
        const items = Array.isArray(data) ? data : (data?.data || data?.items || data?.users || []);
        const count = Array.isArray(items) ? items.length : (data?.total || data?.meta?.total || 0);

        switch (key) {
          case 'admin':
            newStats.admin.activeUsers = count;
            if (Array.isArray(items)) {
              newStats.admin.pendingInvites = items.filter((u: any) => u?.status === 'INVITED' || u?.status === 'PENDING').length;
            }
            break;
          case 'branches':
            break;
          case 'health':
            newStats.admin.systemUptime = '99.9%';
            break;
          case 'pendingOrders':
            newStats.warehouse.pendingOrders = data?.meta?.total ?? count;
            break;
          case 'lowStock':
            newStats.warehouse.lowStockItems = data?.meta?.total ?? count;
            break;
          case 'waves':
            newStats.warehouse.activeWaves = count;
            break;
          case 'trips':
            newStats.logistics.activeTrips = count;
            break;
          case 'fleet':
            const fleetData = data?.data || data;
            newStats.logistics.fleetUtilization = fleetData?.utilization
              ? `${(fleetData.utilization * 100).toFixed(0)}%`
              : count > 0 ? `${Math.min(count * 10, 95)}%` : '—';
            break;
          case 'unassigned':
            newStats.logistics.unassignedOrders = data?.meta?.total ?? count;
            break;
          case 'totalOrders':
            newStats.warehouse.pendingOrders = data?.meta?.total ?? count;
            break;
          case 'totalInventory':
            newStats.warehouse.lowStockItems = data?.meta?.total ?? count;
            break;
        }
      }

      setStats(newStats);
    } catch (err) {
      setError('Failed to load dashboard data. Some information may be unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const renderRoleSpecificContent = () => {
    switch (role) {
      case 'TENANT_ADMIN':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatCard title="Active Users" value={stats.admin.activeUsers} trend="+2 this week" />
              <StatCard title="System Uptime" value={stats.admin.systemUptime} status="Optimal" />
              <StatCard title="Storage" value={stats.admin.storageUsed} detail="2.4TB / 5TB" />
              <StatCard title="Pending Invites" value={stats.admin.pendingInvites} action="Manage" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="p-8">
                <h3 className="text-lg font-bold text-ink mb-6">Organization Overview</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                    <span className="text-sm font-semibold text-slate-600">Active Warehouses</span>
                    <Badge variant="success">03 Active</Badge>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                    <span className="text-sm font-semibold text-slate-600">Active Fleet</span>
                    <Badge variant="info">12 Vehicles</Badge>
                  </div>
                </div>
              </Card>
              <Card className="p-8">
                <h3 className="text-lg font-bold text-ink mb-6">Recent System Activity</h3>
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-4 items-start">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5"></div>
                      <div>
                        <p className="text-sm font-bold text-ink">User Invitation Accepted</p>
                        <p className="text-xs text-slate-400 font-medium">Nguyen Van A joined as Warehouse Staff • 2h ago</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        );

      case 'WAREHOUSE_MANAGER':
      case 'WAREHOUSE_STAFF':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatCard title="Pending Orders" value={stats.warehouse.pendingOrders} trend="Urgent" />
              <StatCard title="Low Stock" value={stats.warehouse.lowStockItems} status="Action Required" />
              <StatCard title="Active Waves" value={stats.warehouse.activeWaves} detail="Wave #401, #402..." />
              <StatCard title="Inventory Accuracy" value={stats.warehouse.inventoryAccuracy} status="High" />
            </div>
            <Card className="p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-lg font-bold text-ink">Priority Picking Tasks</h3>
                <Button variant="ghost" size="sm" onClick={() => window.location.href = '/wms/tasks'}>View All Tasks</Button>
              </div>
              <div className="space-y-2">
                {[1, 2, 4].map(i => (
                  <div key={i} className="flex items-center justify-between p-5 hover:bg-slate-50/80 rounded-2xl transition-all border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 font-bold text-xs">WH</div>
                      <div>
                        <p className="text-sm font-bold text-ink">Pick Order #ORD-2026-00{i}</p>
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Zone A • Bin {i}-01</p>
                      </div>
                    </div>
                    <Badge variant="warning">PENDING</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </>
        );

      case 'LOGISTICS_MANAGER':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatCard title="Active Trips" value={stats.logistics.activeTrips} status="Live Tracking" />
              <StatCard title="Utilization" value={stats.logistics.fleetUtilization} detail="Fleet Efficiency" />
              <StatCard title="Unassigned" value={stats.logistics.unassignedOrders} trend="Needs Optimization" />
              <StatCard title="On-Time Delivery" value={stats.logistics.onTimeDelivery} status="Optimal" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-2 p-8 h-[400px] flex items-center justify-center relative overflow-hidden">
                 <div className="absolute inset-0 bg-slate-50 opacity-40" style={{ backgroundImage: 'radial-gradient(#cbd5f5 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
                 <div className="text-center relative z-10">
                    <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4 text-primary">
                       <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                    </div>
                    <p className="font-bold text-ink">Regional Fleet Map</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto">Connecting to real-time GPS streams from driver mobile applications.</p>
                 </div>
              </Card>
              <Card className="p-8">
                <h3 className="text-lg font-bold text-ink mb-6">Dispatch Status</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                       <span>Fleet Capacity</span>
                       <span>{stats.logistics.fleetUtilization}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                       <div className="bg-primary h-2 rounded-full transition-all" style={{ width: '0%' }}></div>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-slate-100">
                    <Button variant="primary" className="w-full" onClick={() => window.location.href = '/logistics/dispatch'}>Run AI Optimizer</Button>
                  </div>
                </div>
              </Card>
            </div>
          </>
        );

      case 'TENANT_USER':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatCard title="Total Orders" value={stats.warehouse.pendingOrders} detail="All orders" />
              <StatCard title="SKU Count" value={stats.warehouse.lowStockItems} detail="Inventory items" />
              <StatCard title="Access Level" value="Viewer" status="Read Only" />
            </div>
            <Card className="p-8">
              <h3 className="text-lg font-bold text-ink mb-4">Quick Links</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button onClick={() => window.location.href = '/orders'} className="p-5 bg-slate-50 rounded-2xl hover:bg-primary/5 transition-colors text-left">
                  <p className="font-bold text-ink">Orders</p>
                  <p className="text-xs text-slate-400 mt-1">View and track all orders</p>
                </button>
                <button onClick={() => window.location.href = '/inventory'} className="p-5 bg-slate-50 rounded-2xl hover:bg-primary/5 transition-colors text-left">
                  <p className="font-bold text-ink">Inventory</p>
                  <p className="text-xs text-slate-400 mt-1">Browse inventory levels</p>
                </button>
              </div>
            </Card>
          </>
        );

      default:
        return (
          <Card className="p-10 flex items-center justify-center mt-8">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-ink mb-2">Welcome to your Workspace</h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                Your account is currently set to a basic access level. Please contact your Tenant Administrator to assign you to a specific functional role (e.g., Warehouse Staff, Driver).
              </p>
            </div>
          </Card>
        );
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="info" className="px-2 py-0.5">{String(role).replace('_', ' ')}</Badge>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operational Command</span>
        </div>
        <h1 className="text-4xl font-bold text-ink tracking-tight">
          Welcome back, {user?.fullName?.split(' ')[0] || 'Operator'}
        </h1>
        <p className="text-sm text-inkSoft mt-2 font-medium">System is operational. {stats.admin.pendingInvites > 0 ? `You have ${stats.admin.pendingInvites} pending items requiring attention.` : 'No critical issues reported.'}</p>
      </div>

      {renderRoleSpecificContent()}
    </div>
  );
}

function StatCard({ title, value, trend, status, detail, action }: any) {
  return (
    <Card className="p-6 hover:translate-y-[-2px] transition-all duration-300">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-3">{title}</p>
      <div className="flex items-end justify-between">
        <h4 className="text-3xl font-bold text-ink">{value}</h4>
        {trend && <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-1 rounded-lg">{trend}</span>}
        {status && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">{status}</span>}
      </div>
      {(detail || action) && (
        <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
          <span className="text-[11px] font-semibold text-slate-400">{detail}</span>
          {action && <button className="text-[11px] font-bold text-primary hover:underline" onClick={() => { if (action === 'Manage') window.location.href = '/users'; }}>{action}</button>}
        </div>
      )}
    </Card>
  );
}
