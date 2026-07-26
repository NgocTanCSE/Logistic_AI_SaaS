"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const SLUG_ROLE_MAP: Record<string, string> = {
  'demo-tenant': 'TENANT_ADMIN',
  'warehouse-tenant': 'WAREHOUSE_MANAGER',
  'logistics-tenant': 'LOGISTICS_MANAGER',
  'customer-tenant': 'CUSTOMER_CLIENT',
  'pack-station': 'WAREHOUSE_STAFF',
  'smartlogi': 'DRIVER',
};

const ROLE_REDIRECT_MAP: Record<string, string> = {
  'TENANT_ADMIN': '/client/dashboard',
  'WAREHOUSE_MANAGER': '/client/dashboard',
  'LOGISTICS_MANAGER': '/client/dashboard',
  'WAREHOUSE_STAFF': '/client/dashboard',
  'DRIVER': '/client/dashboard',
  'CUSTOMER_CLIENT': '/client/dashboard',
  'TENANT_USER': '/client/dashboard',
};

export default function B2BLogin() {
  const { login } = useAuth();
  const [slug, setSlug] = useState('demo-tenant');
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const role = SLUG_ROLE_MAP[slug] || 'CLIENT_USER';
    
    if (!slug) {
      setError('Please enter your workspace slug.');
      setLoading(false);
      return;
    }
    try {
      const res = await api.post('/tenant/auth/login', { email, password }, {
        headers: { 'x-tenant-slug': slug },
      });
      if (res.data?.accessToken) {
        login(res.data.accessToken, { role, slug, email });
        router.push(ROLE_REDIRECT_MAP[role] || '/client/dashboard');
      } else {
        setError(res.data?.message || 'Login failed.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to connect to the login service. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 blur-[100px] rounded-full pointer-events-none z-[-1]"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel w-full max-w-md p-8 rounded-2xl"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">B2B Portal Login</h1>
          <p className="text-zinc-400 mt-2">Manage your corporate shipments</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Workspace Slug</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="e.g. acme-corp"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Work Email</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="you@company.com"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-400 text-center">
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>

          <div className="mt-4 text-center">
            <Link href="/client/forgot-password" className="text-zinc-400 hover:text-primary text-sm transition-colors">
              Forgot Password?
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}