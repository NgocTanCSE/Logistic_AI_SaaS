'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TableState } from 'ui-components';
import { Card } from '@/components/ui-new/Card';
import { Plus, Upload } from 'phosphor-react';
import { Order, fetchFromStoreOrAPI, getAll, update, remove, initStore } from '@/lib/local-store';

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-amber-100 text-amber-800 border border-amber-200',
  UNASSIGNED: 'bg-purple-100 text-purple-800 border border-purple-200',
  PENDING_PICKUP: 'bg-orange-100 text-orange-800 border border-orange-200',
  IN_TRANSIT: 'bg-cyan-100 text-cyan-800 border border-cyan-200',
  OUT_FOR_DELIVERY: 'bg-blue-100 text-blue-800 border border-blue-200',
  DELIVERED: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  RETURNED: 'bg-rose-100 text-rose-800 border border-rose-200',
  RETURN_REQUESTED: 'bg-red-100 text-red-800 border border-red-200',
  CANCELLED: 'bg-slate-100 text-slate-800 border border-slate-200',
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      initStore();
      const data = await fetchFromStoreOrAPI<Order[]>('orders', '/orders?limit=20');
      setOrders(data);
    } catch (err) {
      setError('Failed to load orders.');
      setOrders(getAll<Order[]>('orders'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrders();
  }, []);

  const handleStatusChange = async (order: Order, newStatus: string) => {
      const updated = update('orders', order.id, { status: newStatus }) as Order | null;
      if (updated) {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
    }
  };

  const handleDelete = async (order: Order) => {
    if (!window.confirm(`Remove order ${order.trackingCode}?`)) return;
    if (remove('orders', order.id)) {
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
    }
  };

  const handleNewOrder = () => {
    router.push('/admin/orders/new');
  };

  const handleBulkUpload = () => {
    router.push('/admin/orders/upload');
  };

  const pendingOrders = useMemo(
    () => orders.filter((o) => o.status === 'NEW' || o.status === 'UNASSIGNED'),
    [orders],
  );

  const summary = [
    { label: 'Tổng đơn', value: orders.length },
    { label: 'Chờ xử lý', value: pendingOrders.length },
    { label: 'Đang vận chuyển', value: orders.filter((o) => o.status === 'IN_TRANSIT' || o.status === 'OUT_FOR_DELIVERY').length },
    { label: 'Đã giao', value: orders.filter((o) => o.status === 'DELIVERED').length },
  ];

  return (
    <div className="pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-ink">Orders</h2>
          <p className="text-sm text-inkSoft mt-1">Track customer orders across all tenants.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleBulkUpload}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-surface-alt text-ink rounded-lg transition-colors border border-slate-200"
          >
            <Upload className="w-4 h-4" />
            Bulk Upload
          </button>
          <button
            onClick={handleNewOrder}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Order
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {summary.map((item) => (
          <div key={item.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-ink">{item.value}</div>
            <div className="text-xs text-inkSoft">{item.label}</div>
          </div>
        ))}
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
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <TableState
                loading={loading}
                empty={!loading && orders.length === 0}
                error={error ? new Error(error) : undefined}
                colSpan={6}
                emptyContent={<tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No orders found. Create your first order with the "New Order" button.</td></tr>}
              >
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-ink">{order.trackingCode || `#${order.id}`}</td>
                    <td className="px-6 py-4 text-ink">{order.recipientName || order.client?.name || '—'}</td>
                    <td className="px-6 py-4 text-slate-600">{order.origin} → {order.destination}</td>
                    <td className="px-6 py-4">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order, e.target.value)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer ${STATUS_COLORS[order.status] || STATUS_COLORS.NEW}`}
                      >
                        {Object.keys(STATUS_COLORS).map((status) => (
                          <option key={status} value={status}>
                            {status.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-ink">{(order.codAmount + (order.shippingFee || 0)).toLocaleString()}đ</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDelete(order)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded text-xs font-medium transition-colors"
                        title="Remove order"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </TableState>
            </tbody>
          </table>
        </div>
      </Card>

      {error && (
        <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
          {error} Data shown is from local storage.
        </div>
      )}
    </div>
  );
}
