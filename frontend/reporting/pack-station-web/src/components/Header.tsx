'use client';

import { useRouter } from 'next/navigation';
import { clearAuth } from '@/lib/auth';
import { useScrollProgress } from '@/lib/sidebar-context';
import { cn } from '@/lib/utils';

export default function Header() {
  const router = useRouter();
  const progress = useScrollProgress();

  const handleLogout = () => {
    clearAuth();
    router.replace('/login');
  };

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-slate-200 bg-background flex flex-col">
      <div className="h-[3px] w-full bg-slate-200 overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-75 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%`, opacity: progress > 0.01 ? 1 : 0 }}
        />
      </div>
      <div className="h-16 px-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-bold text-xs">
            SL
          </div>
          <span className="font-editorial text-lg font-semibold text-ink">Pack Station</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="rounded-full border border-slate-200 bg-surface-alt p-2 text-ink-soft hover:text-ink hover:bg-primary/5 transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
            aria-label="Thông báo"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 2.5a7.5 7.5 0 010 13.81M14.857 2.5A7.5 7.5 0 019 14h5.833a2 2 0 011.76 1m-8.33 1A7.5 7.5 0 015 11h1.5"></path>
            </svg>
          </button>

          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white font-bold text-xs"
            title="Tôi"
            aria-label="Người dùng"
          >
            TU
          </div>
          <button
            onClick={handleLogout}
            className="rounded-xl border border-slate-200 bg-surface-alt px-4 py-2 text-xs font-semibold text-ink-soft hover:text-ink hover:bg-primary/5 transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </header>
  );
}
