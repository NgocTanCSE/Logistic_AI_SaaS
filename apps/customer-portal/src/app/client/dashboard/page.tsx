'use client';
import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = async (url: string) => {
  const token = localStorage.getItem('smartlogi_customer_token');
  const userStr = localStorage.getItem('smartlogi_customer_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (user?.slug) headers['x-tenant-slug'] = user.slug;

  const res = await api.get(url, { headers });
  return res.data;
};

export default function ClientDashboard() {
  // Using SWR to fetch client orders
  const { data, error, isLoading } = useSWR('/client/orders', fetcher);

  const orders = data?.data || [];
  const totalShipments = orders.length;
  const delivered = orders.filter((o: any) => o.status === 'DELIVERED').length;
  const returned = orders.filter((o: any) => o.status === 'RETURNED' || o.status === 'CANCELLED').length;
  const returnRate = totalShipments > 0 ? ((returned / totalShipments) * 100).toFixed(1) : '0.0';

  if (error) {
    console.error("Failed to load dashboard data:", error);
  }

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-bold">Welcome Back, Shop Owner</h2>
      <p className="text-gray-400 mt-1">Here is your delivery performance this month.</p>
      
      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
          Failed to load dashboard data. Please try again later.
        </div>
      )}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-6 mt-8">
          <div className="h-32 glass-panel rounded-xl animate-pulse bg-white/5"></div>
          <div className="h-32 glass-panel rounded-xl animate-pulse bg-white/5"></div>
          <div className="h-32 glass-panel rounded-xl animate-pulse bg-white/5"></div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6 mt-8">
          <div className="glass-panel p-6 rounded-xl hover-glow transition-all">
            <p className="text-sm text-gray-400 uppercase tracking-widest">Total Shipments</p>
            <p className="text-4xl font-bold mt-2 text-white">{totalShipments > 0 ? totalShipments : '—'}</p>
          </div>
          <div className="glass-panel p-6 rounded-xl hover-glow transition-all">
            <p className="text-sm text-gray-400 uppercase tracking-widest">Delivered</p>
            <p className="text-4xl font-bold mt-2 text-emerald-400">{totalShipments > 0 ? delivered : '—'}</p>
          </div>
          <div className="glass-panel p-6 rounded-xl hover-glow transition-all">
            <p className="text-sm text-gray-400 uppercase tracking-widest">Return/Cancel Rate</p>
            <p className="text-4xl font-bold mt-2 text-red-400">{totalShipments > 0 ? `${returnRate}%` : '—'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
