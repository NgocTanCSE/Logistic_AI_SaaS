"use client";

import React, { useEffect, useState } from 'react';
import { Search, RotateCcw, Eye, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending Approval', color: 'text-yellow-400 bg-yellow-400/10' },
  APPROVED: { label: 'Approved', color: 'text-blue-400 bg-blue-400/10' },
  PICKUP_SCHEDULED: { label: 'Pickup Scheduled', color: 'text-purple-400 bg-purple-400/10' },
  PICKED_UP: { label: 'Picked Up', color: 'text-orange-400 bg-orange-400/10' },
  INSPECTED: { label: 'Inspected', color: 'text-cyan-400 bg-cyan-400/10' },
  REFUNDED: { label: 'Refunded', color: 'text-green-400 bg-green-400/10' },
  REJECTED: { label: 'Rejected', color: 'text-red-400 bg-red-400/10' },
  CLOSED: { label: 'Closed', color: 'text-zinc-400 bg-zinc-400/10' },
};

export default function ClientReturnsPage() {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('smartlogi_customer_token');
      const res = await api.get('/client/returns', { headers: { Authorization: `Bearer ${token}` } });
      setReturns(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.error('Failed to fetch returns:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load returns');
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Returns & Refunds</h1>
          <p className="text-zinc-400 mt-1">Track your return requests and refunds</p>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input type="text" placeholder="Search by RMA code..." className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-primary/50" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left py-3 px-6 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">RMA Code</th>
                <th className="text-left py-3 px-6 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Order</th>
                <th className="text-left py-3 px-6 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Type</th>
                <th className="text-center py-3 px-6 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Status</th>
                <th className="text-right py-3 px-6 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-zinc-500">Loading...</td></tr>
              ) : error ? (
                <tr><td colSpan={5} className="text-center py-12">
                  <p className="text-red-400 mb-2">{error}</p>
                  <button onClick={fetchReturns} className="text-xs text-red-400 hover:text-red-300 underline">Try again</button>
                </td></tr>
              ) : returns.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12">
                  <RotateCcw className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-500">No return requests yet</p>
                </td></tr>
              ) : returns.map((r: any) => {
                const status = statusConfig[r.status] || { label: r.status, color: 'text-zinc-400 bg-zinc-400/10' };
                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(selected?.id === r.id ? null : r)}
                    className="hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <td className="py-4 px-6 font-mono text-xs text-white">{r.returnCode}</td>
                    <td className="py-4 px-6">
                      <span className="font-mono text-xs text-zinc-300">{r.order?.trackingCode || '-'}</span>
                    </td>
                    <td className="py-4 px-6 text-xs text-zinc-400">{r.returnType}</td>
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${status.color}`}>{status.label}</span>
                    </td>
                    <td className="py-4 px-6 text-right text-xs text-zinc-500">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setSelected(null)} className="text-zinc-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-bold text-white">{selected.returnCode}</h2>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${(statusConfig[selected.status] || { color: 'text-zinc-400 bg-zinc-400/10' }).color}`}>
                {(statusConfig[selected.status] || { label: selected.status }).label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Order</p>
                <p className="text-sm text-white font-mono">{selected.order?.trackingCode}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Type</p>
                <p className="text-sm text-white">{selected.returnType}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Reason</p>
                <p className="text-sm text-white">{selected.reasonNote || selected.reason?.name || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Items</p>
                <p className="text-sm text-white">{selected.items?.length || 0} item(s)</p>
              </div>
            </div>

            {selected.refunds && selected.refunds.length > 0 && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Refunds</p>
                {selected.refunds.map((ref: any) => (
                  <div key={ref.id} className="flex justify-between items-center py-2">
                    <span className="text-sm text-white">${Number(ref.amount).toFixed(2)}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ref.status === 'PROCESSED' ? 'text-green-400 bg-green-400/10' : 'text-yellow-400 bg-yellow-400/10'}`}>
                      {ref.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
