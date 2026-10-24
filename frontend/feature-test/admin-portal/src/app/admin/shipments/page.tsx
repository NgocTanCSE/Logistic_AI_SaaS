'use client';

import { useState, useEffect } from 'react';
import { TableState } from 'ui-components';
import api from '@/lib/api';
import { Card } from '@/components/ui-new/Card';
import { Badge } from '@/components/ui-new/Badge';
import { Shipment, fetchFromStoreOrAPI, getAll, initStore } from '@/lib/local-store';

const STATUS_VARIANT: Record<string, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  IN_TRANSIT: 'info',
  DELAYED: 'warning',
  DELIVERED: 'success',
  PENDING: 'neutral',
  OUT_FOR_DELIVERY: 'success',
};

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShipments = async () => {
    setLoading(true);
    setError(null);
    try {
      initStore();
      const data = await fetchFromStoreOrAPI<Shipment[]>('shipments', '/logistics/shipments?limit=20');
      setShipments(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load shipments');
      setShipments(getAll<Shipment[]>('shipments'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchShipments();
  }, []);

  const inTransit = shipments.filter((s) => s.status === 'IN_TRANSIT' || s.status === 'OUT_FOR_DELIVERY').length;
  const delayed = shipments.filter((s) => s.status === 'DELAYED').length;
  const delivered = shipments.filter((s) => s.status === 'DELIVERED').length;

  return (
    <div className="pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-ink">Shipments</h2>
          <p className="text-sm text-inkSoft mt-1">Real-time tracking of all active and completed shipments.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-ink">{shipments.length}</div>
          <div className="text-xs text-inkSoft">Total Shipments</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-cyan-600">{inTransit}</div>
          <div className="text-xs text-inkSoft">In Transit</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{delayed}</div>
          <div className="text-xs text-inkSoft">Delayed</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{delivered}</div>
          <div className="text-xs text-inkSoft">Delivered</div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Tracking #</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Driver</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Route</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">ETA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <TableState
                loading={loading}
                empty={!loading && shipments.length === 0}
                error={error ? new Error(error) : undefined}
                colSpan={6}
                emptyContent={<tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No shipments found.</td></tr>}
              >
                {shipments.map((shipment) => (
                  <tr key={shipment.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-ink">{shipment.trackingNumber}</td>
                    <td className="px-6 py-4 text-ink">{shipment.driver}</td>
                    <td className="px-6 py-4 text-slate-600">{shipment.vehicle}</td>
                    <td className="px-6 py-4 text-slate-600">{shipment.origin} → {shipment.destination}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Badge variant={STATUS_VARIANT[shipment.status] || 'neutral'}>
                          {shipment.status.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-slate-400">{shipment.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-slate-500">
                      {new Date(shipment.eta).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
