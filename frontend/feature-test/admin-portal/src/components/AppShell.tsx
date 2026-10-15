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
  const isAuthRoute = pathname.startsWith('/login');

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <AuthGate>
      <div className="flex min-h-[100dvh] bg-background text-ink">
        <Sidebar />
        <div className="flex-1 ml-64 flex flex-col min-h-[100dvh]">
          <Header />
          <main className="px-8 py-8">{children}</main>
        </div>
      </div>
    </AuthGate>
  );
}
