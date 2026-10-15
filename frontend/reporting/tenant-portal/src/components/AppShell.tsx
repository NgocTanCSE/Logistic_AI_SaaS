'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import AuthGate from '@/components/AuthGate';
import AIChatButton from '@/components/AIChatButton';
import { SidebarProvider } from '@/lib/sidebar-context';

/**
 * AppShell — adapted from the Gốm Việt Ecom sample layout orchestrator.
 *
 * Layout:
 *   [ fixed left Sidebar ] [ Header (sticky) ] [ scrollable main well ]
 *   + floating AI chat button
 *
 * Sidebar collapses on desktop and becomes a slide-in drawer on mobile.
 * The main well renders a top scroll-progress bar (driven by useScrollProgress)
 * and a max-width centered content region.
 *
 * Auth/public routes (login, forgot, reset) render without chrome.
 */
function ShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password');

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <AuthGate>
      <div className="flex min-h-[100dvh] bg-background text-ink font-body">
        <Sidebar />
        <div className="flex-1 lg:ml-64 flex flex-col min-h-[100dvh]">
          <Header />
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            {/* Content region: max-width + horizontal padding (editorial container) */}
            <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-10 py-8">
              {children}
            </div>
          </main>
        </div>
        <AIChatButton />
      </div>
    </AuthGate>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <ShellInner>{children}</ShellInner>
    </SidebarProvider>
  );
}
