'use client';

import { useEffect, useMemo, useState } from 'react';
import { EditorialPageHeader, EditorialSection, MetricBand, StatusLabel } from 'ui-kit';
import { TableState } from 'ui-components';
import { formatNumber } from '@/lib/format';
import {
  ControlTowerData,
  NetworkNode,
  Shipment,
  getControlTower,
  getAll,
  initStore,
  setControlTower,
} from '@/lib/local-store';

type Scenario = {
  id: string;
  name: string;
  detail: string;
  demandDelta: number;
  costDelta: number;
  etaDelta: number;
};

const SCENARIOS: Scenario[] = [
  {
    id: 'baseline',
    name: 'Baseline',
    detail: 'Kế hoạch hiện tại, không điều chỉnh.',
    demandDelta: 0,
    costDelta: 0,
    etaDelta: 0,
  },
  {
    id: 'surge',
    name: 'Demand +20%',
    detail: 'Chiến dịch lớn đẩy sản lượng tăng đột biến.',
    demandDelta: 20,
    costDelta: 8,
    etaDelta: 12,
  },
  {
    id: 'fuel',
    name: 'Fuel +15%',
    detail: 'Giá nhiên liệu tăng, biên lợi nhuận co lại.',
    demandDelta: 0,
    costDelta: 15,
    etaDelta: 3,
  },
  {
    id: 'storm',
    name: 'Storm disruption',
    detail: 'Mưa bão chặn tuyến Bắc – Trung, ETA giãn mạnh.',
    demandDelta: -12,
    costDelta: 22,
    etaDelta: 26,
  },
];

const NODE_STATUS_TONE: Record<NetworkNode['status'], 'success' | 'warning' | 'danger'> = {
  UP: 'success',
  DEGRADED: 'warning',
  DOWN: 'danger',
};

const NODE_COLOR: Record<NetworkNode['status'], string> = {
  UP: '#3f6b4f',
  DEGRADED: '#8a5d28',
  DOWN: '#a3483f',
};

/** Toạ độ vẽ mạng lưới Bắc – Trung – Nam trên khung SVG. */
const NODE_POSITION: Record<string, { x: number; y: number }> = {
  hub_north: { x: 170, y: 54 },
  hub_haiphong: { x: 262, y: 82 },
  depot_central: { x: 232, y: 168 },
  hub_south: { x: 196, y: 282 },
  depot_bienhoa: { x: 246, y: 258 },
};

const LINKS: Array<[string, string]> = [
  ['hub_north', 'hub_haiphong'],
  ['hub_north', 'depot_central'],
  ['hub_haiphong', 'depot_central'],
  ['depot_central', 'hub_south'],
  ['hub_south', 'depot_bienhoa'],
];

function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
  window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
}

