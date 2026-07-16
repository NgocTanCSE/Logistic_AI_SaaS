'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { RoleGuard } from '@/components/auth/RoleGuard';

type Plan = {
  id: string;
  name: string;
  code: string;
  priceMonthly: number;
  maxUsers: number;
  maxWarehouses: number;
  maxVehicles: number;
  featuresJson: string;
  isActive: boolean;
};

type Invoice = {
  id: string;
  planName: string;
  amount: number;
  status: string;
  dueDate: string;
  paidAt?: string;
};

export default function BillingPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchBilling();
  }, [page]);

  const fetchBilling = async () => {
    setLoading(true);
    try {
      const [planRes, invoicesRes] = await Promise.allSettled([
        api.get('/tenant/billing/plan'),
        api.get('/tenant/billing/invoices', { params: { page, limit } }),
      ]);
      if (planRes.status === 'fulfilled') setPlan(planRes.value.data?.plan || null);
      if (invoicesRes.status === 'fulfilled') {
        const data = invoicesRes.value.data;
        setInvoices(Array.isArray(data) ? data : (data?.data || data?.items || []));
        setTotal(invoicesRes.value.data?.meta?.total || 0);
      }
    } catch (err) {
      setError('Billing service is not available yet.');
    } finally {
      setLoading(false);
    }
  };

  const features = plan?.featuresJson ? (() => {
    try { return JSON.parse(plan.featuresJson) as string[]; } catch { return []; }
  })() : [];
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <RoleGuard allowedRoles={['TENANT_ADMIN']}>
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-ink tracking-tight">Billing</h1>
        <p className="text-sm text-inkSoft mt-2 font-medium">
          Manage your subscription plan and view invoices.
        </p>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchBilling} />}

      {loading ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-slate-400">Loading billing info...</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
            <Card className="lg:col-span-2 p-8">
              {plan ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Current Plan
                      </p>
                      <h2 className="text-3xl font-bold text-ink">{plan.name}</h2>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-ink">${plan.priceMonthly}</p>
                      <p className="text-xs text-slate-500">per month</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-6 mb-6">
                    <div className="bg-slate-50 rounded-2xl p-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Users</p>
                      <p className="text-xl font-bold text-ink mt-1">{plan.maxUsers}</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Warehouses</p>
                      <p className="text-xl font-bold text-ink mt-1">{plan.maxWarehouses}</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vehicles</p>
                      <p className="text-xl font-bold text-ink mt-1">{plan.maxVehicles}</p>
                    </div>
                  </div>
                  {features.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                        Features
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {features.map((f, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 text-primary text-xs font-semibold rounded-lg">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <p className="font-semibold text-ink">No plan assigned</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Contact your system administrator to set up a subscription plan.
                  </p>
                </div>
              )}
            </Card>

            <Card className="p-8">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Quick Summary</p>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                  <span className="text-sm text-slate-500">Month-to-Date</span>
                  <span className="font-bold text-ink">{plan ? `$${plan.priceMonthly}` : '—'}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                  <span className="text-sm text-slate-500">Invoices</span>
                  <span className="font-bold text-ink">{invoices.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Outstanding</span>
                  <span className="font-bold text-ink">
                    {invoices.filter((i) => i.status === 'PENDING').length}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="font-bold text-ink">Invoice History</h3>
            </div>
            {invoices.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm text-slate-500">No invoices yet.</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 font-bold">Invoice</th>
                    <th className="px-6 py-4 font-bold">Plan</th>
                    <th className="px-6 py-4 font-bold">Amount</th>
                    <th className="px-6 py-4 font-bold">Due Date</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-ink">#{inv.id.slice(0, 8)}</td>
                      <td className="px-6 py-4 text-slate-600">{inv.planName}</td>
                      <td className="px-6 py-4 font-semibold text-ink">${inv.amount}</td>
                      <td className="px-6 py-4 text-slate-500">{new Date(inv.dueDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <Badge variant={inv.status === 'PAID' ? 'success' : inv.status === 'PENDING' ? 'warning' : 'error'}>
                          {inv.status}
                        </Badge>
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
                Page {page} of {totalPages} ({total} invoices)
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
        </>
      )}
    </div>
    </RoleGuard>
  );
}
