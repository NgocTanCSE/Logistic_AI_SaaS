'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import AuthGate from './AuthGate';

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password');

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <AuthGate>
      <div className="flex min-h-screen bg-background text-ink">
        <Sidebar />
        <div className="flex-1 ml-64 flex flex-col min-h-screen">
          <Header />
          <main className="px-8 py-8 flex-1">{children}</main>
        </div>
      </div>
    </AuthGate>
  );
}
