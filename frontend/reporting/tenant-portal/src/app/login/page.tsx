"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleLoginButton } from '@/components/ui/GoogleLoginButton';
import api from '@/lib/api';

export default function TenantLoginPage() {
  const [tenantSlug, setTenantSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantSlug.trim()) {
      setError('Please enter your tenant ID');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/tenant/auth/tenants');
      const tenants = res.data?.data || [];
      const found = tenants.find((t: any) => t.slug === tenantSlug || t.slug === tenantSlug.toLowerCase());
      if (found) {
        localStorage.setItem('smartlogi_tenant_slug', tenantSlug);
        router.replace(`/login?slug=${tenantSlug}`);
      } else {
        setError('Tenant not found. Please check your tenant ID.');
      }
    } catch (err: any) {
      localStorage.setItem('smartlogi_tenant_slug', tenantSlug);
      router.replace(`/login?slug=${tenantSlug}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.101v7.136a2 2 0 01-.492 1.337L10 21M4 12l6.5-6.5L18 10l-4 4-7 7-3.5-3.5L4 12z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">SmartLogi</h1>
          <p className="mt-2 text-sm text-slate-600">Enter your tenant ID to sign in</p>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleTenantSubmit} className="space-y-4">
          <div>
            <label htmlFor="tenantSlug" className="block text-sm font-medium text-slate-700 mb-1">
              Tenant ID
            </label>
            <input
              type="text"
              id="tenantSlug"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              placeholder="e.g. demo-tenant"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Verifying...' : 'Continue'}
          </button>
        </form>

        {tenantSlug && (
          <div className="space-y-4 pt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs text-slate-400">
                <span className="bg-slate-50 px-2">Or sign in with Google</span>
              </div>
            </div>
            <GoogleLoginButton tenantSlug={tenantSlug} />
          </div>
        )}

        <p className="text-center text-xs text-slate-500">
          By signing in, you agree to the SmartLogi Terms of Service.
        </p>
      </div>
    </div>
  );
}
