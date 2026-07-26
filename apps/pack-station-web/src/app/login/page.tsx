"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { decodeJwt, setToken, setUser } from '@/lib/auth';

const SLUG_ROLE_MAP: Record<string, string> = {
  'demo-tenant': 'TENANT_ADMIN',
  'warehouse-tenant': 'WAREHOUSE_MANAGER',
  'logistics-tenant': 'LOGISTICS_MANAGER',
  'customer-tenant': 'CUSTOMER_CLIENT',
  'pack-station': 'WAREHOUSE_STAFF',
  'smartlogi': 'DRIVER',
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

export default function PackStationLogin() {
  const [slug, setSlug] = useState('demo-tenant');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/tenant/auth/login', { email, password }, {
        headers: { 'x-tenant-slug': slug },
      });
      if (res.data?.accessToken) {
        setToken(res.data.accessToken);
        const payload = decodeJwt(res.data.accessToken);
        const role = payload?.role || SLUG_ROLE_MAP[slug] || 'TENANT_USER';
        setUser({ role, slug, email });
        router.push(ROLE_REDIRECT_MAP[role] || '/');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center p-4 bg-slate-900 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/20 blur-[100px] rounded-full pointer-events-none z-0"></div>
      
      <div className="w-full max-w-md p-8 rounded-2xl relative z-10 bg-slate-800/80 backdrop-blur-xl border border-white/10 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-8v4h8v-4zm-4-8h4m-4 4h4m6-4v1m-4-1v1m-4-1v1m-4-1v1m2-4h12a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Pack Station</h1>
          <p className="text-slate-400 mt-2">Warehouse Staff Access</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Workspace Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
              placeholder="e.g. demo-tenant"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Staff ID / Email</label>
            <input 
              type="text" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
              placeholder="e.g. staff_01"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
              placeholder="Enter password"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? 'Authenticating...' : 'Start Shift'}
          </button>

          <div className="mt-4 text-center">
            <Link href="/forgot-password" className="text-slate-400 hover:text-blue-400 text-sm transition-colors">
              Forgot Password?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}