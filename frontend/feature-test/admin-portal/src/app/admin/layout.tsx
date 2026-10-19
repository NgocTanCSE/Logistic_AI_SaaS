"use client";

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar, MenuItem } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { useAuth } from '@/lib/auth-context';
import AIChatButton from '@/components/AIChatButton';
import { House, Users, CreditCard, ShieldCheck, ChartBar, Cube, Package } from 'phosphor-react';

const adminMenuItems: MenuItem[] = [
  { title: 'Dashboard', href: '/admin/dashboard', icon: <ChartBar className="w-5 h-5" /> },
  { title: 'Orders', href: '/admin/orders', icon: <Package className="w-5 h-5" /> },
  { title: 'Shipments', href: '/admin/shipments', icon: <Cube className="w-5 h-5" /> },
  { title: 'Tenants', href: '/admin/tenants', icon: <Users className="w-5 h-5" /> },
  { title: 'Billing', href: '/admin/billing', icon: <CreditCard className="w-5 h-5" /> },
  { title: 'Audit Logs', href: '/admin/audit-logs', icon: <ShieldCheck className="w-5 h-5" /> },
  { title: 'AI Models', href: '/admin/ai-models', icon: <House className="w-5 h-5" /> },
];

// Public admin routes that should render without the admin shell
const ADMIN_PUBLIC_ROUTES = ['/admin/login', '/admin/forgot-password', '/admin/reset-password'];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, logout } = useAuth();

  const isPublicRoute = ADMIN_PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  // Public auth pages — render children directly without sidebar/topbar
  if (isPublicRoute) {
    return <>{children}</>;
  }

  useEffect(() => {
    if (typeof window !== 'undefined' && !token) {
      router.push('/admin/login');
    }
  }, [router, token]);

  // While redirecting (no token), don't render the shell
  if (!token) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background text-ink">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Redirecting to login…</p>
        </div>
      </div>
    );
  }

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

      {/* AI Assistant — available on every admin page */}
      <AIChatButton />
    </div>
  );
}
