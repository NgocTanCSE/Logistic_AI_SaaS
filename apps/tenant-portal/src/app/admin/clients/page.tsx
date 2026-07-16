'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { RoleGuard } from '@/components/auth/RoleGuard';

type ClientUser = {
  id: string;
  email: string;
  fullName: string;
  status: string;
};

type Client = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  users?: ClientUser[];
};

export default function ClientAccountsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [creating, setCreating] = useState(false);

  const [createName, setCreateName] = useState('');
  const [userForm, setUserForm] = useState({ email: '', fullName: '' });

  useEffect(() => {
    fetchClients();
  }, [page]);

  const fetchClients = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/clients', { params: { page, limit } });
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.items || []);
      setClients(data);
      setTotal(res.data?.meta?.total || 0);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
      setError('Failed to load clients. Client service may be unavailable.');
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await api.post('/clients', { name: createName });
      setCreateName('');
      setIsCreateOpen(false);
      fetchClients();
    } catch (err) {
      console.error('Failed to create client:', err);
      setError('Failed to create client. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    setCreating(true);
    try {
      await api.post(`/clients/${selectedClient.id}/users`, {
        clientId: selectedClient.id,
        email: userForm.email,
        fullName: userForm.fullName,
      });
      setUserForm({ email: '', fullName: '' });
      setIsUserOpen(false);
      setSelectedClient(null);
      fetchClients();
    } catch (err) {
      console.error('Failed to add user:', err);
      setError('Failed to add user. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <RoleGuard allowedRoles={['TENANT_ADMIN']}>
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-bold text-ink tracking-tight">Client Accounts</h1>
          <p className="text-sm text-inkSoft mt-2 font-medium">
            Manage B2B client organizations and their users.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
          Create Client
        </Button>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchClients} />}

      <Card className="p-6 mb-8">
        <div className="relative w-full sm:w-72">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/50 border border-slate-200 text-ink text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </Card>

      <div className="space-y-4">
        {loading ? (
          <Card className="p-12 text-center">
            <p className="text-slate-400 text-sm">Loading clients...</p>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="font-semibold text-ink">No clients yet</p>
            <p className="text-sm text-slate-500 mt-1">
              {search ? 'No clients match your search.' : 'Create your first B2B client to get started.'}
            </p>
          </Card>
        ) : (
          filtered.map((client) => (
            <Card key={client.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">
                      {client.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-ink text-lg">{client.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {client.users?.length || 0} user{(client.users?.length || 0) !== 1 ? 's' : ''}
                      {' · '}
                      Created {new Date(client.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={client.status === 'ACTIVE' ? 'success' : 'warning'}>
                    {client.status}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedClient(client);
                      setUserForm({ email: '', fullName: '' });
                      setIsUserOpen(true);
                    }}
                  >
                    Add User
                  </Button>
                </div>
              </div>
              {client.users && client.users.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Users</p>
                  <div className="space-y-2">
                    {client.users.map((u) => (
                      <div key={u.id} className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-50">
                        <div>
                          <p className="text-sm font-medium text-ink">{u.fullName}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                        <Badge variant={u.status === 'ACTIVE' ? 'success' : 'warning'}>
                          {u.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {!loading && total > limit && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages} ({total} clients)
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

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 border-t-4 border-t-primary">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-ink">Create Client</h2>
              <button
                onClick={() => setIsCreateOpen(false)}
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
                  Client Name
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full bg-white/50 border border-slate-200 text-ink text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="e.g. ACME Corporation"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={creating || !createName}>
                  {creating ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isUserOpen && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 border-t-4 border-t-primary">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-ink">Add User</h2>
              <button
                onClick={() => { setIsUserOpen(false); setSelectedClient(null); }}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              Add a user to <span className="font-semibold text-ink">{selectedClient.name}</span>
            </p>
            <form onSubmit={handleAddUser} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={userForm.fullName}
                  onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                  className="w-full bg-white/50 border border-slate-200 text-ink text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="e.g. John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                  Email
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full bg-white/50 border border-slate-200 text-ink text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="e.g. john@acme.com"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setIsUserOpen(false); setSelectedClient(null); }}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={creating || !userForm.fullName || !userForm.email}>
                  {creating ? 'Adding...' : 'Add User'}
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
