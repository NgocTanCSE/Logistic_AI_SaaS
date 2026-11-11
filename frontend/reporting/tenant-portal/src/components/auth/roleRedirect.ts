/**
 * Mô phỏng chính xác route khởi đầu cho mỗi vai trò demo.
 *
 * Vì `mui` khi đăng nhập ở tenant portal (mock hoặc API thật) bấm đến page
 * dự theo vai trò, nên map được gom thành một nguồn duy nhất dự phòng xóa hoặc
 * sao chép ở 3 nơi: `app/login`, `components/ui/GoogleLoginButton`,
 * `components/DemoRoleSwitcher`.
 */
export const ROLE_REDIRECT: Record<string, string> = {
  TENANT_ADMIN: '/dashboard',
  TENANT_USER: '/dashboard',
  WAREHOUSE_MANAGER: '/dashboard',
  WAREHOUSE_STAFF: '/dashboard',
  LOGISTICS_MANAGER: '/logistics/dispatch',
  DRIVER: '/drivers/my-trips',
};
