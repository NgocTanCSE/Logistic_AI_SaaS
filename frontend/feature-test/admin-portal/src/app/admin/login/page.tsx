"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleLoginButton } from '@/components/ui/GoogleLoginButton';
import { useAuth } from '@/lib/auth-context';
import { DEMO_TOKEN, createDemoToken } from '@/lib/auth';
import { AdminRole, ROLE_LABELS } from '@/lib/rbac';
import api from '@/lib/api';

export default function AdminLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { login } = useAuth();
  const [selectedDemoRole, setSelectedDemoRole] = useState<AdminRole>('SUPER_ADMIN');

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/admin/auth/login', { email, password });
      if (!res.data?.accessToken) {
        setError(res.data?.message || 'Invalid credentials.');
        return;
      }
      login(res.data.accessToken);
      router.push('/admin/dashboard');
    } catch (err: any) {
      // Offline fallback: if the API is unavailable, accept demo credentials.
      if (email === 'admin@smartlogi.com' && password === 'admin123') {
        login(DEMO_TOKEN);
        router.push('/admin/dashboard');
      } else {
        setError(err?.response?.data?.message || 'Unable to sign in. Use "Demo Login" if no backend is available.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/admin/auth/google', { credential });
      if (res.data.accessToken) {
        login(res.data.accessToken);
        router.push('/admin/dashboard');
      } else {
        setError(res.data?.message || 'This Google account is not allowed to access the Admin Portal.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Google authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-alt p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H6.75a2.25 2.25 0 01-2.25-2.25V6.75a2.25 2.25 0 012.25-2.25h10.5a2.25 2.25 0 012.25 2.25z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75h.008v.008H12v-.008zM12 9.75h.008v.008H12V9.75z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-ink">Admin Portal</h1>
          <p className="mt-2 text-sm text-ink-soft">Sign in to manage SmartLogi tenants and billing</p>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@smartlogi.vn"
              className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs text-ink-soft">
            <span className="bg-surface-alt px-2">Or continue with Google</span>
          </div>
        </div>

        <div className="space-y-4">
          <GoogleLoginButton
            onSuccess={handleGoogleSuccess}
            onError={handleError}
            loading={loading}
          />
        </div>

        <div className="pt-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-ink mb-1">Demo Role</label>
            <select
              value={selectedDemoRole}
              onChange={(e) => setSelectedDemoRole(e.target.value as AdminRole)}
              className="w-full rounded-xl border border-border bg-surface-alt px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {(Object.keys(ROLE_LABELS) as AdminRole[]).map((role) => (
                <option key={role} value={role}>{ROLE_LABELS[role]}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              login(createDemoToken(selectedDemoRole));
              router.push('/admin/dashboard');
            }}
            className="mt-2 w-full rounded-xl border border-border bg-surface-alt px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface transition-colors"
          >
            Demo Login as {ROLE_LABELS[selectedDemoRole]}
          </button>
        </div>

        <div className="text-center text-xs text-ink-soft">
          By signing in, you agree to the SmartLogi Terms of Service.
        </div>
      </div>
    </div>
  );
}
