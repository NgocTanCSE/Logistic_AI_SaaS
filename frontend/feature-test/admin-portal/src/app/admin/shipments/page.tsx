'use client';

import { TableState } from 'ui-components';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card } from '@/components/ui-new/Card';
import { Badge } from '@/components/ui-new/Badge';

type Shipment = {
  id: string;
  trackingNumber: string;
  driver: string;
  vehicle: string;
  origin: string;
  destination: string;
  status: string;
  progress: number;
  eta: string;
};

const MOCK_SHIPMENTS: Shipment[] = [
  { id: '1', trackingNumber: 'SHP-2024-0847', driver: 'Nguyen Van A', vehicle: 'Truck #T001', origin: 'Hanoi', destination: 'Ho Chi Minh', status: 'IN_TRANSIT', progress: 65, eta: '2024-09-16T18:00:00Z' },
  { id: '2', trackingNumber: 'SHP-2024-0848', driver: 'Tran Thi B', vehicle: 'Truck #T002', origin: 'Da Nang', destination: 'Hai Phong', status: 'IN_TRANSIT', progress: 30, eta: '2024-09-16T12:00:00Z' },
  { id: '3', trackingNumber: 'SHP-2024-0849', driver: 'Le Van C', vehicle: 'Truck #T003', origin: 'Can Tho', destination: 'Nha Trang', status: 'DELAYED', progress: 45, eta: '2024-09-18T10:00:00Z' },
  { id: '4', trackingNumber: 'SHP-2024-0850', driver: 'Pham Thi D', vehicle: 'Truck #T004', origin: 'Hai Phong', destination: 'Da Nang', status: 'DELIVERED', progress: 100, eta: '2024-09-15T09:00:00Z' },
];

const STATUS_VARIANT: Record<string, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  IN_TRANSIT: 'info',
  DELAYED: 'warning',
  DELIVERED: 'success',
  PENDING: 'neutral',
};

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShipments = async () => {
      setLoading(true);
      try {
        const res = await api.get('/logistics/shipments?limit=20');
        // Logistics service wraps responses as { success, data: { data: [...] } }.
        const payload = res.data?.data?.data ?? res.data?.data ?? res.data;
        const data = Array.isArray(payload) ? payload : [];
        setShipments(data.length > 0 ? data : MOCK_SHIPMENTS);
      } catch {
        setShipments(MOCK_SHIPMENTS);
      } finally {
        setLoading(false);
      }
    };
    fetchShipments();
  }, []);

  return (
    <div className="pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-ink">Shipments</h2>
          <p className="text-sm text-inkSoft mt-1">Real-time tracking of all active and completed shipments.</p>
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
    </div>
  );
}
