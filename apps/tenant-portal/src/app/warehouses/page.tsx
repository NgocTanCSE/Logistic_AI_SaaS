'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import api from '@/lib/api';

type Warehouse = {
  id: string;
  name: string;
  code: string;
  address: string;
  status: string;
  manager?: { fullName: string };
};

export default function WarehousesPage() {
  const { token } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', address: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (token) fetchWarehouses();
  }, [token, page]);

  const fetchWarehouses = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/warehouses', { params: { page, limit } });
      const data = res.data;
      setWarehouses(Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []));
      setTotal(data?.meta?.total || 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch warehouses');
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code || !form.address) return;
    setSaving(true);
    try {
      await api.post('/warehouses', form);
      setIsModalOpen(false);
      setForm({ name: '', code: '', address: '' });
      fetchWarehouses();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create warehouse');
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {error && <ErrorBanner message={error} onRetry={fetchWarehouses} />}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-ink tracking-tight">Warehouses</h1>
          <p className="text-sm text-inkSoft mt-2 font-medium">Manage your warehouse facilities and locations.</p>
        </div>
        <Button variant="primary" size="md" onClick={() => setIsModalOpen(true)} className="gap-2 shadow-lg shadow-primary/20">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4"/></svg>
          Add Warehouse
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-border">
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Code</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Name</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Address</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest">Loading...</td></tr>
              ) : warehouses.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest">No warehouses found.</td></tr>
              ) : warehouses.map(w => (
                <tr key={w.id} className="hover:bg-slate-50/80 transition-all">
                  <td className="px-8 py-6 font-mono font-bold text-primary">{w.code}</td>
                  <td className="px-8 py-6 font-bold text-ink">{w.name}</td>
                  <td className="px-8 py-6 text-slate-500">{w.address}</td>
                  <td className="px-8 py-6"><Badge variant={w.status === 'ACTIVE' ? 'success' : 'error'}>{w.status}</Badge></td>
                  <td className="px-8 py-6 text-right">
                    <Button variant="ghost" size="sm" onClick={() => window.location.href = `/warehouses/${w.id}`} className="font-bold text-primary tracking-widest text-[10px]">
                      VIEW
                    </Button>
                  </td>
                </tr>
              ))}
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-white p-6">
            <h2 className="text-xl font-bold mb-4">Add New Warehouse</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Name</label>
                <Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Downtown Hub" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Code</label>
                <Input required value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="e.g. WH-01" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Address</label>
                <Input required value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Full address" />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>Save Warehouse</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}