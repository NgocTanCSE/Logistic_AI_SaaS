'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

type Remittance = {
  id: string;
  driverId: string;
  totalCodCollected: number;
  totalExpensesDeducted: number;
  amountRemitted: number;
  status: string;
  createdAt: string;
  driver: {
    user: { fullName: string; email: string };
  };
};

export default function CodRemittancePage() {
  const [remittances, setRemittances] = useState<Remittance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchRemittances();
  }, [page]);

  const fetchRemittances = async () => {
    setError('');
    try {
      const res = await api.get('/logistics/finance/remittances', { params: { page, limit } });
      setRemittances((res.data?.data || res.data || []));
      setTotal(res.data?.meta?.total || 0);
    } catch (err) {
      console.error("Failed to fetch remittances", err);
      setError('Failed to fetch remittances');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setError('');
    try {
      await api.patch(`/logistics/finance/remittances/${id}/status`, { status: 'COMPLETED' });
      fetchRemittances();
    } catch (err) {
      console.error("Failed to approve remittance", err);
      setError('Failed to approve remittance');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const getStatusVariant = (status: string) => {
    switch(status) {
      case 'PENDING': return 'warning';
      case 'COMPLETED': return 'success';
      case 'REJECTED': return 'error';
      default: return 'neutral';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {error && <ErrorBanner message={error} onRetry={fetchRemittances} />}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-ink tracking-tight">COD Remittance</h1>
        <p className="text-sm text-inkSoft mt-2 font-medium">Verify and approve cash deposits from the driver workforce.</p>
      </div>

      <Card className="animate-slide-up">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-border">
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Driver</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">COD Collected</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Expenses</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Net Remitted</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-bold uppercase text-[11px]">Syncing with Financial Ledger...</td></tr>
              ) : remittances.length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-medium">No pending remittances.</td></tr>
              ) : (
                remittances.map(rem => (
                  <tr key={rem.id} className="hover:bg-slate-50/80 transition-all">
                    <td className="px-8 py-6">
                      <div className="font-bold text-ink">{rem.driver?.user?.fullName}</div>
                      <div className="text-[10px] font-semibold text-slate-400 mt-1 uppercase">{new Date(rem.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-8 py-6 font-bold text-ink">${Number(rem.totalCodCollected).toLocaleString()}</td>
                    <td className="px-8 py-6 font-bold text-rose-500">-${Number(rem.totalExpensesDeducted).toLocaleString()}</td>
                    <td className="px-8 py-6 font-extrabold text-emerald-600">${Number(rem.amountRemitted).toLocaleString()}</td>
                    <td className="px-8 py-6"><Badge variant={getStatusVariant(rem.status)}>{rem.status}</Badge></td>
                    <td className="px-8 py-6 text-right">
                      {rem.status === 'PENDING' && (
                        <Button variant="primary" size="sm" onClick={() => handleApprove(rem.id)} className="text-[10px] font-bold tracking-widest uppercase">
                          APPROVE
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {!loading && total > limit && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages} ({total} records)
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
    </div>
  );
}

