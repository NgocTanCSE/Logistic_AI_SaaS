'use client';

import { useMemo } from 'react';

/**
 * Bộ biểu đồ SVG thuần cho các trang demo AI.
 *
 * Tenant portal không có `recharts` (không thêm dependency), nên các biểu đồ
 * dự báo / bất thường được vẽ trực tiếp bằng SVG để vẫn chạy trên host tĩnh.
 */

export type SeriesPoint = {
  label: string;
  value: number;
  forecast?: number;
  tone?: 'default' | 'accent' | 'warning' | 'danger' | 'success';
};

const COLOR: Record<string, string> = {
  default: '#6a6e64',
  accent: '#2f4a3c',
  warning: '#8a5d28',
  danger: '#a3483f',
  success: '#3f6b4f',
  ink: '#20241f',
  line: '#ded7cb',
};

/** Cột thực tế + đường dự báo (demand forecast). */
export function BarSeries({
  data,
  height = 240,
  unit = '',
  formatter = (value: number) => String(Math.round(value)),
}: {
  data: SeriesPoint[];
  height?: number;
  unit?: string;
  formatter?: (value: number) => string;
}) {
  const width = 720;
  const padding = { top: 16, right: 16, bottom: 34, left: 48 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const values = data.flatMap((point) => [point.value, point.forecast ?? point.value]);
  const max = Math.max(1, ...values) * 1.12;
  const step = innerW / Math.max(1, data.length);
  const barWidth = Math.min(38, step * 0.52);

  const linePoints = data
    .map((point, index) => {
      const value = point.forecast ?? point.value;
      const x = padding.left + step * index + step / 2;
      const y = padding.top + innerH - (value / max) * innerH;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label="Biểu đồ dự báo nhu cầu"
    >
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = padding.top + innerH * ratio;
        const value = max * (1 - ratio);
        return (
          <g key={ratio}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke={COLOR.line}
              strokeWidth={1}
              strokeDasharray={ratio === 0 ? undefined : '4 4'}
            />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="12" fill="#8a8174">
              {formatter(value)}
            </text>
          </g>
        );
      })}

      {data.map((point, index) => {
        const x = padding.left + step * index + step / 2;
        const barHeight = (point.value / max) * innerH;
        const isForecast = point.forecast !== undefined && point.forecast !== point.value;
        const fill = isForecast ? COLOR.warning : COLOR.accent;
        return (
          <g key={point.label}>
            <rect
              x={x - barWidth / 2}
              y={padding.top + innerH - barHeight}
              width={barWidth}
              height={Math.max(2, barHeight)}
              fill={fill}
              opacity={isForecast ? 0.35 : 0.85}
              rx={2}
            />
            <text x={x} y={height - 12} textAnchor="middle" fontSize="12" fill="#62665c">
              {point.label}
            </text>
          </g>
        );
      })}

      <polyline points={linePoints} fill="none" stroke={COLOR.warning} strokeWidth={2.5} />
      {data.map((point, index) => {
        const value = point.forecast ?? point.value;
        const x = padding.left + step * index + step / 2;
        const y = padding.top + innerH - (value / max) * innerH;
        return <circle key={`dot-${point.label}`} cx={x} cy={y} r={3.4} fill={COLOR.warning} />;
      })}

      <text x={padding.left} y={16} fontSize="12" fill="#62665c">
        {unit ? `Đơn vị: ${unit}` : ''}
      </text>
    </svg>
  );
}

/** Đường xu hướng đơn giản. */
export function LineSeries({
  data,
  height = 180,
  color = COLOR.accent,
  formatter = (value: number) => String(Math.round(value)),
}: {
  data: SeriesPoint[];
  height?: number;
  color?: string;
  formatter?: (value: number) => string;
}) {
  const width = 720;
  const padding = { top: 14, right: 14, bottom: 28, left: 44 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = Math.max(1, ...data.map((point) => point.value)) * 1.1;
  const step = innerW / Math.max(1, data.length - 1);
  const points = data
    .map((point, index) => {
      const x = padding.left + step * index;
      const y = padding.top + innerH - (point.value / max) * innerH;
      return `${x},${y}`;
    })
    .join(' ');
  const area = `${padding.left},${padding.top + innerH} ${points} ${padding.left + innerW},${
    padding.top + innerH
  }`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Biểu đồ xu hướng">
      <polygon points={area} fill={color} opacity={0.08} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={2.5} />
      {data.map((point, index) => {
        const x = padding.left + step * index;
        const y = padding.top + innerH - (point.value / max) * innerH;
        return (
          <g key={point.label}>
            <circle cx={x} cy={y} r={3} fill={color} />
            <text x={x} y={height - 8} textAnchor="middle" fontSize="11" fill="#62665c">
              {point.label}
            </text>
          </g>
        );
      })}
      <text x={padding.left - 8} y={padding.top + 4} textAnchor="end" fontSize="11" fill="#8a8174">
        {formatter(max)}
      </text>
      <line
        x1={padding.left}
        x2={width - padding.right}
        y1={padding.top + innerH}
        y2={padding.top + innerH}
        stroke={COLOR.line}
      />
    </svg>
  );
}

