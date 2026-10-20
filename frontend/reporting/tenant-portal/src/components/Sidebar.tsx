'use client';

import { Sidebar as SharedSidebar, type NavSection } from '../../../../../packages/ui-kit/Sidebar';

const sections: NavSection[] = [
  {
    title: 'Vận hành',
    items: [
      { label: 'Tổng quan', href: '/dashboard' },
      { label: 'Đơn hàng', href: '/orders' },
      { label: 'Tồn kho', href: '/inventory' },
      { label: 'Kho', href: '/warehouses' },
      {
        label: 'Vận chuyển',
        href: '/logistics/dispatch',
        match: '/logistics',
      },
      { label: 'WMS', href: '/wms' },
    ],
  },
  {
    title: 'Quản trị',
    items: [
      { label: 'AI Insights', href: '/admin/ai-insights' },
      { label: 'Tài chính', href: '/finance/cod', match: '/finance' },
      { label: 'Cài đặt', href: '/settings' },
    ],
  },
];

export default function Sidebar() {
  return (
    <SharedSidebar
      brand={{
        name: 'SmartLogi',
        tagline: 'Bàn giao ca',
        href: '/dashboard',
      }}
      sections={sections}
      labels={{
        closeMenu: 'Đóng menu',
        navigation: 'Điều hướng chính',
      }}
    />
  );
}
