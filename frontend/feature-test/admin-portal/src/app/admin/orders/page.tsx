'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card } from '@/components/ui-new/Card';

type Order = {
  id: string;
  trackingCode: string;
  recipientName: string;
  recipientAddress: string;
  status: string;
  codAmount: number;
  shippingFee?: number;
  createdAt: string;
  client?: { name?: string };
};

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-amber-100 text-amber-800 border border-amber-200',
  UNASSIGNED: 'bg-purple-100 text-purple-800 border border-purple-200',
  PENDING_PICKUP: 'bg-orange-100 text-orange-800 border border-orange-200',
  IN_TRANSIT: 'bg-cyan-100 text-cyan-800 border border-cyan-200',
  DELIVERED: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  RETURNED: 'bg-rose-100 text-rose-800 border border-rose-200',
  RETURN_REQUESTED: 'bg-red-100 text-red-800 border border-red-200',
  CANCELLED: 'bg-rose-100 text-rose-800 border border-rose-200',
};

const MOCK_ORDERS: Order[] = [
  { id: '1', trackingCode: 'TRK-2024-0847', recipientName: 'Acme Logistics', recipientAddress: '123 Main St, Hanoi', status: 'IN_TRANSIT', codAmount: 2450000, createdAt: '2024-09-15T10:30:00Z' },
  { id: '2', trackingCode: 'TRK-2024-0848', recipientName: 'Global Shipping Inc', recipientAddress: '456 Harbor Rd, Da Nang', status: 'DELIVERED', codAmount: 1890000, createdAt: '2024-09-14T14:15:00Z' },
  { id: '3', trackingCode: 'TRK-2024-0849', recipientName: 'FastFreight Partners', recipientAddress: '789 Market St, Can Tho', status: 'NEW', codAmount: 3200000, createdAt: '2024-09-15T08:45:00Z' },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await api.get('/orders?limit=20');
        const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setOrders(data.length > 0 ? data : MOCK_ORDERS);
      } catch {
        setOrders(MOCK_ORDERS);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  return (
    <div className="pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-ink">Orders</h2>
          <p className="text-sm text-inkSoft mt-1">Track customer orders across all tenants.</p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Tracking #</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Route</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Loading orders…</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No orders found.</td></tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-ink">{order.trackingCode || `#${order.id}`}</td>
                    <td className="px-6 py-4 text-ink">{order.recipientName || order.client?.name || '—'}</td>
                    <td className="px-6 py-4 text-slate-600">{order.recipientAddress || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${STATUS_COLORS[order.status] || STATUS_COLORS.NEW}`}>
                        {(order.status || 'NEW').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-ink">{(order.codAmount + (order.shippingFee || 0)).toLocaleString()}đ</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
