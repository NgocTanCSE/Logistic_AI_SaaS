"use client";

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package, ClipboardList, LogOut, Box } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/lib/auth-context';

export default function PackLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, logout, user } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/login' && pathname !== '/forgot-password' && pathname !== '/reset-password') {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (pathname === '/login' || pathname === '/forgot-password' || pathname === '/reset-password') {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const menuItems = [
    { href: '/pack', icon: Package, label: 'Packing' },
    { href: '/pack/logs', icon: ClipboardList, label: 'Pack Logs' },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-black/80 border-r border-white/10 flex flex-col">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-2 text-primary">
            <Box className="w-6 h-6" />
            <span className="font-bold text-sm">Pack Station</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-primary/20 text-primary font-medium"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-zinc-500 mb-3 truncate">{user?.fullName || 'Operator'}</div>
          <button
            onClick={() => { logout(); router.push('/login'); }}
            className="flex items-center gap-2 text-zinc-400 hover:text-red-400 transition-colors text-sm w-full px-3 py-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6 bg-black/40">
        {children}
      </main>
    </div>
  );
}
