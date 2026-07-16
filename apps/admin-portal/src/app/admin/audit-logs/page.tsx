'use client';

import { useState, useEffect } from 'react';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { SearchBar } from '@/components/ui/SearchBar';
import api from '@/lib/api';

const PAGE_SIZE = 15;

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const fetchLogs = async (pageNum: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/audit-logs', {
        params: { page: pageNum, limit: PAGE_SIZE }
      });
      if (res.data) {
        setLogs(res.data.data || []);
        setTotal(res.data.meta?.total || 0);
      }
    } catch (err) {
      console.error('API Error:', err);
      setError('Failed to load audit logs.');
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;

  const getActionStyle = (action: string) => {
    switch(action) {
      case 'CREATE': return 'bg-moss/10 text-moss border-moss/30';
      case 'UPDATE': return 'bg-cobalt/10 text-cobalt border-cobalt/30';
      case 'DELETE': return 'bg-ember/10 text-ember border-ember/30';
      case 'SUSPEND': return 'bg-ember/20 text-ember font-bold border-ember/40 animate-pulse';
      case 'ALERT': return 'bg-accent/10 text-accent border-accent/30';
      default: return 'bg-surfaceMuted text-inkSoft border-border/50';
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <ErrorBanner message={error} onRetry={() => fetchLogs(page)} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink tracking-tight">Security & Audit Logs</h2>
          <p className="text-sm text-inkSoft mt-1">Immutable ledger of platform actions, configurations, and security events.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="neon-button text-sm px-4 py-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SearchBar placeholder="Search IP or Actor..." />
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <span className="text-sm text-inkSoft font-medium mr-2">Action:</span>
          {['All', 'CREATE', 'UPDATE', 'DELETE', 'SUSPEND'].map((filter) => (
            <button 
              key={filter} 
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === 'All' 
                  ? 'bg-primary/20 text-primary border border-primary/30' 
                  : 'bg-surfaceMuted text-inkSoft hover:text-ink'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface/50 text-xs uppercase tracking-wider text-inkSoft/80 border-b border-border/50">
              <tr>
                <th className="px-6 py-4 font-semibold">Timestamp</th>
                <th className="px-6 py-4 font-semibold">Actor & IP</th>
                <th className="px-6 py-4 font-semibold">Action</th>
                <th className="px-6 py-4 font-semibold">Resource</th>
                <th className="px-6 py-4 font-semibold">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-inkSoft">Loading logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-inkSoft">No logs found.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface/30 transition-colors font-mono">
                    <td className="px-6 py-4">
                      <div className="text-ink">{log.timestamp.split(' ')[0]}</div>
                      <div className="text-xs text-inkSoft mt-0.5">{log.timestamp.split(' ')[1]}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-ink">{log.actor}</div>
                      <div className="text-xs text-inkSoft mt-0.5 flex items-center gap-1">
                        <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        {log.ip}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest border ${getActionStyle(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-inkSoft">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-inkSoft/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        {log.resource}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-ink truncate max-w-[200px]" title={log.target}>{log.target}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="p-4 border-t border-border/50 flex items-center justify-between text-sm">
            <span className="text-inkSoft">
              Showing <span className="font-medium text-ink">{start + 1}</span> to <span className="font-medium text-ink">{Math.min(start + PAGE_SIZE, total)}</span> of <span className="font-medium text-ink">{total}</span> logs
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`px-4 py-2 rounded-xl border border-border/50 font-medium transition-colors ${
                  page === 1
                    ? "opacity-50 cursor-not-allowed bg-surface/20 text-inkSoft"
                    : "bg-surface/50 text-ink hover:bg-surfaceMuted hover:border-primary/50"
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={`px-4 py-2 rounded-xl border border-border/50 font-medium transition-colors ${
                  page === totalPages
                    ? "opacity-50 cursor-not-allowed bg-surface/20 text-inkSoft"
                    : "bg-surface/50 text-ink hover:bg-surfaceMuted hover:border-primary/50"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
