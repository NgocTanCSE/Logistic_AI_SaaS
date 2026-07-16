'use client';

import { useState, useEffect } from 'react';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { SearchBar } from '@/components/ui/SearchBar';
import api from '@/lib/api';

const PAGE_SIZE = 15;

export default function BillingPage() {
  const [page, setPage] = useState(1);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mrr, setMrr] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBilling(page);
  }, [page]);

  const fetchBilling = async (pageNum: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/billing', {
        params: { page: pageNum, limit: PAGE_SIZE }
      });
      if (res.data) {
        setInvoices(res.data.data || []);
        setTotal(res.data.meta?.total || 0);
        setMrr(res.data.meta?.mrr || 0);
      }
    } catch (err) {
      console.error('API Error:', err);
      setError('Failed to load billing data.');
      setInvoices([]);
      setTotal(0);
      setMrr(0);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'PAID': return 'bg-moss/10 text-moss border-moss/30';
      case 'DUE': return 'bg-accent/10 text-accent border-accent/30';
      case 'OVERDUE': return 'bg-ember/20 text-ember font-bold border-ember/40 animate-pulse';
      default: return 'bg-surfaceMuted text-inkSoft border-border/50';
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <ErrorBanner message={error} onRetry={() => fetchBilling(page)} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink tracking-tight">Billing & Invoices</h2>
          <p className="text-sm text-inkSoft mt-1">Manage SaaS subscriptions, track MRR, and monitor overdue payments.</p>
        </div>
        <div className="bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 px-6 py-3 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.15)] flex items-center gap-4">
          <div className="text-primary text-xs font-bold uppercase tracking-widest">Global MRR</div>
          <div className="text-2xl font-black text-ink">${mrr.toLocaleString()}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SearchBar placeholder="Search Invoice ID or Tenant..." />
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <span className="text-sm text-inkSoft font-medium mr-2">Status:</span>
          {['All', 'PAID', 'DUE', 'OVERDUE'].map((filter) => (
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
                <th className="px-6 py-4 font-semibold">Invoice ID</th>
                <th className="px-6 py-4 font-semibold">Tenant</th>
                <th className="px-6 py-4 font-semibold">Plan</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Issued At</th>
                <th className="px-6 py-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-inkSoft">Loading invoices...</td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-inkSoft">No invoices found.</td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-surface/30 transition-colors font-mono group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-ink">{invoice.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-ink font-sans">{invoice.tenant}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase border font-sans ${
                        invoice.plan === 'Enterprise' 
                          ? 'bg-accent/10 text-accent border-accent/30' 
                          : invoice.plan === 'Pro'
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-surfaceMuted text-inkSoft border-border/50'
                      }`}>
                        {invoice.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-ink text-lg">{invoice.amount}</div>
                    </td>
                    <td className="px-6 py-4 text-inkSoft">
                      {invoice.issuedAt}
                    </td>
                    <td className="px-6 py-4 text-right font-sans">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border ${getStatusStyle(invoice.status)}`}>
                        {invoice.status === 'OVERDUE' && (
                          <svg className="w-3 h-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        )}
                        {invoice.status}
                      </span>
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
              Showing <span className="font-medium text-ink">{start + 1}</span> to <span className="font-medium text-ink">{Math.min(start + PAGE_SIZE, total)}</span> of <span className="font-medium text-ink">{total}</span> invoices
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
