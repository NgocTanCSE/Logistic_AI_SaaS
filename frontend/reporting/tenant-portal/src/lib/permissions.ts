export type AppRole =
  | 'SUPER_ADMIN'
  | 'TENANT_ADMIN'
  | 'WAREHOUSE_MANAGER'
  | 'WAREHOUSE_STAFF'
  | 'LOGISTICS_MANAGER'
  | 'DRIVER'
  | 'CUSTOMER_CLIENT'
  | 'TENANT_USER';

export type PermissionAction =
  | 'order:write'
  | 'wave:write'
  | 'inventory:write'
  | 'trip:write'
  | 'sos:write'
  | 'cod:write'
  | 'expense:write'
  | 'return:write'
  | 'ai:write'
  | 'client:write'
  | 'user:write'
  | 'apikey:write'
  | 'settings:write';

const ALL_ACTIONS: PermissionAction[] = [
  'order:write',
  'wave:write',
  'inventory:write',
  'trip:write',
  'sos:write',
  'cod:write',
  'expense:write',
  'return:write',
  'ai:write',
  'client:write',
  'user:write',
  'apikey:write',
  'settings:write',
];

/**
 * Mirrors `packages/shared-types/src/role-permission-map.ts`.
 * The server remains the authority; this matrix only hides controls the role
 * cannot use, so the UI never offers a guaranteed 403.
 */
const MATRIX: Record<AppRole, PermissionAction[]> = {
  SUPER_ADMIN: ALL_ACTIONS,
  TENANT_ADMIN: ALL_ACTIONS,
  WAREHOUSE_MANAGER: ['order:write', 'wave:write', 'inventory:write', 'return:write', 'expense:write'],
  WAREHOUSE_STAFF: ['inventory:write', 'wave:write'],
  LOGISTICS_MANAGER: [
    'order:write',
    'trip:write',
    'sos:write',
    'cod:write',
    'expense:write',
    'return:write',
  ],
  DRIVER: ['cod:write'],
  CUSTOMER_CLIENT: ['order:write', 'return:write'],
  TENANT_USER: [],
};

const ROUTE_ACCESS: Record<AppRole, string[]> = {
  SUPER_ADMIN: ['*'],
  TENANT_ADMIN: ['*'],
  WAREHOUSE_MANAGER: [
    '/demo',
    '/dashboard',
    '/notifications',
    '/profile',
    '/orders',
    '/inventory',
    '/wms',
    '/warehouses',
    '/logistics/returns',
    '/logistics/expenses',
    '/finance/reports',
    '/admin/ai-insights',
  ],
  WAREHOUSE_STAFF: [
    '/demo',
    '/dashboard',
    '/notifications',
    '/profile',
    '/orders',
    '/inventory',
    '/wms',
  ],
  LOGISTICS_MANAGER: [
    '/demo',
    '/dashboard',
    '/notifications',
    '/profile',
    '/orders',
    '/logistics',
    '/drivers',
    '/finance/cod',
    '/finance/reports',
    '/warehouses',
    '/admin/ai-insights',
  ],
  DRIVER: [
    '/demo',
    '/dashboard',
    '/notifications',
    '/profile',
    '/drivers/my-trips',
    '/logistics/sos',
  ],
  CUSTOMER_CLIENT: ['/demo', '/dashboard', '/notifications', '/profile', '/orders'],
  TENANT_USER: ['/demo', '/dashboard', '/notifications', '/profile', '/orders', '/inventory'],
};

/** Danh sách vai trò theo thứ tự hiển thị trên ma trận phân quyền. */
export const APP_ROLES: AppRole[] = [
  'SUPER_ADMIN',
  'TENANT_ADMIN',
  'WAREHOUSE_MANAGER',
  'WAREHOUSE_STAFF',
  'LOGISTICS_MANAGER',
  'DRIVER',
  'CUSTOMER_CLIENT',
  'TENANT_USER',
];

/** Toàn bộ hành động ghi, dùng làm cột của ma trận RBAC. */
export const ALL_WRITE_ACTIONS: PermissionAction[] = ALL_ACTIONS;

/** Ma trận quyền thật đang dùng để ẩn/hiện nút trong UI. */
export const PERMISSION_MATRIX: Record<AppRole, PermissionAction[]> = MATRIX;

/** Phạm vi route mỗi vai trò được vào, dùng cho mô phỏng truy cập. */
export const ROLE_ROUTE_ACCESS: Record<AppRole, string[]> = ROUTE_ACCESS;

const normalize = (role: string | undefined | null): AppRole => {
  const value = (role || 'TENANT_USER').toUpperCase();
  return (value in MATRIX ? value : 'TENANT_USER') as AppRole;
};

export function can(role: string | undefined | null, action: PermissionAction): boolean {
  return MATRIX[normalize(role)].includes(action);
}

export function canAccessRoute(role: string | undefined | null, pathname: string): boolean {
  const allowed = ROUTE_ACCESS[normalize(role)];
  if (allowed.includes('*')) return true;
  return allowed.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function allowedRoutes(role: string | undefined | null): string[] {
  return ROUTE_ACCESS[normalize(role)];
}
