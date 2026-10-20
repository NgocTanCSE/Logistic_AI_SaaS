"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleLoginButton } from '@/components/ui/GoogleLoginButton';
import api from '@/lib/api';
import { setSession } from '@/lib/auth';

const ROLE_REDIRECT: Record<string, string> = {
  TENANT_ADMIN: '/dashboard',
  TENANT_USER: '/dashboard',
  WAREHOUSE_MANAGER: '/dashboard',
  WAREHOUSE_STAFF: '/dashboard',
  LOGISTICS_MANAGER: '/logistics/dispatch',
  DRIVER: '/drivers/my-trips',
};

export default function TenantLoginPage() {
  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenantSlug.trim()) {
      setError('Please enter your tenant ID.');
      return;
    }
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      localStorage.setItem('smartlogi_tenant_slug', tenantSlug.trim());
      const res = await api.post(
        '/tenant/auth/login',
        { email: email.trim(), password },
        {
          headers: {
            'x-tenant-slug': tenantSlug.trim(),
            'x-portal': 'tenant',
          },
        },
      );

      if (!res.data?.accessToken) {
        setError(res.data?.message || 'Login failed.');
        return;
      }

      setSession(res.data.accessToken);
      const role = res.data.role || 'TENANT_USER';
      router.replace(ROLE_REDIRECT[role] || '/dashboard');
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Unable to connect to the login service. Please try again.',
      );
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
          <p className="mt-2 text-sm text-slate-600">Sign in to your workspace</p>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="tenantSlug" className="block text-sm font-medium text-slate-700 mb-1">
              Tenant ID
            </label>
            <input
              type="text"
              id="tenantSlug"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              placeholder="e.g. demo-logistics-vn"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="space-y-3">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs text-slate-400">
              <span className="bg-slate-50 px-2">Or sign in with Google</span>
            </div>
          </div>

          <div className={tenantSlug.trim() ? '' : 'pointer-events-none opacity-50'}>
            <GoogleLoginButton tenantSlug={tenantSlug.trim()} />
          </div>
          {!tenantSlug.trim() && (
            <p className="text-center text-xs text-slate-400">
              Enter your tenant ID first to enable Google sign-in.
            </p>
          )}
        </div>

        <p className="text-center text-xs text-slate-500">
          By signing in, you agree to the SmartLogi Terms of Service.
        </p>
      </div>
    </div>
  );
}
