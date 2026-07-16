"use client";

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';
  const slug = searchParams.get('slug') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/tenant/auth/reset-password', { email, token, password }, {
        headers: { 'x-tenant-slug': slug },
      });
      if (res.data?.ok) {
        setSuccess(true);
      } else {
        setError(res.data?.message || 'Failed to reset password.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid or expired reset token.');
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Invalid Link</h1>
        <p className="text-slate-400 mb-6">This password reset link is invalid or has expired.</p>
        <Link href="/forgot-password" className="text-blue-400 hover:text-blue-300 font-medium">Request a new reset link</Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Password Reset</h1>
        <p className="text-slate-400 mb-6">Your password has been reset successfully.</p>
        <Link href="/login" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h1 className="text-2xl font-bold text-white">Set New Password</h1>
        <p className="text-slate-400 mt-2">Enter your new password for <strong className="text-white">{email}</strong></p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm text-center font-medium">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">New Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
            placeholder="Min. 8 characters" required minLength={8} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Confirm Password</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
            placeholder="Re-enter password" required minLength={8} />
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50 mt-2">
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </>
  );
}

export default function PackStationResetPassword() {
  return (
    <div className="flex-1 min-h-screen flex items-center justify-center p-4 bg-slate-900 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/20 blur-[100px] rounded-full pointer-events-none z-0"></div>
      <div className="w-full max-w-md p-8 rounded-2xl relative z-10 bg-slate-800/80 backdrop-blur-xl border border-white/10 shadow-2xl">
        <Suspense fallback={<div className="text-slate-400 text-center py-8">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
