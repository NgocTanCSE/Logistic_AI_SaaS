"use client";

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldAlert, Lock, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/admin/auth/reset-password', {
        email,
        token,
        password,
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
        <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-500">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Invalid Link</h1>
        <p className="text-zinc-400 mb-6">This password reset link is invalid or has expired.</p>
        <Link href="/admin/forgot-password" className="text-red-400 hover:text-red-300 font-medium">
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-500">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Password Reset</h1>
        <p className="text-zinc-400 mb-6">Your password has been reset successfully.</p>
        <Link
          href="/admin/login"
          className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-500">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white">Set New Password</h1>
        <p className="text-zinc-400 mt-2">Enter your new password for <strong className="text-white">{email}</strong></p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm text-center font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-red-500/50 transition-colors"
              placeholder="Min. 8 characters"
              required
              minLength={8}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-red-500/50 transition-colors"
              placeholder="Re-enter password"
              required
              minLength={8}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 mt-4 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </>
  );
}

export default function AdminResetPassword() {
  return (
    <div className="flex-1 min-h-[100dvh] flex items-center justify-center p-4 bg-background relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-red-500/10 blur-[120px] rounded-full pointer-events-none z-0"></div>
      <div className="glass-panel w-full max-w-md p-8 rounded-2xl relative z-10 border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.1)]">
        <Suspense fallback={<div className="text-zinc-400 text-center">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
