"use client";

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar, MenuItem } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

const adminMenuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    href: '/admin/dashboard',
  },
  {
    title: 'Tenants',
    href: '/admin/tenants',
  },
  {
    title: 'Billing',
    href: '/admin/billing',
  },
  {
    title: 'Audit Logs',
    href: '/admin/audit-logs',
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const pathname = usePathname();

  // If on login page, render without sidebar
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('smartlogi_admin_token');
    if (!token) {
      router.push('/admin/login');
    }
  }, [router, pathname]);

  return (
    <div className="flex min-h-[100dvh] overflow-hidden bg-background">
      <Sidebar items={adminMenuItems} basePath="/admin" />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute inset-0 bg-mesh-pattern opacity-10 pointer-events-none"></div>
        <TopBar />
        <main className="flex-1 overflow-y-auto p-8 relative z-10">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
