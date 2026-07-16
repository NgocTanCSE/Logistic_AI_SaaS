'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import api from '@/lib/api';

type Driver = {
  id: string;
  user: { fullName: string; email: string; phone?: string };
  licenseClass: string;
  licenseExpiry: string;
  status: string;
};

export default function DriversPage() {
  const { token } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    if (token) fetchDrivers();
  }, [token, page]);

  const fetchDrivers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/drivers', { params: { page, limit } });
      const data = res.data;
      setDrivers(Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []));
      setTotal(data?.meta?.total || 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch drivers');
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    const fullName = prompt("Driver Full Name:");
    if (!fullName) return;
    const licenseClass = prompt("License Class (e.g. B2, C):");
    if (!licenseClass) return;
    try {
      await api.post('/drivers', { fullName, licenseClass });
      fetchDrivers();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to add driver');
    }
  };

  const isLicenseExpired = (expiry: string) => new Date(expiry) < new Date();

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {error && <ErrorBanner message={error} onRetry={fetchDrivers} />}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-ink tracking-tight">Drivers</h1>
          <p className="text-sm text-inkSoft mt-2 font-medium">Manage driver profiles and assignments.</p>
        </div>
        <Button variant="primary" onClick={handleAdd} className="gap-2 shadow-lg shadow-primary/20">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4"/></svg>
          Add Driver
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-border">
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Name</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">License</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Expiry</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest">Loading...</td></tr>
              ) : drivers.length === 0 ? (
                <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest">No drivers found.</td></tr>
              ) : drivers.map(d => {
                const expired = isLicenseExpired(d.licenseExpiry);
                return (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-all">
                    <td className="px-8 py-6 font-bold text-ink">{d.user?.fullName || 'N/A'}</td>
                    <td className="px-8 py-6"><Badge variant="info">{d.licenseClass}</Badge></td>
                    <td className="px-8 py-6">{new Date(d.licenseExpiry).toLocaleDateString()}</td>
                    <td className="px-8 py-6"><Badge variant={expired ? 'error' : d.status === 'ACTIVE' ? 'success' : 'warning'}>{expired ? 'EXPIRED' : d.status}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {!loading && total > limit && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}