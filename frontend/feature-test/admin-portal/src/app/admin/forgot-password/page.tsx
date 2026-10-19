"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Envelope, ArrowLeft, ShieldWarning } from 'phosphor-react';
import api from '@/lib/api';

export default function AdminForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/admin/auth/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to process request.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex-1 min-h-[100dvh] flex items-center justify-center p-4 bg-surface-alt">
        <div className="bg-white border border-slate-200 w-full max-w-md p-8 rounded-2xl shadow-sm text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600">
            <Envelope className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-ink mb-2">Check Your Email</h1>
          <p className="text-inkSoft mb-6">
            If an account with <strong className="text-ink">{email}</strong> exists,
            we've sent a password reset link.
          </p>
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-2 text-primary hover:text-primary-hover transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-[100dvh] flex items-center justify-center p-4 bg-surface-alt">
      <div className="bg-white border border-slate-200 w-full max-w-md p-8 rounded-2xl shadow-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
            <ShieldWarning className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-ink">Reset Password</h1>
          <p className="text-inkSoft mt-2">Enter your email to receive a reset link.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Admin Email</label>
            <div className="relative">
              <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-ink focus:outline-none focus:border-primary transition-colors"
                placeholder="admin@smartlogi.io"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 mt-4 shadow-sm"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-2 text-inkSoft hover:text-ink transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