export type ScatterPoint = {
  x: number;
  y: number;
  label?: string;
  anomaly?: boolean;
};

/** Biểu đồ phân tán cho phát hiện bất thường (isolation forest mô phỏng). */
export function ScatterPlot({
  points,
  height = 260,
  xLabel = 'Phí vận chuyển (₫)',
  yLabel = 'Giá trị COD (₫)',
  formatter = (value: number) => String(Math.round(value)),
}: {
  points: ScatterPoint[];
  height?: number;
  xLabel?: string;
  yLabel?: string;
  formatter?: (value: number) => string;
}) {
  const width = 720;
  const padding = { top: 18, right: 18, bottom: 46, left: 66 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const xs = points.map((point) => point.x).concat(1);
  const ys = points.map((point) => point.y).concat(1);
  const minX = Math.min(...xs) * 0.9;
  const maxX = Math.max(...xs) * 1.05;
  const minY = Math.min(...ys) * 0.9;
  const maxY = Math.max(...ys) * 1.05;

  const project = (x: number, y: number): [number, number] => [
    padding.left + ((x - minX) / Math.max(1, maxX - minX)) * innerW,
    padding.top + innerH - ((y - minY) / Math.max(1, maxY - minY)) * innerH,
  ];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Biểu đồ phân tán bất thường">
      {[0, 0.5, 1].map((ratio) => (
        <line
          key={ratio}
          x1={padding.left}
          x2={width - padding.right}
          y1={padding.top + innerH * ratio}
          y2={padding.top + innerH * ratio}
          stroke={COLOR.line}
          strokeDasharray="4 4"
        />
      ))}
      {points.map((point, index) => {
        const [x, y] = project(point.x, point.y);
        return (
          <g key={`${point.label || 'p'}-${index}`}>
            <circle
              cx={x}
              cy={y}
              r={point.anomaly ? 7 : 4.5}
              fill={point.anomaly ? COLOR.danger : COLOR.accent}
              opacity={point.anomaly ? 0.85 : 0.55}
              stroke={point.anomaly ? COLOR.danger : 'none'}
              strokeWidth={point.anomaly ? 2 : 0}
            />
            {point.anomaly && point.label ? (
              <text x={x + 11} y={y + 4} fontSize="12" fill={COLOR.danger} fontWeight={600}>
                {point.label}
              </text>
            ) : null}
          </g>
        );
      })}
      <text x={width / 2} y={height - 8} textAnchor="middle" fontSize="12" fill="#62665c">
        {xLabel}
      </text>
      <text
        x={14}
        y={padding.top + innerH / 2}
        textAnchor="middle"
        fontSize="12"
        fill="#62665c"
        transform={`rotate(-90 14 ${padding.top + innerH / 2})`}
      >
        {yLabel}
      </text>
      <text x={padding.left} y={padding.top - 6} fontSize="11" fill="#8a8174">
        {formatter(maxY)}
      </text>
    </svg>
  );
}

/** Thanh sức chứa bin (putaway / tồn kho). */
export function CapacityBar({
  used,
  total,
  label,
  unit = '',
  tone = 'accent',
}: {
  used: number;
  total: number;
  label?: string;
  unit?: string;
  tone?: 'accent' | 'warning' | 'danger' | 'success';
}) {
  const ratio = total <= 0 ? 0 : Math.min(1, Math.max(0, used / total));
  const color = COLOR[tone];
  return (
    <div className="w-full">
      {label ? (
        <div className="mb-1 flex items-center justify-between text-[11px] text-ink-faint">
          <span>{label}</span>
          <span className="tabular-nums">
            {Math.round(used * 100) / 100}/{Math.round(total * 100) / 100}
            {unit ? ` ${unit}` : ''}
          </span>
        </div>
      ) : null}
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-alt">
        <div className="h-full rounded-full" style={{ width: `${ratio * 100}%`, background: color }} />
      </div>
    </div>
  );
}

export default BarSeries;
