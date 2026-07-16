'use client';

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Badge } from "@/components/ui-new/Badge";
import { Button } from "@/components/ui-new/Button";
import { Card } from "@/components/ui-new/Card";
import { Input } from "@/components/ui-new/Input";
import { SearchBar } from "@/components/ui/SearchBar";
import { TenantActionMenu } from "@/components/ui/TenantActionMenu";
import api from '@/lib/api';

const PAGE_SIZE = 15;

export default function TenantsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageParam = searchParams.get('page');
  const page = Math.max(1, Number(pageParam ?? '1') || 1);

  const [tenants, setTenants] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantSlug, setNewTenantSlug] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTenants(page, filter);
  }, [page, filter]);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setIsModalOpen(true);
      // Clean up the URL so it doesn't reopen on refresh
      const newUrl = window.location.pathname + (page !== 1 ? `?page=${page}` : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams, page]);

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setNewTenantName(name);
    setNewTenantSlug(name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName || !newTenantSlug) return;
    setError('');
    setCreating(true);
    try {
      const token = localStorage.getItem('smartlogi_admin_token');
      await api.post('/admin/tenants', { 
        name: newTenantName,
        slug: newTenantSlug 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsModalOpen(false);
      setNewTenantName('');
      setNewTenantSlug('');
      fetchTenants(1, 'All');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create tenant. Slug might already be in use.');
    } finally {
      setCreating(false);
    }
  };

  const fetchTenants = async (pageNum: number, currentFilter: string) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('smartlogi_admin_token');
      const res = await api.get('/admin/tenants', {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: pageNum, limit: PAGE_SIZE, status: currentFilter === 'All' ? undefined : currentFilter }
      });
      
      if (res.data && res.data.data) {
        const mappedTenants = res.data.data.map((t: any) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          plan: t.plan?.name || 'Free',
          users: t.maxUsers,
          warehouses: t.maxWarehouses,
          createdAt: t.createdAt,
          status: t.status,
        }));
        
        setTenants(mappedTenants);
        setTotal(res.data.meta?.total || 0);
      }
    } catch (err) {
      console.error('API Error:', err);
      setError('Failed to load tenants.');
      setTenants([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (newFilter: string) => {
    setFilter(newFilter);
    router.push('/admin/tenants?page=1');
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;

  const getStatusVariant = (status: string) => {
    switch(status) {
      case 'ACTIVE': return 'success';
      case 'PENDING': return 'warning';
      case 'SUSPENDED': return 'error';
      default: return 'neutral';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      
      {/* Onboarding Modal */}
      <ErrorBanner message={error} onRetry={() => fetchTenants(page, filter)} />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-white border-white/40 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold text-ink tracking-tight">Onboard Tenant</h3>
                  <p className="text-sm text-inkSoft mt-1 font-medium">Register a new enterprise customer.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-ink transition-colors">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            
            <form onSubmit={handleCreateTenant} className="p-8">
              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-100 animate-fade-in flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {error}
                </div>
              )}
              
              <div className="space-y-5">
                <Input 
                  label="Company Name"
                  type="text" 
                  value={newTenantName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Acme Logistics"
                  required
                />
                <Input 
                  label="Workspace URL Slug"
                  type="text" 
                  value={newTenantSlug}
                  onChange={(e) => setNewTenantSlug(e.target.value)}
                  placeholder="e.g. acme-logistics"
                  required
                  icon={<span className="text-[10px] font-bold text-slate-400">@</span>}
                />
              </div>

              <div className="flex gap-4 mt-10">
                <Button 
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 font-bold uppercase tracking-widest text-[10px]"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  variant="primary"
                  isLoading={creating}
                  disabled={!newTenantName.trim() || !newTenantSlug.trim()}
                  className="flex-1 font-bold uppercase tracking-widest text-[10px]"
                >
                  {creating ? 'PROVISIONING...' : 'CREATE TENANT'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h2 className="text-4xl font-bold text-ink tracking-tight">Tenants</h2>
          <p className="text-sm text-inkSoft mt-2 font-medium">Manage enterprise accounts, resource quotas, and system access.</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          variant="primary"
          className="gap-2 shadow-lg shadow-primary/20"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
          Add New Tenant
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <SearchBar placeholder="Search by Company Name or Slug..." />
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">Filter by Status:</span>
          {['All', 'Active', 'Pending', 'Suspended'].map((f) => (
            <button 
              key={f} 
              onClick={() => handleFilter(f)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                filter === f 
                  ? 'bg-primary text-white shadow-md shadow-primary/20' 
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <Card className="animate-slide-up">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-border">
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Company & Workspace</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Plan</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Quotas</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Registered</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Retrieving Tenant Data...</span>
                    </div>
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-medium font-bold uppercase tracking-widest text-xs">No tenants matched your search criteria.</td>
                </tr>
              ) : (
                tenants.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary to-teal-400 border border-white shadow-sm flex items-center justify-center text-white font-bold text-xl">
                          {row.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-ink leading-tight">{row.name}</div>
                          <div className="text-[11px] text-slate-400 mt-1 font-bold uppercase tracking-wider">{row.slug}.smartlogi.vn</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <Badge variant={row.plan === 'Enterprise' ? 'info' : row.plan === 'Pro' ? 'success' : 'neutral'}>
                        {row.plan}
                      </Badge>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4 text-[10px] font-bold text-inkSoft uppercase tracking-widest">
                        <div className="flex items-center gap-1.5" title="Users">
                          <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                          {row.users}
                        </div>
                        <div className="flex items-center gap-1.5" title="Warehouses">
                          <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                          {row.warehouses}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {new Date(row.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-8 py-6">
                      <Badge variant={getStatusVariant(row.status)}>
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <TenantActionMenu tenantId={row.id} tenantName={row.name} status={row.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="p-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Showing <span className="text-ink">{start + 1}</span> - <span className="text-ink">{Math.min(start + PAGE_SIZE, total)}</span> of <span className="text-ink">{total}</span> tenants
            </span>
            <div className="flex gap-2">
              <Button
                onClick={() => router.push(`/admin/tenants?page=${Math.max(1, page - 1)}`)}
                disabled={page === 1}
                variant="outline"
                size="sm"
                className="font-bold tracking-widest text-[10px]"
              >
                PREVIOUS
              </Button>
              <Button
                onClick={() => router.push(`/admin/tenants?page=${Math.min(totalPages, page + 1)}`)}
                disabled={page === totalPages}
                variant="outline"
                size="sm"
                className="font-bold tracking-widest text-[10px]"
              >
                NEXT
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
