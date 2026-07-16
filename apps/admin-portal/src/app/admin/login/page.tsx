"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, Mail, Lock } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function AdminLogin() {
  const [email, setEmail] = useState('admin@smartlogi.vn');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/admin/auth/login', { email, password });
      if (res.data.accessToken) {
        login(res.data.accessToken);
        router.push('/admin/dashboard');
      }
    } catch (err: any) {
      console.error('Login Error:', err);
      setError(err?.response?.data?.message || 'Invalid credentials or API unreachable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-[100dvh] flex items-center justify-center p-4 bg-background relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-red-500/10 blur-[120px] rounded-full pointer-events-none z-0"></div>
      
      <div className="glass-panel w-full max-w-md p-8 rounded-2xl relative z-10 border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.1)]">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-500">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">Super Admin</h1>
          <p className="text-zinc-400 mt-2">Restricted Area. Authorized Personnel Only.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
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

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-red-500/50 transition-colors"
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 mt-4 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
          >
            {loading ? 'Authenticating...' : 'Access System'}
          </button>

          <div className="mt-4 text-center">
            <Link href="/admin/forgot-password" className="text-zinc-400 hover:text-red-400 text-sm transition-colors">
              Forgot Password?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}