'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/lib/sidebar-context';
import { cn } from '@/lib/utils';

const USER = { name: 'SmartLogi', avatar: 'SL' };

const menuItems = [
  { id: 'dashboard', label: 'Tổng quan', href: '/dashboard' },
  { id: 'orders', label: 'Đơn hàng', href: '/orders' },
  { id: 'inventory', label: 'Tồn kho', href: '/inventory' },
  { id: 'warehouses', label: 'Kho', href: '/warehouses' },
  { id: 'logistics', label: 'Vận chuyển', href: '/logistics/dispatch' },
  { id: 'wms', label: 'WMS', href: '/wms' },
  { id: 'ai-insights', label: 'AI Insights', href: '/admin/ai-insights' },
  { id: 'finance', label: 'Tài chính', href: '/finance/cod' },
  { id: 'settings', label: 'Cài đặt', href: '/settings' },
];

export default function Sidebar() {
  const { open, setOpen, collapsed, setCollapsed, isMobile } = useSidebar();
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/logistics/dispatch') return pathname.startsWith('/logistics');
    if (href === '/wms') return pathname.startsWith('/wms');
    if (href === '/admin/ai-insights') return pathname.startsWith('/admin/ai-insights');
    return pathname === href;
  };

  const sidebarContent = (
    <>
      {/* Brand block — editorial serif */}
      <div className="mb-8" role="button" tabIndex={0}
        onClick={() => (window.location.href = '/dashboard')}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (window.location.href = '/dashboard')}>
        <h1 className="font-editorial text-2xl font-bold tracking-wide text-ink group-hover:text-primary transition-colors">
          {USER.name}
        </h1>
        <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-semibold mt-1.5">
          Logistics AI Platform
        </p>
      </div>

      <nav aria-label="Điều hướng chính" className="flex-1">
        <div className="space-y-1">
          {menuItems.map((item, index) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all duration-200 text-left outline-none',
                  active
                    ? 'bg-primary/5 text-primary font-semibold ring-1 ring-primary/20'
                    : 'text-ink-soft hover:bg-primary/5 hover:text-ink'
                )}
                onClick={() => isMobile && setOpen(false)}
              >
                <span
                  className={cn(
                    'flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-lg font-mono text-xs transition-colors',
                    active
                      ? 'bg-primary text-white'
                      : 'bg-surface-alt text-ink-soft hover:bg-primary hover:text-white'
                  )}
                >
                  {index + 1}
                </span>
                <span className="text-sm font-medium leading-snug truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Collapse / reopen controls */}
      <div className="pt-4 border-t border-slate-200 space-y-2.5">
        {!collapsed && !isMobile && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-ink-soft hover:text-ink hover:bg-surface-alt transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
            title="Thu gọn thanh điều hướng"
            aria-label="Thu gọn thanh điều hướng"
          >
            <span>Thu gọn</span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>
    </>
  );

  if (isMobile) {
    // Slide-in drawer + floating hamburger trigger (mirrors sample mobile UX)
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'lg:hidden fixed top-5 left-5 z-40 w-11 h-11 rounded-2xl bg-background shadow-card flex items-center justify-center text-ink hover:bg-surface-alt transition-all focus-visible:ring-2 focus-visible:ring-primary'
          )}
          aria-label="Mở menu"
        >
          <span className="text-xl leading-none">≡</span>
        </button>

        {open && (
          <div
            className="lg:hidden fixed inset-0 bg-ink/40 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
        )}

        <aside
          className={cn(
            'lg:hidden fixed top-0 left-0 h-[100dvh] w-72 z-50 bg-background border-r border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out select-none',
            open ? 'translate-x-0' : '-translate-x-full'
          )}
          aria-label="Điều hướng di động"
        >
          <div className="pt-14 p-6 h-full overflow-y-auto">{sidebarContent}</div>
        </aside>
      </>
    );
  }

  // ── Desktop: fixed left sidebar (collapsible) ──
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className={cn(
          'hidden lg:flex fixed top-5 left-5 z-40 px-3.5 py-2.5 bg-background border border-slate-200 rounded-xl shadow-card items-center gap-2 text-xs font-medium text-ink-soft hover:text-ink hover:bg-surface-alt transition-all focus-visible:ring-2 focus-visible:ring-primary'
        )}
        title="Mở thanh điều hướng"
        aria-label="Mở thanh điều hướng"
      >
        <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span className="font-mono text-[11px] uppercase tracking-wider">Mở menu</span>
      </button>
    );
  }

  return (
    <aside
      className="hidden lg:flex lg:flex-col lg:fixed lg:top-0 lg:left-0 lg:h-[100dvh] lg:w-64 lg:bg-background lg:border-r lg:border-slate-200 lg:z-30 lg:transition-all"
      aria-label="Điều hướng chính"
    >
      <div className="p-6 h-full">{sidebarContent}</div>
    </aside>
  );
}
