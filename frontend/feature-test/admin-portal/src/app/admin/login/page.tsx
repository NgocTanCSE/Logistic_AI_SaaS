"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleLoginButton } from '@/components/ui/GoogleLoginButton';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';

export default function AdminLogin() {
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
        router.push('/admin/dashboard');
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

        <div className="space-y-4">
          <GoogleLoginButton
            onSuccess={handleGoogleSuccess}
            onError={handleError}
            loading={loading}
          />
        </div>

        <div className="text-center text-xs text-ink-soft">
          By signing in, you agree to the SmartLogi Terms of Service.
        </div>
      </div>
    </div>
  );
}
