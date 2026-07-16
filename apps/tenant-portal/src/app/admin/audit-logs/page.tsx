'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { RoleGuard } from '@/components/auth/RoleGuard';

type AuditLog = {
  id: string;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId: string;
  createdAt: string;
  ipAddress?: string;
  oldValues?: string;
  newValues?: string;
};

const ACTION_COLORS: Record<string, 'info' | 'success' | 'warning' | 'error' | 'neutral'> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'error',
  LOGIN: 'neutral',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [error, setError] = useState('');

  const PAGE_SIZE = 20;

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/tenant/audit-logs', {
        params: { page, limit: PAGE_SIZE, action: actionFilter || undefined },
      });
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.logs || []);
      setLogs(data);
      setTotal(res.data?.meta?.total || res.data?.total || data.length);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setError('Failed to load audit logs. Audit service may be unavailable.');
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <RoleGuard allowedRoles={['TENANT_ADMIN']}>
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-ink tracking-tight">Audit Logs</h1>
        <p className="text-sm text-inkSoft mt-2 font-medium">
          Track all activities and changes made within your organization.
        </p>
      </div>

      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filter:</span>
          {['', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN'].map((action) => (
            <button
              key={action}
              onClick={() => { setActionFilter(action); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all ${
                actionFilter === action
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {action || 'ALL'}
            </button>
          ))}
        </div>
      </Card>

      {error && <ErrorBanner message={error} onRetry={fetchLogs} />}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <p className="text-sm text-slate-400">Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="font-semibold text-ink">No audit logs found</p>
            <p className="text-sm text-slate-500 mt-1">
              {actionFilter ? 'No logs match the selected filter.' : 'Audit logging service is not available yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-bold">Action</th>
                  <th className="px-6 py-4 font-bold">Actor</th>
                  <th className="px-6 py-4 font-bold">Resource</th>
                  <th className="px-6 py-4 font-bold">Detail</th>
                  <th className="px-6 py-4 font-bold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <Badge variant={ACTION_COLORS[log.action] || 'neutral'}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-ink font-medium">{log.actorEmail}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-600">
                        {log.resourceType}
                        {log.resourceId && log.resourceId !== 'SUCCESS' && (
                          <span className="font-mono text-xs text-slate-400 ml-1">#{log.resourceId.slice(0, 8)}</span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs max-w-xs truncate">
                      {log.newValues || '—'}
                    </td>
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && total > 0 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
    </RoleGuard>
  );
}
