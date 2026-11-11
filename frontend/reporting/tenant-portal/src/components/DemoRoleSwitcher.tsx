'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { isMockDataSource } from '@/lib/data';
import { DemoAccount, DEMO_ACCOUNTS, mockLogin } from '@/lib/mock-auth';
import { StatusLabel, type StatusTone } from 'ui-kit';
import { ROLE_REDIRECT } from '@/components/auth/roleRedirect';

/**
 * Vai trò demo → route như trang đăng nhập, không qua server.
 *
 * Chỉ dùng được khi nguồn dữ liệu là mock: `mockLogin` tạo token trình duyệt,
 * `setAuthToken` đồng bộ context ngay, sau đó chuyển đến trang mà vai trò vừa
 * chọn được phép.
 * Khi role chuyển, trang cũng được chuyển theo, đảm bảo dấu hiệu nhất quán
 * (page không sở hữu quyền truy cập).
 */
const ROLE_TONE: Record<string, StatusTone> = {
  TENANT_ADMIN: 'neutral',
  WAREHOUSE_MANAGER: 'success',
  LOGISTICS_MANAGER: 'info',
  DRIVER: 'info',
};

/**
 * Đổi vai trò demo ngay trên topbar.
 *
 * Chỉ dùng được khi nguồn dữ liệu là mock: `mockLogin` tạo token trình duyệt,
 * `setAuthToken` đồng bộ context ngay, sau đó chuyển đến trang mà vai trò vừa
 * chọn được phép truy cập. Dữ liệu mẫu vẫn được giữ nguyên ở localStorage.
 */
export default function DemoRoleSwitcher() {
  const { user, setAuthToken } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isMockDataSource || !user?.role) return null;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const handleSelect = async (account: DemoAccount) => {
    setBusy(true);
    setError(null);
    try {
      const slug =
        typeof window !== 'undefined'
          ? localStorage.getItem('smartlogi_tenant_slug') ?? ''
          : 'demo-logistics-vn';
      const result = mockLogin({
        email: account.email,
        password: account.password,
        tenantSlug: slug,
      });
      setAuthToken(result.accessToken);
      router.replace(ROLE_REDIRECT[result.role] || '/dashboard');
    } catch (err) {
      setError((err as Error).message ?? 'Không chuyển được vai trò này.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls="demo-role-panel"
        className="flex h-8 items-center gap-2 rounded-md border border-line px-2.5 text-[11px] font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          Demo
        </span>
        <span className="text-[11px] font-medium text-ink">{user.fullName || user.email}</span>
      </button>

      {open && (
        <div
          id="demo-role-panel"
          role="dialog"
          aria-modal="false"
          className="absolute left-0 top-[calc(100%+4px)] z-50 mt-1 w-72 rounded-lg border border-line bg-surface shadow-[0_8px_24px_rgb(32_36_31_/_0.08)]"
        >
          <div className="max-h-64 overflow-y-auto">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => handleSelect(account)}
                disabled={busy}
                className="flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-surface-alt disabled:opacity-50"
              >
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-medium text-ink">
                    {account.fullName}
                  </div>
                  <div className="truncate text-[11px] text-ink-faint">{account.email}</div>
                </div>
                <StatusLabel tone={ROLE_TONE[account.role] ?? 'info'}>{account.label}</StatusLabel>
              </button>
            ))}
          </div>
          {error ? (
            <div className="border-t border-line p-2 text-[11px] text-danger">
              {error}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
