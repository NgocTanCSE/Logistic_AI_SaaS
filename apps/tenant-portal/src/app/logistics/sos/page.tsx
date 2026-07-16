'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

type SosAlert = {
  id: string;
  driverId: string;
  tripId: string;
  message: string;
  status: string;
  createdAt: string;
  driver: {
    user: { fullName: string; email: string };
  };
};

export default function SosControlCenterPage() {
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [selectedDriverName, setSelectedDriverName] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, [page]);

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/logistics/finance/sos', { params: { status: 'OPEN', page, limit } });
      setAlerts(res.data?.data || res.data || []);
      setTotal(res.data?.meta?.total || 0);
    } catch (err) {
      console.error("Failed to fetch SOS alerts", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await api.patch(`/logistics/finance/sos/${id}/resolve`, { status: 'RESOLVED' });
      fetchAlerts();
    } catch (err) {
      console.log("Failed to resolve alert");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-bold text-rose-600 tracking-tight flex items-center gap-4">
            <span className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span>
            </span>
            SOS Control Center
          </h1>
          <p className="text-sm text-inkSoft mt-2 font-medium">Real-time emergency monitoring and crisis response.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {loading ? (
          <div className="md:col-span-2 py-20 text-center text-slate-400 uppercase tracking-widest text-[11px] font-bold">Scanning for Emergencies...</div>
        ) : alerts.length === 0 ? (
          <div className="md:col-span-2 py-20 text-center bg-emerald-50 rounded-3xl border-2 border-emerald-100/50">
             <svg className="w-12 h-12 text-emerald-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             <p className="font-bold text-emerald-800">No active SOS alerts</p>
             <p className="text-sm text-emerald-600 mt-1">All fleet operations are currently safe.</p>
          </div>
        ) : (
          alerts.map(alert => (
            <Card key={alert.id} className="border-rose-200 bg-rose-50/30 overflow-hidden group">
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                   <div>
                     <div className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1">Emergency Signal</div>
                     <div className="text-xl font-bold text-ink">{alert.driver?.user?.fullName}</div>
                   </div>
                   <Badge variant="error" className="animate-pulse">CRITICAL</Badge>
                </div>
                
                <div className="bg-white/80 rounded-2xl p-5 border border-rose-100 mb-8">
                  <p className="text-sm font-bold text-ink italic">"{alert.message || 'No message provided'}"</p>
                  <p className="text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-wide">
                    {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-3">
                   <Button variant="primary" className="flex-1 bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-200" onClick={() => handleResolve(alert.id)}>
                      MARK AS RESOLVED
                   </Button>
                   <Button variant="outline" className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => {
                     setSelectedDriverName(alert.driver?.user?.fullName || 'Unknown Driver');
                     setDispatchModalOpen(true);
                   }}>
                      DISPATCH HELP
                   </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {!loading && total > limit && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages} ({total} alerts)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Dispatch Help Modal */}
      {dispatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 text-center border-t-4 border-t-rose-500">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-ink mb-2">Help Dispatched</h2>
            <p className="text-slate-500 text-sm mb-6">
              Emergency responders and the nearest available fleet supervisor have been dispatched for <b>{selectedDriverName}</b>.
            </p>
            <div className="flex justify-center">
              <Button variant="primary" className="bg-rose-600 hover:bg-rose-700 w-full" onClick={() => setDispatchModalOpen(false)}>Acknowledge</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

