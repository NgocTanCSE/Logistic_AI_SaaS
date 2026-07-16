'use client';

import { useRouter } from 'next/navigation';
import { clearToken } from '@/lib/auth';

export default function Header() {
  const router = useRouter();

  const handleLogout = () => {
    clearToken();
    router.replace('/login');
  };

  return (
    <header className="h-20 w-full border-b border-slate-200 bg-white/80 sticky top-0 z-10 flex items-center justify-between px-8 backdrop-blur">
      <div className="flex-1">
        <div className="relative w-96">
          <input
            type="text"
            placeholder="Search tenants, users, audits..."
            className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <div className="absolute left-4 top-2.5 text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:text-ink">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-400"></span>
        </button>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-ink">Super Admin</p>
            <p className="text-xs text-slate-500">admin@smartlogi.vn</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:border-primary hover:text-primary"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
