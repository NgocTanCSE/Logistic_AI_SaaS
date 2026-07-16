'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { Package, Barcode, Printer, CheckCircle, AlertCircle } from 'lucide-react';

export default function PackPage() {
  const { user } = useAuth();
  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    setScanning(true);
    setResult(null);

    try {
      const res = await api.post('/inventory/ops/pack-log', {
        barcode: barcode.trim(),
        deviceId: 'pack-station-web',
      });

      if (res.data) {
        setResult({ ok: true, message: `Packed: ${barcode}` });
        setRecentLogs(prev => [{ barcode, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 10));
        setBarcode('');
      }
    } catch (err: any) {
      setResult({
        ok: false,
        message: err.response?.data?.message || err.message || 'Scan failed',
      });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Packing Station</h1>
        <p className="text-zinc-400 text-sm mt-1">Scan barcode to log packed items</p>
      </div>

      <form onSubmit={handleScan} className="space-y-4">
        <div className="relative">
          <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Scan or enter barcode..."
            className="w-full pl-12 pr-4 py-4 bg-black/60 border border-white/10 rounded-xl text-white text-lg placeholder-zinc-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
            autoFocus
            disabled={scanning}
          />
        </div>

        <button
          type="submit"
          disabled={!barcode.trim() || scanning}
          className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {scanning ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <CheckCircle className="w-5 h-5" />
          )}
          {scanning ? 'Processing...' : 'Log Pack'}
        </button>
      </form>

      {result && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          result.ok ? 'bg-moss/10 text-moss border border-moss/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
        }`}>
          {result.ok ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm font-medium">{result.message}</span>
        </div>
      )}

      {recentLogs.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Recent Scans</h3>
          <div className="space-y-2">
            {recentLogs.map((log, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 bg-black/40 border border-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-primary" />
                  <span className="text-sm text-white font-mono">{log.barcode}</span>
                </div>
                <span className="text-xs text-zinc-500">{log.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
