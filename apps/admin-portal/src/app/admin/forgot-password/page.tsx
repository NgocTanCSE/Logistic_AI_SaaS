"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ShieldAlert, Mail, ArrowLeft } from 'lucide-react';
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
      <div className="flex-1 min-h-[100dvh] flex items-center justify-center p-4 bg-background relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none z-0"></div>
        <div className="glass-panel w-full max-w-md p-8 rounded-2xl relative z-10 border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.1)] text-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-500">
            <Mail className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Check Your Email</h1>
          <p className="text-zinc-400 mb-6">
            If an account with <strong className="text-white">{email}</strong> exists,
            we've sent a password reset link.
          </p>
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-[100dvh] flex items-center justify-center p-4 bg-background relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-red-500/10 blur-[120px] rounded-full pointer-events-none z-0"></div>

      <div className="glass-panel w-full max-w-md p-8 rounded-2xl relative z-10 border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.1)]">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-500">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="text-zinc-400 mt-2">Enter your email to receive a reset link.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Admin Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-red-500/50 transition-colors"
                placeholder="admin@smartlogi.io"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 mt-4 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
