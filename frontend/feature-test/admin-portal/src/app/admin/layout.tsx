'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import AIChatButton from '@/components/AIChatButton';
import { AppShell } from 'ui-kit';
import { ShellProvider } from 'ui-kit';
import { Sidebar, type NavSection } from 'ui-kit';
import { Topbar } from 'ui-kit';

const adminSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin/dashboard' },
      { label: 'Orders', href: '/admin/orders' },
      { label: 'Shipments', href: '/admin/shipments' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Tenants', href: '/admin/tenants' },
      { label: 'Billing', href: '/admin/billing' },
      { label: 'Audit Logs', href: '/admin/audit-logs' },
      { label: 'AI Models', href: '/admin/ai-models' },
    ],
  },
];

// Public admin routes that should render without the admin shell.
const ADMIN_PUBLIC_ROUTES = ['/admin/login', '/admin/forgot-password', '/admin/reset-password'];

function pageTitle(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  // Drop trailing resource ids so /admin/tenants/<uuid> still reads "Tenants".
  while (parts.length > 1 && /^[0-9a-f-]{8,}$/i.test(parts[parts.length - 1])) {
    parts.pop();
  }
  if (parts.length <= 1) return 'Home';
  return parts[parts.length - 1]
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function AdminChrome({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.replace('/admin/login');
  };

  return (
    <AppShell
      maxWidth="full"
      sidebar={
        <Sidebar
          brand={{
            name: 'SmartLogi',
            tagline: 'Super Admin',
            href: '/admin/dashboard',
            initials: 'SA',
          }}
          sections={adminSections}
          labels={{ navigation: 'Admin navigation' }}
        />
      }
      topbar={
        <Topbar
          title={pageTitle(pathname)}
          user={{ name: user?.email?.split('@')[0], email: user?.email, role: user?.role }}
          onLogout={handleLogout}
          logoutLabel="Logout"
          showNotifications
        />
      }
      ai={<AIChatButton />}
    >
      {children}
    </AppShell>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, isLoading } = useAuth();

  const isPublicRoute = ADMIN_PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/'),
  );

  useEffect(() => {
    if (!isPublicRoute && !isLoading && typeof window !== 'undefined' && !token) {
      router.push('/admin/login');
    }
  }, [isPublicRoute, isLoading, router, token]);

  // Public auth pages — render children directly without sidebar/topbar.
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Wait for the stored session before deciding to redirect.
  if (isLoading || !token) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background text-ink">
        <div className="rounded-2xl border border-border bg-surface px-6 py-4 shadow-sm">
          <p className="text-sm font-medium text-ink-soft">
            {isLoading ? 'Checking session…' : 'Redirecting to login…'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ShellProvider>
      <AdminChrome>{children}</AdminChrome>
    </ShellProvider>
  );
}
