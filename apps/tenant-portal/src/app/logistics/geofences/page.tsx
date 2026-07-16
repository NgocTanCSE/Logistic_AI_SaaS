'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { RoleGuard } from '@/components/auth/RoleGuard';

type Geofence = {
  id: string;
  name: string;
  zoneType: 'ALLOWED' | 'RESTRICTED';
  polygon?: string;
  isActive?: boolean;
};

function GeofencesContent() {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'ALLOWED', polygon: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchGeofences();
  }, [page]);

  const fetchGeofences = async () => {
    setLoading(true);
    try {
      const res = await api.get('/geofences', { params: { page, limit } });
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.items || []);
      setGeofences(data);
      setTotal(res.data?.meta?.total || 0);
    } catch (err) {
      console.error('Failed to fetch geofences:', err);
      setError('Failed to load geofences. Geofence service may be unavailable.');
      setGeofences([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await api.post('/geofences', {
        name: formData.name,
        zoneType: formData.type,
        polygonWkt: formData.polygon,
      });
      setIsModalOpen(false);
      setFormData({ name: '', type: 'ALLOWED', polygon: '' });
      fetchGeofences();
    } catch (err) {
      console.error('Failed to create geofence:', err);
      setError('Failed to create geofence. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const filtered = geofences.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <RoleGuard allowedRoles={['LOGISTICS_MANAGER', 'TENANT_ADMIN']}>
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-bold text-ink tracking-tight">Geofences</h1>
          <p className="text-sm text-inkSoft mt-2 font-medium">
            Manage allowed and restricted delivery zones.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          Create Geofence
        </Button>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchGeofences} />}

      <Card className="p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search zones..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/50 border border-slate-200 text-ink text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-bold">Zone Name</th>
                <th className="px-6 py-4 font-bold">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={2} className="px-6 py-12 text-center text-sm text-slate-400">
                    Loading geofences...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-12 text-center text-sm text-slate-400">
                    {search ? 'No zones match your search.' : 'No geofences yet. Create one to get started.'}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="font-semibold text-ink">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={row.zoneType === 'ALLOWED' ? 'success' : 'error'}>
                        {row.zoneType}
                      </Badge>
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
            Page {page} of {totalPages} ({total} geofences)
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 border-t-4 border-t-primary">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-ink">Create Geofence</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                  Zone Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white/50 border border-slate-200 text-ink text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="e.g. Downtown Core"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                  Zone Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-white/50 border border-slate-200 text-ink text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                >
                  <option value="ALLOWED">Allowed</option>
                  <option value="RESTRICTED">Restricted</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                  Polygon (WKT format)
                </label>
                <textarea
                  value={formData.polygon}
                  onChange={(e) => setFormData({ ...formData, polygon: e.target.value })}
                  className="w-full bg-white/50 border border-slate-200 text-ink text-sm rounded-xl px-4 py-3 font-mono h-24 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="POLYGON((...))"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={creating || !formData.name || !formData.polygon}>
                  {creating ? 'Saving...' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </RoleGuard>
  );
}

export default function GeofencesPage() {
  return <GeofencesContent />;
}
