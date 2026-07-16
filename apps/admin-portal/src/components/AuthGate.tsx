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

  useEffect(() => {
    const token = getToken();
    if (!token && !pathname.startsWith('/login')) {
      router.replace('/login');
      return;
    }
    setChecked(true);
  }, [pathname, router]);

  if (!checked) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background text-ink">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Checking session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
