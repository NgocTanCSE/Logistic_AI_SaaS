'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button, TableState } from 'ui-components';
import {
  EditorialPageHeader,
  EditorialSection,
  MetricBand,
  StatusLabel,
} from 'ui-kit';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/format';
import { Order, fetchFromStoreOrAPI, getAll, update, remove, initStore } from '@/lib/local-store';

const STATUS_TONE: Record<Order['status'], 'default' | 'warning' | 'danger' | 'success' | 'info'> = {
  NEW: 'warning',
  UNASSIGNED: 'info',
  PENDING_PICKUP: 'info',
  IN_TRANSIT: 'info',
  OUT_FOR_DELIVERY: 'info',
  DELIVERED: 'success',
  RETURN_REQUESTED: 'warning',
  RETURNED: 'danger',
  CANCELLED: 'danger',
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
      setOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load orders.');
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

  const confirmDelete = (order: Order) => {
    if (window.confirm(`Remove order ${order.trackingCode}?`)) return true;
    return false;
  };

  const handleDelete = async (order: Order) => {
    if (!confirmDelete(order)) return;
    if (remove('orders', order.id)) {
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
    }
  };

  const pendingOrders = useMemo(
    () => orders.filter((o) => o.status === 'NEW' || o.status === 'UNASSIGNED'),
    [orders],
  );

  const summary = [
    { label: 'Pending', value: pendingOrders.length, meta: 'New or unassigned' },
    { label: 'In transit', value: orders.filter((o) => o.status === 'IN_TRANSIT' || o.status === 'OUT_FOR_DELIVERY').length, meta: 'On the way' },
    { label: 'Delivered', value: orders.filter((o) => o.status === 'DELIVERED').length, meta: 'Today' },
    { label: 'Returns', value: orders.filter((o) => o.status === 'RETURNED' || o.status === 'RETURN_REQUESTED').length, meta: 'All status' },
  ];

  return (
    <div>
      <EditorialPageHeader
        eyebrow="Dashboard"
        title="Orders"
        description="Track customer orders across all tenants."
        meta={
          <div className="text-[11px] leading-5">
            {orders.length > 0 ? `${orders.length} orders` : 'No orders'}
          </div>
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/admin/orders/upload')}>
              Bulk upload
            </Button>
            <Button variant="primary" size="sm" onClick={() => router.push('/admin/orders/new')}>
              Create order
            </Button>
          </div>
        }
      />

      <MetricBand
        metrics={[
          { label: 'Pending', value: pendingOrders.length, meta: summary[0].meta },
          { label: 'In transit', value: summary[1].value, meta: summary[1].meta },
          { label: 'Delivered', value: summary[2].value, meta: summary[2].meta },
          { label: 'Returns', value: summary[3].value, meta: summary[3].meta, tone: summary[3].value > 0 ? 'warning' : 'default' },
        ]}
      />

      <EditorialSection eyebrow="Orders" title="All orders">
        {/* Data table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">All orders across tenants</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="h-8 pr-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Tracking #</th>
                <th scope="col" className="h-8 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Customer</th>
                <th scope="col" className="h-8 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Route</th>
                <th scope="col" className="h-8 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Status</th>
                <th scope="col" className="h-8 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">COD</th>
                <th scope="col" className="h-8 pl-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Created</th>
                <th scope="col" className="h-8 pl-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Actions</th>
              </tr>
            </thead>
            <tbody>
              <TableState
                loading={loading}
                empty={!loading && orders.length === 0}
                error={error ? new Error(error) : undefined}
                onRetry={fetchOrders}
                colSpan={7}
                emptyTitle="No orders found"
                emptyDescription="Orders created or synced will appear here."
              >
                {orders.map((order) => (
                  <tr key={order.id} className="h-[42px] border-b border-line/80 transition-colors hover:bg-surface-alt/60">
                    <td className="pr-3 text-[12px] font-medium font-mono text-ink">{order.trackingCode || `#${order.id}`}</td>
                    <td className="px-3 text-[12px] text-ink">{order.recipientName || order.client?.name || '—'}</td>
                    <td className="px-3 text-[12px] text-ink-soft">{order.origin} → {order.destination}</td>
                    <td className="px-3">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order, e.target.value as Order['status'])}
                        className="h-7 rounded-md border border-line bg-surface px-2 text-[11px] font-medium text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                      >
                        {Object.keys(STATUS_TONE).map((status) => (
                          <option key={status} value={status}>
                            {status.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 text-[12px] tabular-nums text-ink-soft">{formatCurrency(order.codAmount + (order.shippingFee || 0))}</td>
                    <td className="px-3 text-[12px] tabular-nums text-ink-soft">
                      {order.createdAt ? formatDateTime(order.createdAt) : '—'}
                    </td>
                    <td className="pl-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(order)}
                        className="text-[11px] font-medium text-ink-soft underline decoration-ink-faint/30 underline-offset-2 hover:text-danger hover:decoration-danger"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </TableState>
            </tbody>
          </table>
        </div>
      </EditorialSection>
    </div>
  );
}
