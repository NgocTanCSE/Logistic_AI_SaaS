'use client';

import { useAuth } from '@/lib/auth-context';
import { Topbar } from '../../../../../packages/ui-kit/Topbar';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <Topbar
      search={{
        placeholder: 'Tìm đơn hàng, tồn kho, vận đơn...',
        label: 'Tìm kiếm',
      }}
      user={{ name: user?.fullName, email: user?.email, role: user?.role }}
      onLogout={logout}
      logoutLabel="Đăng xuất"
      showNotifications
      notificationsLabel="Thông báo"
      menuLabel="Mở menu"
    />
  );
}
