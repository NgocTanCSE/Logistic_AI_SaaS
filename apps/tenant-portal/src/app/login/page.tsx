'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { decodeJwt } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

const SLUG_ROLE_MAP: Record<string, string> = {
  'demo-tenant': 'TENANT_ADMIN',
  'warehouse-tenant': 'WAREHOUSE_MANAGER',
  'logistics-tenant': 'LOGISTICS_MANAGER',
  'customer-tenant': 'CUSTOMER_CLIENT',
  'pack-station': 'WAREHOUSE_STAFF',
  'smartlogi': 'DRIVER',
};

export default function LoginPage() {
  const router = useRouter();
  const { setAuthToken } = useAuth();
  
  const [tenantSlug, setTenantSlug] = useState('demo-tenant');
  const [email, setEmail] = useState('tenant.admin@smartlogi.vn');
  const [password, setPassword] = useState('Tenant@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectByRole = (role: string) => {
    switch (role) {
      case 'TENANT_ADMIN':
        router.replace('/dashboard');
        break;
      case 'WAREHOUSE_MANAGER':
        router.replace('/wms/tasks');
        break;
      case 'LOGISTICS_MANAGER':
        router.replace('/logistics/dispatch');
        break;
      case 'WAREHOUSE_STAFF':
        router.replace('/wms/tasks');
        break;
      case 'DRIVER':
        router.replace('/drivers/my-trips');
        break;
      case 'CUSTOMER_CLIENT':
        router.replace('/orders');
        break;
      case 'TENANT_USER':
        router.replace('/dashboard');
        break;
      default:
        router.replace('/inventory');
        break;
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    
    if (!tenantSlug) {
      setError('Please enter your workspace slug.');
      return;
    }

    setLoading(true);
    try {
      const role = SLUG_ROLE_MAP[tenantSlug] || 'TENANT_USER';
      const response = await api.post(
        '/tenant/auth/login',
        { email, password },
        { headers: { 'x-tenant-slug': tenantSlug } }
      );

if (!response.data?.access_token && !response.data?.accessToken) {
          throw new Error(response.data?.message || 'Authentication failed.');
        }

        setAuthToken(response.data.access_token || response.data.accessToken);
      localStorage.setItem('smartlogi_tenant_slug', tenantSlug);
      const payload = decodeJwt(response.data.access_token || response.data.accessToken);
      const userRole = payload?.role || role;
      redirectByRole(userRole);

    } catch (err: any) {
      setError(err?.message || err?.response?.data?.message || 'Invalid credentials or tenant slug.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 bg-hero-glow pointer-events-none"></div>
      
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-teal-300/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-[1000px] grid grid-cols-1 md:grid-cols-2 gap-8 items-center z-10">
        
        <div className="hidden md:flex flex-col justify-center pr-8 animate-fade-in">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
              <div className="w-6 h-6 border-2 border-white rounded-md rotate-45 transform transition-transform group-hover:rotate-90"></div>
            </div>
            <span className="text-3xl font-extrabold text-ink tracking-tight">SmartLogi</span>
          </div>
          <h1 className="text-4xl font-bold text-ink leading-tight mb-4">
            Unified Workspace for <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-600">
              Supply Chain Operations
            </span>
          </h1>
          <p className="text-inkSoft text-lg font-medium leading-relaxed">
            Securely access your warehouse management, fleet dispatch, and AI-driven routing tools in one place.
          </p>
          
          <div className="mt-12 flex gap-6">
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-ink">99.9%</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Uptime SLA</span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-ink">Zero</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Hallucinations</span>
            </div>
          </div>
        </div>

        <Card className="p-8 md:p-10 animate-slide-up bg-white/70 backdrop-blur-2xl border-white/40 shadow-2xl">
          <div className="mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary mb-2">Workspace Access</p>
            <h2 className="text-2xl font-bold text-ink">Sign in to your Tenant</h2>
            <p className="text-sm text-inkSoft mt-1.5 font-medium">Enter your workspace slug to continue to the portal.</p>
          </div>

          <div className="mb-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-2">Quick Login Demo</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => { setTenantSlug('demo-tenant'); setEmail('tenant.admin@smartlogi.vn'); }} className="text-[10px] py-1 h-auto">Admin</Button>
              <Button variant="outline" size="sm" onClick={() => { setTenantSlug('warehouse-tenant'); setEmail('manager@warehouse.vn'); }} className="text-[10px] py-1 h-auto">WH Mgr</Button>
              <Button variant="outline" size="sm" onClick={() => { setTenantSlug('pack-station'); setEmail('staff@warehouse.vn'); }} className="text-[10px] py-1 h-auto">WH Staff</Button>
              <Button variant="outline" size="sm" onClick={() => { setTenantSlug('logistics-tenant'); setEmail('dispatch@logistics.vn'); }} className="text-[10px] py-1 h-auto">Dispatch</Button>
              <Button variant="outline" size="sm" onClick={() => { setTenantSlug('smartlogi'); setEmail('driver@smartlogi.vn'); }} className="text-[10px] py-1 h-auto">Driver</Button>
              <Button variant="outline" size="sm" onClick={() => { setTenantSlug('customer-tenant'); setEmail('client@customer.vn'); }} className="text-[10px] py-1 h-auto">Customer</Button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Workspace Slug"
              type="text"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              placeholder="e.g. acme-corp"
              required
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>}
            />
            
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@company.com"
              required
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>}
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>}
            />

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-700 font-medium animate-fade-in flex items-start gap-2">
                <svg className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2 font-bold tracking-wide"
              isLoading={loading}
            >
              Sign In to Workspace
            </Button>
          </form>
          
          <div className="mt-8 text-center border-t border-slate-200/60 pt-6">
            <p className="text-xs text-slate-500 font-medium">
              Protected by SmartLogi IAM Service
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}