'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EditorialPageHeader,
  EditorialSection,
  EmptyNote,
  MetricBand,
  StatusLabel,
} from 'ui-kit';
import type { EditorialMetric } from 'ui-kit';
import { DataState, Input, Select, TableState } from 'ui-components';
import { data } from '@/lib/data';
import type { RoleDefinition } from '@/lib/mock';
import { formatNumber, roleLabel } from '@/lib/labels';
import {
  ALL_WRITE_ACTIONS,
  APP_ROLES,
  PERMISSION_MATRIX,
  ROLE_ROUTE_ACCESS,
  can,
  canAccessRoute,
} from '@/lib/permissions';
import type { AppRole, PermissionAction } from '@/lib/permissions';

const ACTION_LABELS: Record<PermissionAction, string> = {
  'order:write': 'Đơn hàng',
  'wave:write': 'Wave',
  'inventory:write': 'Tồn kho',
  'trip:write': 'Chuyến',
  'sos:write': 'SOS',
  'cod:write': 'COD',
  'expense:write': 'Chi phí',
  'return:write': 'Trả hàng',
  'ai:write': 'AI',
  'client:write': 'Khách hàng',
  'user:write': 'Người dùng',
  'apikey:write': 'API key',
  'settings:write': 'Cấu hình',
};

/** Gom các route thật đang xuất hiện trong ma trận để làm gợi ý mô phỏng. */
const KNOWN_ROUTES = Array.from(
  new Set(
    APP_ROLES.flatMap((role) =>
      ROLE_ROUTE_ACCESS[role].filter((route) => route !== '*'),
    ),
  ),
).sort();

