'use client';

import { useRouter } from 'next/navigation';
import { clearSession } from '@/lib/auth';
import { useScrollProgress } from '@/lib/sidebar-context';
import { cn } from '@/lib/utils';

export default function Header() {
  const router = useRouter();
  const progress = useScrollProgress();

  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-slate-200 bg-background flex flex-col">
      {/* Soft scroll progress indicator (brand primary accent) */}
      <div className="h-[3px] w-full bg-surface-alt/50 overflow-hidden">
        <div
          className="h-full scroll-progress transition-all duration-75 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%`, opacity: progress > 0.01 ? 1 : 0 }}
        />
      </div>

      <div className="h-16 px-8 flex items-center justify-between gap-4">
        {/* Search (editorial sans) */}
        <div className="relative w-80">
          <input
            type="text"
            placeholder="Tìm đơn hàng, tồn kho, vận đơn..."
            className={cn(
              'peer w-full rounded-xl border border-slate-200 bg-surface-alt py-2.5 pl-11 pr-4 text-sm text-ink placeholder-transparent focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors'
            )}
            id="site-search"
            aria-label="Tìm kiếm"
          />
          <label htmlFor="site-search" className="absolute left-4 top-2.5 text-xs font-mono text-ink-soft transition-colors peer-focus:text-primary">
            Tìm kiếm
          </label>
          <div className="absolute left-3.5 top-2.5 text-ink-soft peer-focus:text-primary">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="relative rounded-full border border-slate-200 bg-surface-alt p-2 text-ink-soft hover:text-ink hover:bg-surface-alt transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
            aria-label="Thông báo"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 2.5a7.5 7.5 0 010 13.81M14.857 2.5A7.5 7.5 0 019 14h5.833a2 2 0 011.76 1m-8.33 1A7.5 7.5 0 115 11h1.5"></path>
            </svg>
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-400" />
          </button>

          {/* User avatar */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white font-bold text-xs">
            TU
          </div>

          <button
            onClick={handleLogout}
            className="rounded-xl border border-slate-200 bg-surface-alt px-4 py-2 text-xs font-semibold text-ink-soft hover:text-ink hover:bg-surface-alt transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </header>
  );
}
