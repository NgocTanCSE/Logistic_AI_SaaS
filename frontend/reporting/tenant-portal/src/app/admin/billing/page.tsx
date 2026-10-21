'use client';
import { TableState } from 'ui-components';
import { useState, useEffect } from 'react';
import {formatDate} from '@/lib/date-utils';
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
    <div className="p-8 max-w-7xl mx-auto ">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-ink tracking-tight">Billing</h1>
        <p className="text-sm text-inkSoft mt-2 font-medium">
          Manage your subscription plan and view invoices.
        </p>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchBilling} />}

      <TableState
          loading={loading}
          colSpan={6}
        >
          
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-ink">#{inv.id.slice(0, 8)}</td>
                      <td className="px-6 py-4 text-slate-600">{inv.planName}</td>
                      <td className="px-6 py-4 font-semibold text-ink">${inv.amount}</td>
                      <td className="px-6 py-4 text-slate-500">{formatDate(inv.dueDate)}</td>
                      <td className="px-6 py-4">
                        <Badge variant={inv.status === 'PAID' ? 'success' : inv.status === 'PENDING' ? 'warning' : 'error'}>
                          {inv.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                
        </TableState>
    </div>
    </RoleGuard>
  );
}
