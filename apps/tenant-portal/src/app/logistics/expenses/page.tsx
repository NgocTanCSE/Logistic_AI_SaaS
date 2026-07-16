'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

type DriverExpense = {
  id: string;
  driverId: string;
  tripId: string | null;
  amount: number;
  category: string;
  note: string;
  status: string;
  createdAt: string;
  driver: {
    user: { fullName: string };
  };
};

export default function ExpenseApprovalPage() {
  const [expenses, setExpenses] = useState<DriverExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchExpenses();
  }, [page]);

  const fetchExpenses = async () => {
    try {
      const res = await api.get('/logistics/finance/expenses', { params: { page, limit } });
      setExpenses(res.data?.data || res.data || []);
      setTotal(res.data?.meta?.total || 0);
    } catch (err) {
      console.error("Failed to fetch expenses", err);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const getStatusVariant = (status: string) => {
    switch(status) {
      case 'PENDING': return 'warning';
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'error';
    }
  };

  const handleViewReceipt = (receiptUrl?: string) => {
    if (receiptUrl) {
      window.open(receiptUrl, '_blank');
    } else {
      setReceiptModalOpen(true);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-ink tracking-tight">Expense Approval</h1>
        <p className="text-sm text-inkSoft mt-2 font-medium">Verify driver-reported expenses and fuel receipts.</p>
      </div>

      <Card className="animate-slide-up">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-border">
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Driver & Date</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Category</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Amount</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold uppercase text-[11px]">Auditing Receipts...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-medium">No expenses found.</td></tr>
              ) : (
                expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-all">
                    <td className="px-8 py-6">
                      <div className="font-bold text-ink">{exp.driver?.user?.fullName}</div>
                      <div className="text-[10px] font-semibold text-slate-400 mt-1 uppercase">{new Date(exp.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-8 py-6">
                       <Badge variant="neutral">{exp.category}</Badge>
                       <div className="text-[10px] font-medium text-inkSoft mt-1 italic">"{exp.note}"</div>
                    </td>
                    <td className="px-8 py-6 font-bold text-ink">${Number(exp.amount).toLocaleString()}</td>
                    <td className="px-8 py-6"><Badge variant={getStatusVariant(exp.status)}>{exp.status}</Badge></td>
                    <td className="px-8 py-6 text-right">
                       <Button variant="ghost" size="sm" className="font-bold text-primary tracking-widest text-[10px]" onClick={() => handleViewReceipt((exp as any).receiptUrl)}>VIEW RECEIPT</Button>
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
            Page {page} of {totalPages} ({total} expenses)
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

      {/* Receipt Modal */}
      {receiptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-8 text-center">
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L28 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
            <h2 className="text-xl font-bold text-ink mb-2">No Receipt Found</h2>
            <p className="text-slate-500 text-sm mb-8">This expense does not have an attached receipt or invoice image.</p>
            <div className="flex justify-center">
              <Button variant="primary" onClick={() => setReceiptModalOpen(false)}>Okay</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