export default function ControlTowerPage() {
  const [twin, setTwin] = useState<ControlTowerData | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initStore();
    try {
      setTwin(getControlTower());
      setShipments(getAll<Shipment[]>('shipments'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load control tower data');
    } finally {
      setLoading(false);
    }
  }, []);

  const activeScenario = useMemo(() => {
    if (!twin?.scenario) return SCENARIOS[0];
    return (
      SCENARIOS.find((row) => row.id === twin.scenario?.id) ?? {
        ...SCENARIOS[0],
        ...twin.scenario,
      }
    );
  }, [twin]);

  const stats = useMemo(() => {
    if (!twin) {
      return { activeShipments: 0, onTimePercent: 0, incidents: 0, fleetSize: 0 };
    }
    const base = twin.stats;
    return {
      activeShipments: Math.max(
        0,
        Math.round(base.activeShipments * (1 + activeScenario.demandDelta / 100)),
      ),
      onTimePercent: Math.max(
        0,
        Math.min(100, Math.round((base.onTimePercent - activeScenario.etaDelta * 0.6) * 10) / 10),
      ),
      incidents: base.incidents + (activeScenario.etaDelta >= 20 ? 3 : activeScenario.etaDelta > 5 ? 1 : 0),
      fleetSize: base.fleetSize,
    };
  }, [twin, activeScenario]);

  const delayedShipments = shipments.filter((row) => row.status === 'DELAYED');

  const applyScenario = (scenario: Scenario) => {
    if (!twin) return;
    const next: ControlTowerData = {
      ...twin,
      scenario: scenario.id === 'baseline' ? null : {
        id: scenario.id,
        name: scenario.name,
        demandDelta: scenario.demandDelta,
        costDelta: scenario.costDelta,
        etaDelta: scenario.etaDelta,
      },
    };
    setTwin(next);
    setControlTower(next);
    showToast(
      scenario.id === 'baseline'
        ? 'Đã trở về kịch bản cơ sở.'
        : `Đang mô phỏng: ${scenario.name}. Số liệu đã cập nhật.`,
      scenario.id === 'baseline' ? 'info' : 'warning',
    );
  };

  const updateNode = (node: NetworkNode, nextStatus: NetworkNode['status']) => {
    if (!twin) return;
    const next: ControlTowerData = {
      ...twin,
      nodes: twin.nodes.map((row) =>
        row.id === node.id ? { ...row, status: nextStatus } : row,
      ),
    };
    setTwin(next);
    setControlTower(next);
    showToast(`${node.name} → ${nextStatus}.`, nextStatus === 'UP' ? 'success' : 'warning');
  };

  return (
    <div className="space-y-6">
      <EditorialPageHeader
        eyebrow="Operations · Digital twin"
        title="Control tower"
        description="Trạng thái mạng lưới hub/depot và tác động của kịch bản what-if lên sản lượng, ETA và sự cố. Mọi thay đổi được lưu vào bản sao số của mạng lưới."
        meta={
          twin ? (
            <StatusLabel tone={activeScenario.id === 'baseline' ? 'success' : 'warning'}>
              {activeScenario.id === 'baseline' ? 'Baseline' : `Scenario: ${activeScenario.name}`}
            </StatusLabel>
          ) : undefined
        }
      />

      <MetricBand
        metrics={[
          {
            label: 'Active shipments',
            value: formatNumber(stats.activeShipments),
            meta:
              activeScenario.demandDelta === 0
                ? 'Theo kế hoạch hiện tại'
                : `${activeScenario.demandDelta > 0 ? '+' : ''}${activeScenario.demandDelta}% demand`,
            tone: activeScenario.demandDelta > 0 ? 'warning' : 'default',
          },
          {
            label: 'On-time',
            value: `${stats.onTimePercent}%`,
            meta: activeScenario.etaDelta === 0 ? 'Trong ngưỡng SLA' : `ETA +${activeScenario.etaDelta}%`,
            tone: stats.onTimePercent < 90 ? 'danger' : 'success',
          },
          {
            label: 'Incidents',
            value: formatNumber(stats.incidents),
            meta: `${delayedShipments.length} shipment đang trễ`,
            tone: stats.incidents > 3 ? 'danger' : stats.incidents > 0 ? 'warning' : 'success',
          },
          {
            label: 'Fleet size',
            value: formatNumber(stats.fleetSize),
            meta: `${twin?.nodes.length ?? 0} hub & depot`,
          },
        ]}
      />

      {error ? (
        <div className="flex items-center gap-3 border-l-2 border-danger bg-surface px-3 py-2">
          <StatusLabel tone="danger">Data error</StatusLabel>
          <span className="text-[12px] text-ink-soft">{error}</span>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <EditorialSection eyebrow="Network" title="Hub & depot">
          {loading ? (
            <p className="text-[12px] text-ink-faint">Đang tải sơ đồ mạng lưới…</p>
          ) : (
            <div className="border border-line bg-canvas">
              <svg
                viewBox="0 0 420 340"
                role="img"
                aria-label="Sơ đồ mạng lưới hub và depot"
                className="h-auto w-full"
              >
                <defs>
                  <pattern id="ct-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#ece6da" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="420" height="340" fill="#f7f3ea" />
                <rect width="420" height="340" fill="url(#ct-grid)" />
                {LINKS.map(([from, to]) => {
                  const a = NODE_POSITION[from];
                  const b = NODE_POSITION[to];
                  if (!a || !b) return null;
                  const fromNode = twin?.nodes.find((row) => row.id === from);
                  const toNode = twin?.nodes.find((row) => row.id === to);
                  const degraded =
                    fromNode?.status !== 'UP' || toNode?.status !== 'UP';
                  return (
                    <line
                      key={`${from}-${to}`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={degraded ? '#a3483f' : '#b9b1a1'}
                      strokeWidth={degraded ? 2 : 1.4}
                      strokeDasharray={degraded ? '5 4' : undefined}
                    />
                  );
                })}
                {(twin?.nodes ?? []).map((node) => {
                  const position = NODE_POSITION[node.id] ?? { x: 210, y: 170 };
                  const color = NODE_COLOR[node.status];
                  return (
                    <g key={node.id}>
                      <circle cx={position.x} cy={position.y} r={16} fill={color} opacity={0.12} />
                      <circle cx={position.x} cy={position.y} r={6} fill={color} />
                      <text
                        x={position.x + 12}
                        y={position.y - 2}
                        fontSize="10"
                        fill="#20241f"
                        fontWeight={600}
                      >
                        {node.name}
                      </text>
                      <text x={position.x + 12} y={position.y + 10} fontSize="9" fill="#6a6e64">
                        {node.type} · {node.load}% load
                      </text>
                    </g>
                  );
                })}
                <text x="16" y="326" fontSize="9" fill="#8a8578">
                  Nét liền: tuyến bình thường · nét đứt: có node suy giảm
                </text>
              </svg>
            </div>
          )}
        </EditorialSection>

        <EditorialSection eyebrow="What-if" title="Kịch bản mô phỏng">
          <div className="divide-y divide-line border-y border-line">
            {SCENARIOS.map((scenario) => {
              const active = activeScenario.id === scenario.id;
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => applyScenario(scenario)}
                  className={`w-full px-3 py-2.5 text-left transition-colors ${
                    active ? 'bg-surface-alt' : 'hover:bg-surface-alt'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-ink">{scenario.name}</span>
                    <StatusLabel tone={active ? 'warning' : 'neutral'}>
                      {active ? 'Đang chạy' : 'Chọn'}
                    </StatusLabel>
                  </div>
                  <p className="mt-0.5 text-[11px] text-ink-soft">{scenario.detail}</p>
                  <p className="mt-0.5 text-[10px] tabular-nums text-ink-faint">
                    Demand {scenario.demandDelta > 0 ? '+' : ''}
                    {scenario.demandDelta}% · Cost +{scenario.costDelta}% · ETA +{scenario.etaDelta}%
                  </p>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-ink-faint">
            Kịch bản chỉ thay đổi bản sao số, không tác động dữ liệu vận hành thật.
          </p>
        </EditorialSection>
      </div>

      <EditorialSection eyebrow="Nodes" title="Tải và trạng thái từng điểm">
        <div className="overflow-x-auto border border-line">
          <table className="min-w-full divide-y divide-line">
            <thead className="bg-surface-alt">
              <tr>
                {['Node', 'Type', 'Load', 'Status', 'Actions'].map((label) => (
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
              {(twin?.nodes ?? []).map((node) => (
                <tr key={node.id} className="hover:bg-surface-alt">
                  <td className="px-3 py-2 font-medium text-ink">{node.name}</td>
                  <td className="px-3 py-2 text-ink-soft">{node.type}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-surface-alt">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, node.load)}%`,
                            background:
                              node.load > 90 ? '#a3483f' : node.load > 75 ? '#8a5d28' : '#3f6b4f',
                          }}
                        />
                      </div>
                      <span className="tabular-nums text-[11px] text-ink-soft">{node.load}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <StatusLabel tone={NODE_STATUS_TONE[node.status]}>{node.status}</StatusLabel>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <div className="flex items-center gap-3 text-[11px]">
                      {node.status !== 'UP' ? (
                        <button
                          type="button"
                          className="font-semibold text-ink-soft hover:text-accent"
                          onClick={() => updateNode(node, 'UP')}
                        >
                          Restore
                        </button>
                      ) : null}
                      {node.status !== 'DEGRADED' ? (
                        <button
                          type="button"
                          className="font-semibold text-ink-soft hover:text-accent"
                          onClick={() => updateNode(node, 'DEGRADED')}
                        >
                          Degrade
                        </button>
                      ) : null}
                      {node.status !== 'DOWN' ? (
                        <button
                          type="button"
                          className="font-semibold text-danger hover:underline"
                          onClick={() => updateNode(node, 'DOWN')}
                        >
                          Mark down
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </EditorialSection>

      <EditorialSection eyebrow="Incidents" title="Shipment cần xử lý">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                {['Tracking #', 'Driver', 'Route', 'Status', 'ETA'].map((label) => (
                  <th
                    key={label}
                    className="h-8 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <TableState
                loading={loading}
                empty={!loading && delayedShipments.length === 0}
                error={error ? new Error(error) : undefined}
                colSpan={5}
                emptyTitle="Không có shipment trễ"
                emptyDescription="Mọi chuyến đang chạy đúng ETA."
              >
                {delayedShipments.map((row) => (
                  <tr key={row.id} className="h-[42px] border-b border-line/80 hover:bg-surface-alt/60">
                    <td className="px-3 text-[12px] font-medium text-ink">{row.trackingNumber}</td>
                    <td className="px-3 text-[12px] text-ink">{row.driver}</td>
                    <td className="px-3 text-[12px] text-ink-soft">
                      {row.origin} → {row.destination}
                    </td>
                    <td className="px-3 text-[12px]">
                      <StatusLabel tone="warning">{row.status}</StatusLabel>
                    </td>
                    <td className="px-3 text-[12px] tabular-nums text-ink-soft">
                      {new Date(row.eta).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </TableState>
            </tbody>
          </table>
        </div>
      </EditorialSection>
    </div>
  );
}
