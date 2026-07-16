"use client";

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Package, Inbox, Globe, Receipt, RotateCcw, LogOut } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/lib/auth-context';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/client/login') {
      router.push('/client/login');
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (pathname === '/client/login') {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const menuItems = [
    { href: '/client/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/client/orders', icon: Package, label: 'Orders' },
    { href: '/client/inventory', icon: Inbox, label: 'Inventory' },
    { href: '/client/webhooks', icon: Globe, label: 'Webhooks' },
    { href: '/client/invoices', icon: Receipt, label: 'Invoices' },
    { href: '/client/returns', icon: RotateCcw, label: 'Returns' },
  ];

  const handleLogout = () => {
    logout();
    router.push('/client/login');
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-black/50 backdrop-blur-xl flex flex-col">
        <div className="p-6">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">B2B Dashboard</p>
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href) && item.href !== '#';
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                    isActive 
                      ? "bg-primary/20 text-primary font-medium" 
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-white/10">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 text-zinc-400 hover:text-red-400 transition-colors w-full px-4 py-2"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
