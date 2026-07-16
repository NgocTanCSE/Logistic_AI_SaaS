'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ErrorBanner } from '@/components/ui/ErrorBanner';

export default function TenantDetailPage({ params }: { params: { id: string } }) {
  const { token } = useAuth();
  const router = useRouter();
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Modal State
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [suspending, setSuspending] = useState(false);
  const [suspendError, setSuspendError] = useState<string | null>(null);

  useEffect(() => {
    fetchTenantDetails();
  }, [params.id]);

  const fetchTenantDetails = async () => {
    if (!token) return;
    try {
      setError(null);
      const res = await api.get(`/admin/tenants/${params.id}`);
      setTenant(res.data.data || res.data);
    } catch (err: any) {
      console.error('Failed to fetch tenant details:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load tenant details');
      setTenant(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!tenant) return;
    if (confirmText !== tenant.name) {
      setSuspendError("Confirmation text does not match tenant name.");
      return;
    }

    setSuspending(true);
    setSuspendError(null);
    try {
      const res = await api.patch(`/admin/tenants/${tenant.id}`, { status: 'SUSPENDED' });
      if (res.status >= 200 && res.status < 300) {
        setIsSuspendModalOpen(false);
        setConfirmText('');
        setTenant({ ...tenant, status: 'SUSPENDED' });
      } else {
        setSuspendError('Failed to suspend tenant via API');
      }
    } catch (err: any) {
      console.error(err);
      setSuspendError(err.response?.data?.message || err.message || 'Failed to suspend tenant');
    } finally {
      setSuspending(false);
    }
  };

  if (loading) {
    return <div className="p-8 max-w-5xl mx-auto text-center text-slate-400 py-24">Loading tenant profile...</div>;
  }

  if (error && !tenant) {
    return (
      <div className="p-8 max-w-5xl mx-auto py-24">
        <ErrorBanner message={error} onRetry={fetchTenantDetails} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Breadcrumb & Header */}
      <div className="mb-8">
        <button onClick={() => router.push('/admin/tenants')} className="text-sm text-slate-500 hover:text-primary mb-4 flex items-center gap-1 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Tenants
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 flex items-center justify-center font-black text-2xl shadow-sm border border-white">
              {tenant.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                {tenant.name}
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border shadow-sm align-middle ${tenant.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                  {tenant.status}
                </span>
              </h1>
              <p className="text-sm text-slate-500 font-mono mt-1">{tenant.id} • {tenant.domain}</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm">
              Impersonate
            </button>
            {tenant.status === 'ACTIVE' ? (
              <button 
                onClick={() => { setConfirmText(''); setIsSuspendModalOpen(true); }}
                className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              >
                Suspend Account
              </button>
            ) : (
              <button className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100 px-4 py-2.5 rounded-xl text-sm font-medium transition-all">
                Reactivate Account
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden">
        
        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6">
          <button 
            onClick={() => setActiveTab('overview')} 
            className={`px-4 py-4 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('users')} 
            className={`px-4 py-4 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Users ({tenant.usersCount})
          </button>
          <button 
            onClick={() => setActiveTab('billing')} 
            className={`px-4 py-4 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'billing' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Billing History
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 md:p-8">
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Current Plan</p>
                  <p className="text-lg font-bold text-slate-900">{tenant.plan}</p>
                </div>
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Monthly Orders</p>
                  <p className="text-lg font-bold text-slate-900">{tenant.ordersMonthly.toLocaleString()}</p>
                </div>
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Member Since</p>
                  <p className="text-lg font-bold text-slate-900">{new Date(tenant.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-widest">Platform Usage</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700">Storage Capacity (CBM)</span>
                      <span className="text-slate-500">85% (8,500 / 10,000)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700">API Request Limits</span>
                      <span className="text-slate-500">42% (420k / 1M)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '42%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="animate-in fade-in">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900">Tenant Users</h3>
                <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
                  Invite User
                </button>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Email</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Role</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                        No users found for this tenant.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="animate-in fade-in">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900">Invoice History</h3>
                <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
                  Create Invoice
                </button>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Invoice #</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Amount</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                        No invoices found for this tenant.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Suspend Modal */}
      {isSuspendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-red-100 bg-red-50/80">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h2 className="text-xl font-bold text-red-700">Suspend Tenant Account?</h2>
              <p className="text-sm text-red-600/80 mt-1">This will immediately block all users of this tenant from logging in or using the APIs.</p>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-slate-700 mb-4">
                Please type <strong className="text-slate-900 select-all">{tenant.name}</strong> to confirm suspension.
              </p>
              {suspendError && (
                <p className="text-sm text-red-600 mb-4">{suspendError}</p>
              )}
              <input 
                type="text" 
                value={confirmText} 
                onChange={e => { setConfirmText(e.target.value); setSuspendError(null); }} 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm" 
                placeholder={tenant.name} 
              />
              
              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => setIsSuspendModalOpen(false)} 
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  disabled={suspending || confirmText !== tenant.name}
                  onClick={handleSuspend}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {suspending ? 'Suspending...' : 'Yes, Suspend Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