function routeScope(role: AppRole): string {
  return ROLE_ROUTE_ACCESS[role].includes('*') ? 'Toàn bộ route' : `${ROLE_ROUTE_ACCESS[role].length} route`;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [simRole, setSimRole] = useState<AppRole>('WAREHOUSE_MANAGER');
  const [simAction, setSimAction] = useState<PermissionAction>('inventory:write');
  const [simPath, setSimPath] = useState('/wms/waves');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await data.roles.list();
      setRoles(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách vai trò.');
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const definitionByKey = useMemo(
    () => new Map(roles.map((role) => [role.key, role])),
    [roles],
  );

  const totalGrants = APP_ROLES.reduce(
    (sum, role) => sum + PERMISSION_MATRIX[role].length,
    0,
  );

  const metrics: EditorialMetric[] = [
    {
      label: 'Vai trò',
      value: formatNumber(APP_ROLES.length),
      meta: 'Áp dụng toàn tenant',
    },
    {
      label: 'Hành động ghi',
      value: formatNumber(ALL_WRITE_ACTIONS.length),
      meta: 'Cột của ma trận',
    },
    {
      label: 'Lượt cấp quyền',
      value: formatNumber(totalGrants),
      meta: `Trên ${APP_ROLES.length} vai trò`,
    },
    {
      label: 'Route được bảo vệ',
      value: formatNumber(KNOWN_ROUTES.length),
      meta: 'Kiểm tra ở cả sidebar và page',
    },
  ];

  const simAllowAction = can(simRole, simAction);
  const simAllowRoute = canAccessRoute(simRole, simPath.trim());

  return (
    <div className="space-y-6">
      <EditorialPageHeader
        eyebrow="Quản trị · RBAC"
        title="Ma trận phân quyền"
        description="Quyền ghi và phạm vi route của từng vai trò, lấy trực tiếp từ cấu hình đang dùng để ẩn nút trong giao diện. Ma trận này chỉ phản chiếu quyết định của server; server vẫn là nơi từ chối cuối cùng."
        meta={`${APP_ROLES.length} vai trò · ${ALL_WRITE_ACTIONS.length} hành động`}
      />

      <MetricBand metrics={metrics} />

      {error ? (
        <div className="flex items-center gap-3 border-l-2 border-danger bg-surface px-3 py-2">
          <StatusLabel tone="danger">Lỗi dữ liệu</StatusLabel>
          <span className="text-[12px] text-ink-soft">{error}</span>
          <button
            type="button"
            onClick={load}
            className="ml-auto text-[11px] font-medium text-accent hover:underline"
          >
            Thử lại
          </button>
        </div>
      ) : null}

      <EditorialSection
        title="Quyền ghi theo vai trò"
        eyebrow="Ma trận"
        action={
          <div className="flex items-center gap-4 text-[11px] text-ink-faint">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 bg-accent" aria-hidden="true" />
              Có quyền
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 border border-line-strong" aria-hidden="true" />
              Không
            </span>
          </div>
        }
      >
        <DataState
          loading={loading}
          empty={!loading && APP_ROLES.length === 0}
          error={error}
          onRetry={load}
          emptyTitle="Chưa có vai trò"
          emptyDescription="Ma trận quyền sẽ hiển thị khi tải xong cấu hình."
        >
          <div className="overflow-x-auto border border-line">
            <table className="min-w-[980px] divide-y divide-line">
              <thead className="bg-surface-alt">
                <tr>
                  <th className="sticky left-0 z-10 min-w-[200px] bg-surface-alt px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
                    Vai trò
                  </th>
                  {ALL_WRITE_ACTIONS.map((action) => (
                    <th
                      key={action}
                      className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-ink-faint"
                      title={action}
                    >
                      {ACTION_LABELS[action]}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                    Route
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-[12px]">
                {APP_ROLES.map((role) => {
                  const definition = definitionByKey.get(role);
                  return (
                    <tr key={role} className="hover:bg-surface-alt">
                      <th
                        scope="row"
                        className="sticky left-0 z-10 min-w-[200px] bg-canvas px-3 py-2 text-left font-normal"
                      >
                        <div className="text-[12px] font-semibold text-ink">
                          {roleLabel(role)}
                        </div>
                        <div className="font-mono text-[10px] text-ink-faint">{role}</div>
                        {definition ? (
                          <div className="text-[10px] text-ink-faint">
                            {formatNumber(definition.memberCount)} thành viên
                          </div>
                        ) : null}
                      </th>
                      {ALL_WRITE_ACTIONS.map((action) => {
                        const granted = PERMISSION_MATRIX[role].includes(action);
                        return (
                          <td key={action} className="px-2 py-2 text-center">
                            <span
                              className={
                                granted
                                  ? 'mx-auto block h-2 w-2 bg-accent'
                                  : 'mx-auto block h-2 w-2 border border-line-strong'
                              }
                              aria-hidden="true"
                            />
                            <span className="sr-only">
                              {granted ? 'Có quyền' : 'Không có quyền'}
                            </span>
                          </td>
                        );
                      })}
                      <td className="whitespace-nowrap px-2 py-2 text-center tabular-nums text-[11px] text-ink-soft">
                        {routeScope(role)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DataState>
        <EmptyNote>
          Hành động ghi quyết định nút tạo/sửa/duyệt có hiện hay không. Quyền đọc suy ra từ phạm vi
          route — vào được route nào thì đọc được dữ liệu ở route đó.
        </EmptyNote>
      </EditorialSection>

      <EditorialSection title="Phạm vi route" eyebrow="Điều hướng được phép">
        <div className="divide-y divide-line border-y border-line">
          {APP_ROLES.map((role) => {
            const routes = ROLE_ROUTE_ACCESS[role];
            return (
              <div key={role} className="grid gap-2 py-2.5 md:grid-cols-[220px_1fr]">
                <div>
                  <div className="text-[12px] font-semibold text-ink">{roleLabel(role)}</div>
                  <div className="font-mono text-[10px] text-ink-faint">{role}</div>
                </div>
                {routes.includes('*') ? (
                  <StatusLabel tone="success">Toàn bộ route trong tenant</StatusLabel>
                ) : (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                    {routes.map((route) => (
                      <span key={route} className="font-mono text-ink-soft">
                        {route}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <EmptyNote>
          Route không nằm trong danh sách sẽ bị chặn ở sidebar và chuyển hướng khi mở trực tiếp.
        </EmptyNote>
      </EditorialSection>

      <EditorialSection title="Mô phỏng quyết định" eyebrow="Thử vai trò và hành động">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="border border-line p-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
              Kiểm tra hành động ghi
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Select
                label="Vai trò"
                value={simRole}
                onChange={(event) => setSimRole(event.target.value as AppRole)}
                options={APP_ROLES.map((role) => ({
                  value: role,
                  label: `${roleLabel(role)} · ${role}`,
                }))}
              />
              <Select
                label="Hành động"
                value={simAction}
                onChange={(event) => setSimAction(event.target.value as PermissionAction)}
                options={ALL_WRITE_ACTIONS.map((action) => ({
                  value: action,
                  label: `${ACTION_LABELS[action]} (${action})`,
                }))}
              />
            </div>
            <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
              <StatusLabel tone={simAllowAction ? 'success' : 'danger'}>
                {simAllowAction ? 'Được phép' : 'Bị từ chối'}
              </StatusLabel>
              <span className="text-[12px] text-ink-soft">
                {roleLabel(simRole)} {simAllowAction ? 'có' : 'không có'} quyền{' '}
                <span className="font-mono text-[11px]">{simAction}</span>.
              </span>
            </div>
            <p className="mt-2 text-[11px] text-ink-faint">
              Khi bị từ chối, nút thao tác bị ẩn khỏi giao diện; gọi thẳng API vẫn nhận 403 từ
              server.
            </p>
          </div>

          <div className="border border-line p-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
              Kiểm tra truy cập route
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr]">
              <Select
                label="Vai trò"
                value={simRole}
                onChange={(event) => setSimRole(event.target.value as AppRole)}
                options={APP_ROLES.map((role) => ({
                  value: role,
                  label: roleLabel(role),
                }))}
              />
              <Input
                label="Đường dẫn"
                value={simPath}
                onChange={(event) => setSimPath(event.target.value)}
                placeholder="/wms/waves"
                list="rbac-routes"
              />
              <datalist id="rbac-routes">
                {KNOWN_ROUTES.map((route) => (
                  <option key={route} value={route} />
                ))}
              </datalist>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <StatusLabel tone={simAllowRoute ? 'success' : 'danger'}>
                {simAllowRoute ? 'Được vào' : 'Bị chặn'}
              </StatusLabel>
              <span className="font-mono text-[11px] text-ink-soft">{simPath || '/'}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {KNOWN_ROUTES.filter((route) => canAccessRoute(simRole, route)).map((route) => (
                <button
                  key={route}
                  type="button"
                  onClick={() => setSimPath(route)}
                  className="border border-line px-2 py-0.5 font-mono text-[10px] text-ink-soft transition-colors hover:border-accent hover:text-accent"
                >
                  {route}
                </button>
              ))}
            </div>
          </div>
        </div>
      </EditorialSection>

      <EditorialSection title="Vai trò trong dữ liệu tenant" eyebrow="Danh mục">
        <DataState
          loading={loading}
          empty={!loading && roles.length === 0}
          error={error}
          onRetry={load}
          emptyTitle="Chưa có vai trò trong tenant"
          emptyDescription="Vai trò hệ thống sẽ hiển thị nơi đây."
        >
          <div className="overflow-x-auto border border-line">
            <table className="min-w-full divide-y divide-line">
              <thead className="bg-surface-alt">
                <tr>
                  {['Vai trò', 'Mô tả', 'Thành viên', 'Quyền khai báo', 'Loại'].map((label) => (
                    <th
                      key={label}
                      className="whitespace-nowrap px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-[12px]">
                <TableState
                  loading={loading}
                  empty={!loading && roles.length === 0}
                  error={error ? new Error(error) : undefined}
                  onRetry={load}
                  colSpan={5}
                  emptyTitle="Chưa có vai trò"
                  emptyDescription="Vai trò hệ thống sẽ hiển thị nơi đây."
                >
                  {roles.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-alt">
                      <td className="px-3 py-2">
                        <div className="font-medium text-ink">{row.name}</div>
                        <div className="font-mono text-[10px] text-ink-faint">{row.key}</div>
                      </td>
                      <td className="px-3 py-2 text-ink-soft">{row.description}</td>
                      <td className="px-3 py-2 tabular-nums text-ink">
                        {formatNumber(row.memberCount)}
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-ink-faint">
                        {row.permissions.join(' · ')}
                      </td>
                      <td className="px-3 py-2">
                        <StatusLabel tone={row.builtin ? 'success' : 'neutral'}>
                          {row.builtin ? 'Hệ thống' : 'Tuỳ chỉnh'}
                        </StatusLabel>
                      </td>
                    </tr>
                  ))}
                </TableState>
              </tbody>
            </table>
          </div>
        </DataState>
        <EmptyNote>
          Danh mục này là bản ghi của tenant. Ma trận phía trên lấy từ cấu hình runtime nên luôn là
          nguồn đúng khi kiểm tra quyền.
        </EmptyNote>
      </EditorialSection>
    </div>
  );
}
