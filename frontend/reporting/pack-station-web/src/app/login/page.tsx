"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { setToken, setUser } from '@/lib/auth';
import { GoogleLoginButton } from '@/components/ui/GoogleLoginButton';

export default function PackStationLogin() {
  const [slug, setSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) {
      setError('Please enter your workspace slug.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/tenant/auth/login', { email, password }, {
        headers: { 'x-tenant-slug': slug, 'x-portal': 'pack-station' },
      });
      if (res.data?.accessToken) {
        setToken(res.data.accessToken);
        setUser({ slug, email });
        router.push(ROLE_REDIRECT_MAP[res.data?.role || 'WAREHOUSE_STAFF'] || '/dashboard');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const ROLE_REDIRECT_MAP: Record<string, string> = {
    'TENANT_ADMIN': '/dashboard',
    'WAREHOUSE_MANAGER': '/dashboard',
    'WAREHOUSE_STAFF': '/dashboard',
    'LOGISTICS_MANAGER': '/logistics/dispatch',
    'DRIVER': '/drivers/my-trips',
    'CUSTOMER_CLIENT': '/orders',
    'TENANT_USER': '/dashboard',
  };

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-8v4h8v-4zm-4-8h4m-4 4h4m6-4v1m-4-1v1m-4-1v1m-4-1v1m2-4h12a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Pack Station</h1>
          <p className="mt-2 text-sm text-slate-600">Warehouse Staff Access</p>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Workspace Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="e.g. demo-tenant"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Staff ID / Email</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="e.g. staff_01"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 transition-colors mt-2"
          >
            {loading ? 'Authenticating...' : 'Start Shift'}
          </button>
        </form>

        <div className="space-y-3">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs text-slate-400">
              <span className="bg-white px-2">Or continue with Google</span>
            </div>
          </div>

          <div className={slug.trim() ? '' : 'pointer-events-none opacity-50'}>
            <GoogleLoginButton tenantSlug={slug.trim()} onError={setError} />
          </div>
          {!slug.trim() && (
            <p className="text-center text-xs text-slate-400">
              Enter your workspace slug first to enable Google sign-in.
            </p>
          )}
        </div>

        <div className="text-center text-sm text-slate-500">
          <Link href="/forgot-password" className="text-slate-600 hover:text-primary transition-colors">
            Forgot Password?
          </Link>
        </div>
      </div>
    </div>
  );
}
