'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { ClipboardList, Package, Clock } from 'lucide-react';

export default function PackLogsPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchLogs();
  }, [token]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/inventory/ops/pack-log');
      const data = res.data;
      setLogs(Array.isArray(data) ? data : data?.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Pack Logs</h1>
          <p className="text-zinc-400 text-sm mt-1">History of all packing station scans</p>
        </div>
        <button
          onClick={fetchLogs}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchLogs} className="text-xs text-red-400 hover:text-red-300 underline ml-2">
            Try again
          </button>
        </div>
      )}

      {!error && logs.length === 0 && (
        <div className="text-center py-20">
          <ClipboardList className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-500 font-medium">No pack logs yet</p>
          <p className="text-zinc-600 text-sm mt-1">Scan items at the packing station to create logs</p>
        </div>
      )}

      {logs.length > 0 && (
        <div className="space-y-2">
          {logs.map((log: any, i: number) => (
            <div key={log.id || i} className="flex items-center justify-between px-5 py-4 bg-black/40 border border-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm text-white font-mono">{log.barcode}</p>
                  {log.deviceId && (
                    <p className="text-xs text-zinc-600">{log.deviceId}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Clock className="w-3 h-3" />
                {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'N/A'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
