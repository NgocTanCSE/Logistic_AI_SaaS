'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Can } from '@/components/auth/Can';
import api from '@/lib/api';

type Branch = {
  id: string;
  name: string;
  code: string;
  type: string;
  address: string;
  status: string;
};

export default function BranchesPage() {
  const { token } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ id: '', name: '', code: '', type: 'HUB', address: '', status: 'ACTIVE' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchBranches();
  }, [token, page]);

  const fetchBranches = async () => {
    setError('');
    try {
      const res = await api.get('/tenant/branches', { params: { page, limit } });
      setBranches(res.data?.data || res.data || []);
      setTotal(res.data?.meta?.total || 0);
    } catch (err) {
      console.error('Failed to fetch branches', err);
      setError('Failed to fetch branches');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (form.id) {
        await api.patch(`/tenant/branches/${form.id}`, form);
      } else {
        await api.post('/tenant/branches', form);
      }
      setIsModalOpen(false);
      setForm({ id: '', name: '', code: '', type: 'HUB', address: '', status: 'ACTIVE' });
      fetchBranches();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (br: Branch) => {
    setForm({
      id: br.id,
      name: br.name,
      code: br.code,
      type: br.type,
      address: br.address,
      status: br.status || 'ACTIVE'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    
    try {
      await api.delete(`/tenant/branches/${id}`);
      fetchBranches();
    } catch (err) { console.error("Error deleting branch", err); setError('Failed to delete branch'); }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {error && <ErrorBanner message={error} onRetry={fetchBranches} />}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-ink tracking-tight">Branch Registry</h1>
          <p className="text-sm text-inkSoft mt-2 font-medium">Manage corporate offices, distribution hubs, and cross-docking points.</p>
        </div>
        <Can perform="settings:manage">
          <Button variant="primary" className="gap-2 shadow-lg shadow-primary/20" onClick={() => {
            setForm({ id: '', name: '', code: '', type: 'HUB', address: '', status: 'ACTIVE' });
            setIsModalOpen(true);
          }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4"/></svg>
            Register Branch
          </Button>
        </Can>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          branches.map((br) => (
            <Card key={br.id} className="p-8 group hover:border-primary/30 transition-all">
              <div className="flex justify-between items-start mb-6">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/5 text-primary flex items-center justify-center border border-primary/10">
                       <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    </div>
                    <div>
                       <h3 className="text-xl font-bold text-ink leading-tight">{br.name}</h3>
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{br.code}</span>
                    </div>
                 </div>
                 <Badge variant="success">{br.status}</Badge>
              </div>
              <div className="space-y-4 mb-8">
                 <div className="flex items-center gap-3 text-sm font-medium text-inkSoft">
                    <Badge variant="neutral" className="text-[8px]">{br.type}</Badge>
                 </div>
                 <p className="text-sm text-inkSoft font-medium flex items-start gap-2">
                    <svg className="w-4 h-4 text-slate-300 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                    {br.address}
                 </p>
              </div>
              <div className="pt-6 border-t border-slate-50 flex gap-2">
                 <Can perform="settings:manage">
                   <Button variant="outline" size="sm" className="w-full font-bold uppercase tracking-widest text-[10px]" onClick={() => handleEdit(br)}>Edit Details</Button>
                   <Button variant="outline" size="sm" className="w-full font-bold uppercase tracking-widest text-[10px] text-ember border-ember/20 hover:bg-ember/5" onClick={() => handleDelete(br.id)}>Deactivate</Button>
                 </Can>
              </div>
            </Card>
          ))
        )}
      </div>

      {!loading && total > limit && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages} ({total} branches)
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">{form.id ? 'Edit Branch' : 'Register New Branch'}</h2>
              <p className="text-sm text-slate-500 mt-1">Provide details for the corporate office, distribution hub, or cross-docking point.</p>
            </div>
            
            <form onSubmit={handleCreate} className="p-6">
              {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">{error}</div>}
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Branch Name</label>
                    <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" placeholder="e.g., Ho Chi Minh Hub" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Branch Code</label>
                    <input required type="text" value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" placeholder="e.g., SGN-HUB" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Type</label>
                    <select required value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm bg-white">
                      <option value="HUB">Distribution Hub</option>
                      <option value="CROSS_DOCK">Cross-Dock</option>
                      <option value="OFFICE">Corporate Office</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Status</label>
                    <select required value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm bg-white">
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Full Address</label>
                  <input required type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" placeholder="123 Street Name, City" />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm shadow-primary/20 disabled:opacity-50">
                  {saving ? 'Saving...' : (form.id ? 'Update Branch' : 'Register Branch')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

