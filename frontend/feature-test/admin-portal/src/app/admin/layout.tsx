"use client";

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar, MenuItem } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

const adminMenuItems: MenuItem[] = [
  { title: 'Dashboard', href: '/admin/dashboard' },
  { title: 'Tenants', href: '/admin/tenants' },
  { title: 'Billing', href: '/admin/billing' },
  { title: 'Audit Logs', href: '/admin/audit-logs' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const pathname = usePathname();

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  useEffect(() => {
    const token = localStorage.getItem('smartlogi_admin_token');
    if (!token) {
      router.push('/admin/login');
    }
  }, [router, pathname]);

  return (
    <div className="flex min-h-[100dvh] bg-background overflow-hidden">
      <Sidebar items={adminMenuItems} basePath="/admin" />
      <div className="flex-1 flex flex-col min-h-[100dvh]">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
