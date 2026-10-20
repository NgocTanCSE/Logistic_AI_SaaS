"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { ArrowLeft, Building2, Mail } from '@/components/icons';

export default function B2BForgotPassword() {
  const [slug, setSlug] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/client/auth/forgot-password', { email }, {
        headers: { 'x-tenant-slug': slug },
      });
      setSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to process request.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none z-[-1]"></div>
        <div
          className="bg-white border border-slate-200 w-full max-w-md p-8 rounded-2xl text-center"
        >
          <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-500">
            <Mail className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-ink mb-2">Check Your Email</h1>
          <p className="text-ink-soft mb-6">
            If an account with <strong className="text-ink">{email}</strong> exists, we've sent a reset link.
          </p>
          <Link href="/client/login" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium">
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 blur-[100px] rounded-full pointer-events-none z-[-1]"></div>
      <div
        className="bg-white border border-slate-200 w-full max-w-md p-8 rounded-2xl"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-ink">Reset Password</h1>
          <p className="text-ink-soft mt-2">Enter your workspace slug and email.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-600 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">Workspace Slug</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-soft" />
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-ink focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="e.g. acme-corp"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">Work Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-soft" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-ink focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="you@company.com"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/client/login" className="inline-flex items-center gap-2 text-ink-soft hover:text-ink transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
