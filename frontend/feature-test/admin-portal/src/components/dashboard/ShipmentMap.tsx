'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

type LogisticsData = {
  activeShipments: number;
  inTransit: number;
  delayedShipments: number;
  activeVehicles: number;
  activeDrivers: number;
  inventoryAlerts: number;
};

type Shipment = {
  id: string;
  from: string;
  to: string;
  status: 'in_transit' | 'delayed' | 'delivered';
  progress: number;
};

const MOCK_SHIPMENTS: Shipment[] = [
  { id: 'SHP-2024-0847', from: 'Hanoi', to: 'Ho Chi Minh', status: 'in_transit', progress: 65 },
  { id: 'SHP-2024-0848', from: 'Da Nang', to: 'Hai Phong', status: 'in_transit', progress: 30 },
  { id: 'SHP-2024-0849', from: 'Can Tho', to: 'Nha Trang', status: 'delayed', progress: 45 },
  { id: 'SHP-2024-0850', from: 'Hai Phong', to: 'Da Nang', status: 'delivered', progress: 100 },
];

export function ShipmentMap({ logistics }: { logistics: LogisticsData | null }) {
  const [shipments, setShipments] = useState<Shipment[]>(MOCK_SHIPMENTS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchShipments = async () => {
      setLoading(true);
      try {
        const res = await api.get('/logistics/shipments?status=ACTIVE&limit=10');
        const data = res.data?.data || res.data;
        if (Array.isArray(data) && data.length > 0) {
          setShipments(data.map((s: any) => ({
            id: s.id || s.shipmentId || '—',
            from: s.origin || s.pickupLocation || '—',
            to: s.destination || s.dropoffLocation || '—',
            status: s.status === 'IN_TRANSIT' ? 'in_transit' : s.status === 'DELIVERED' ? 'delivered' : 'delayed',
            progress: s.progress || Math.floor(Math.random() * 100),
          })));
        }
      } catch {
        // Fallback to mock data
        setShipments(MOCK_SHIPMENTS);
      } finally {
        setLoading(false);
      }
    };
    fetchShipments();
  }, []);

  const statusColor = (status: string) => {
    switch (status) {
      case 'in_transit': return 'bg-cyan-500';
      case 'delayed': return 'bg-rose-500';
      case 'delivered': return 'bg-emerald-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
      <h3 className="text-lg font-semibold text-ink mb-1">Live Shipment Tracking</h3>
      <p className="text-sm text-inkSoft mb-4">
        {logistics?.activeShipments || 0} active shipments · {logistics?.inTransit || 0} in transit · {logistics?.delayedShipments || 0} delayed
      </p>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center text-slate-400 py-8">Loading shipments…</div>
        ) : shipments.map((s) => (
          <div key={s.id} className="border border-slate-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-bold text-inkSoft">{s.id}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColor(s.status)} text-white`}>
                {s.status.replace('_', ' ')}
              </span>
            </div>
            <div className="text-xs text-slate-600 mb-1 flex justify-between">
              <span>{s.from}</span>
              <span>→</span>
              <span>{s.to}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className="h-full rounded-full transition-all" style={{
                width: `${s.progress}%`,
                backgroundColor: s.status === 'delayed' ? '#ef4444' : s.status === 'delivered' ? '#10b981' : '#06b6d4',
              }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
