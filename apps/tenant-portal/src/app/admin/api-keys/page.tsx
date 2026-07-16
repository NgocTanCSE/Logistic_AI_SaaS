'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { RoleGuard } from '@/components/auth/RoleGuard';

type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
  isActive: boolean;
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');

  useEffect(() => {
    fetchKeys();
  }, [page]);

  const fetchKeys = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api-keys', { params: { page, limit } });
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.items || []);
      setKeys(data);
      setTotal(res.data?.meta?.total || 0);
    } catch (err) {
      console.error('Failed to fetch API keys:', err);
      setError('Failed to load API keys. API key service may be unavailable.');
      setKeys([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const res = await api.post('/api-keys', { name: newKeyName });
      setGeneratedKey(res.data?.key || '');
      setNewKeyName('');
      fetchKeys();
    } catch (err) {
      setError('Failed to create API key. The API Keys module may not be available yet.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api-keys/${id}`);
      fetchKeys();
    } catch (err) {
      console.error('Failed to delete API key:', err);
      setError('Failed to delete API key. Please try again.');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
  };

  return (
    <RoleGuard allowedRoles={['TENANT_ADMIN']}>
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-bold text-ink tracking-tight">API Keys</h1>
          <p className="text-sm text-inkSoft mt-2 font-medium">
            Manage API keys for third-party integrations.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
          Create API Key
        </Button>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchKeys} />}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <p className="text-sm text-slate-400">Loading API keys...</p>
          </div>
        ) : keys.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <p className="font-semibold text-ink">No API keys yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Create an API key to enable programmatic access to the SmartLogi platform.
            </p>
            <Button variant="primary" className="mt-6" onClick={() => setIsCreateOpen(true)}>
              Create Your First Key
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-bold">Name</th>
                <th className="px-6 py-4 font-bold">Key</th>
                <th className="px-6 py-4 font-bold">Created</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {keys.map((key) => (
                <tr key={key.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 font-semibold text-ink">{key.name}</td>
                  <td className="px-6 py-4">
                    <code className="text-xs font-mono bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                      {key.prefix}...{key.id.slice(-4)}
                    </code>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {new Date(key.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={key.isActive ? 'success' : 'error'}>
                      {key.isActive ? 'Active' : 'Revoked'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopy(key.id)}
                        className="p-2 text-slate-400 hover:text-primary transition-colors"
                        title="Copy key"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(key.id)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete key"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {!loading && total > limit && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages} ({total} keys)
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

      {isCreateOpen && !generatedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 border-t-4 border-t-primary">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-ink">Create API Key</h2>
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
                  Key Name
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full bg-white/50 border border-slate-200 text-ink text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="e.g. Production API Key"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={creating || !newKeyName}>
                  {creating ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {generatedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 border-t-4 border-t-emerald-500">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-ink text-center mb-2">Key Created</h2>
            <p className="text-sm text-slate-500 text-center mb-6">
              Copy this key now. You won&apos;t be able to see it again.
            </p>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-6">
              <code className="text-xs font-mono text-ink break-all select-all">{generatedKey}</code>
            </div>
            <div className="flex gap-3">
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => { handleCopy(generatedKey); setGeneratedKey(''); setIsCreateOpen(false); }}
              >
                Copy & Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </RoleGuard>
  );
}
