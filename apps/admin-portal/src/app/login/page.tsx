'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@smartlogi.vn');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/admin/auth/login', { email, password });
      if (!response.data?.accessToken) {
        setError(response.data?.message || 'Login failed');
        setLoading(false);
        return;
      }
      login(response.data.accessToken);
      router.replace('/admin/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] bg-background flex items-center justify-center px-6 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-mesh-pattern opacity-20 pointer-events-none"></div>
      <div className="absolute inset-0 bg-hero-glow pointer-events-none"></div>
      
      {/* Floating Orbs (Glow) */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse-glow mix-blend-screen pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px] animate-pulse-glow mix-blend-screen pointer-events-none" style={{ animationDelay: '1s' }}></div>

      <div className="relative z-10 w-full max-w-md animate-slide-up">
        {/* Glassmorphism Card */}
        <div className="glass-panel p-10">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent mb-6 shadow-[0_0_20px_rgba(59,130,246,0.4)]">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-ink mb-2 tracking-tight">SmartLogi OS</h1>
            <p className="text-sm text-inkSoft">Enter your credentials to access the nexus.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-inkSoft ml-1">
                Identity (Email)
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="cyber-input"
                placeholder="admin@smartlogi.vn"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-inkSoft ml-1">
                Passcode
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="cyber-input"
                placeholder="••••••••"
                required
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember/90 animate-fade-in flex items-start gap-2">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="neon-button w-full mt-4 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Authenticating...
                </>
              ) : 'Initialize Session'}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-xs text-inkSoft/60 tracking-wider">SECURE CONNECTION ESTABLISHED</p>
          </div>
        </div>
      </div>
    </div>
  );
}
