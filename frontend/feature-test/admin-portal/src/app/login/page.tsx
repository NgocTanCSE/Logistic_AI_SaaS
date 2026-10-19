"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleLoginButton } from '@/components/ui/GoogleLoginButton';
import { useAuth } from '@/lib/auth-context';
import { setToken } from '@/lib/auth';
import api from '@/lib/api';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { login } = useAuth();

  const handleGoogleSuccess = async (credential: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/admin/auth/google', { credential });
      if (res.data.accessToken) {
        login(res.data.accessToken);
        router.replace('/admin/dashboard');
      } else {
        setError(res.data?.message || 'Google authentication failed.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Google authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestLogin = () => {
    const testToken = 'test-smartlogi-admin-token';
    setToken(testToken);
    login(testToken);
    router.replace('/admin/dashboard');
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
          <h1 className="text-2xl font-bold text-ink">SmartLogi Admin Portal</h1>
          <p className="mt-2 text-sm text-inkSoft">Sign in to manage logistics operations and AI models</p>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <GoogleLoginButton
            onSuccess={handleGoogleSuccess}
            onError={setError}
            loading={loading}
          />
        </div>

        <div className="space-y-4">
          <button
            onClick={handleTestLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors hover:bg-slate-100 focus:bg-slate-100 disabled:opacity-50 disabled:pointer-events-none rounded-lg border border-slate-200 bg-white text-inkSoft"
          >
            Test Login (Skip Google)
          </button>
        </div>

        <div className="text-center text-xs text-inkSoft">
          By signing in, you agree to the SmartLogi Terms of Service.
        </div>
      </div>
    </div>
  );
}
