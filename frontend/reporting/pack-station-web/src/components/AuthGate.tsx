'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getToken } from '@/lib/auth';

type AuthGateProps = {
  children: ReactNode;
};

export default function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  const isPublicRoute = pathname.startsWith('/login') || pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password');

  useEffect(() => {
    const token = getToken();
    if (!token && !isPublicRoute) {
      router.replace('/login');
      return;
    }
    setChecked(true);
  }, [pathname, router]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-ink">
        <div className="rounded-md border border-line bg-surface px-4 py-3 shadow-sm">
          <p className="text-[12px] font-medium text-ink-soft">Đang kiểm tra phiên làm việc…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
