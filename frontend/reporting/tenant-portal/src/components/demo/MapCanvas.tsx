'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * MapCanvas — bản đồ vận hành vẽ bằng SVG thuần.
 *
 * Không phụ thuộc Leaflet/Mapbox để bản demo chạy được trên mọi môi trường
 * (kể cả Vercel Hobby) mà không cần thêm dependency. Toạ độ lat/lng được chiếu
 * tuyến tính vào viewBox, phù hợp với phạm vi TP.HCM – Đồng Nai của dữ liệu mẫu.
 */

export type LatLng = [number, number];

export type MarkerKind = 'warehouse' | 'pickup' | 'dropoff' | 'vehicle' | 'sos' | 'checkpoint';

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  kind?: MarkerKind;
  tone?: string;
};

export type MapPolyline = {
  id?: string;
  points: LatLng[];
  color?: string;
  dashed?: boolean;
  width?: number;
};

export type MapPolygon = {
  id?: string;
  points: LatLng[];
  color?: string;
  fill?: string;
  label?: string;
};

export type MapVehicle = {
  id: string;
  label?: string;
  route: LatLng[];
  /** vị trí 0..1 trên lộ trình; nếu bỏ trống sẽ chạy tự động khi animate=true */
  progress?: number;
  tone?: string;
};

export type MapCanvasProps = {
  markers?: MapMarker[];
  polylines?: MapPolyline[];
  polygons?: MapPolygon[];
  vehicles?: MapVehicle[];
  /** chạy mô phỏng xe di chuyển */
  animate?: boolean;
  height?: number;
  className?: string;
  onMarkerClick?: (id: string) => void;
  selectedMarkerId?: string;
  ariaLabel?: string;
};

const DEFAULT_BOUNDS = { minLat: 10.45, maxLat: 11.1, minLng: 106.35, maxLng: 107.25 };

const TONE_COLOR: Record<string, string> = {
  success: '#3f6b4f',
  warning: '#8a5d28',
  danger: '#a3483f',
  info: '#4c6570',
  accent: '#2f4a3c',
  neutral: '#6a6e64',
};

/** Vài trục đường lớn quanh TP.HCM – Đồng Nai để bản đồ có ngữ cảnh. */
const CONTEXT_ROADS: MapPolyline[] = [
  {
    points: [
      [10.98, 106.72],
      [10.9, 106.7],
      [10.82, 106.69],
      [10.76, 106.68],
      [10.7, 106.66],
    ],
  },
  {
    points: [
      [10.96, 106.83],
      [10.88, 106.92],
      [10.79, 107.02],
      [10.66, 107.1],
    ],
  },
  {
    points: [
      [10.72, 106.63],
      [10.8, 106.6],
      [10.9, 106.62],
      [10.97, 106.68],
    ],
  },
  {
    points: [
      [10.85, 106.72],
      [10.84, 106.82],
      [10.82, 106.92],
      [10.8, 106.99],
    ],
  },
];

function computeBounds(points: LatLng[], fallback = DEFAULT_BOUNDS) {
  if (points.length === 0) return fallback;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const [lat, lng] of points) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  if (!Number.isFinite(minLat)) return fallback;
  const padLat = Math.max((maxLat - minLat) * 0.12, 0.015);
  const padLng = Math.max((maxLng - minLng) * 0.12, 0.015);
  return {
    minLat: minLat - padLat,
    maxLat: maxLat + padLat,
    minLng: minLng - padLng,
    maxLng: maxLng + padLng,
  };
}

function pointAtProgress(route: LatLng[], progress: number): LatLng {
  if (route.length === 0) return [0, 0];
  if (route.length === 1) return route[0];
  const clamped = Math.min(1, Math.max(0, progress));
  const totalSegments = route.length - 1;
  const scaled = clamped * totalSegments;
  const index = Math.min(totalSegments - 1, Math.floor(scaled));
  const t = scaled - index;
  const [aLat, aLng] = route[index];
  const [bLat, bLng] = route[index + 1];
  return [aLat + (bLat - aLat) * t, aLng + (bLng - aLng) * t];
}

function normalizeProgress(progress?: number, routeLength?: number) {
  if (typeof progress === 'number' && Number.isFinite(progress)) return progress;
  if (!routeLength || routeLength < 2) return 0;
  return 0;
}

export function MapCanvas({
  markers = [],
  polylines = [],
  polygons = [],
  vehicles = [],
  animate = false,
  height = 420,
  className = '',
  onMarkerClick,
  selectedMarkerId,
  ariaLabel = 'Bản đồ vận hành',
}: MapCanvasProps) {
  const [tick, setTick] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!animate || vehicles.length === 0) return;
    let mounted = true;
    const start = performance.now();
    const loop = (now: number) => {
      if (!mounted) return;
      setTick(((now - start) / 22000) % 1);
      frame.current = requestAnimationFrame(loop);
    };
    frame.current = requestAnimationFrame(loop);
    return () => {
      mounted = false;
      if (frame.current != null) cancelAnimationFrame(frame.current as number);
    };
  }, [animate, vehicles.length]);

  const allPoints = useMemo(() => {
    const points: LatLng[] = [];
    for (const marker of markers) points.push([marker.lat, marker.lng]);
    for (const line of polylines) points.push(...line.points);
    for (const polygon of polygons) points.push(...polygon.points);
    for (const vehicle of vehicles) points.push(...vehicle.route);
    return points;
  }, [markers, polylines, polygons, vehicles]);

  const bounds = useMemo(() => computeBounds(allPoints), [allPoints]);

  const width = 1000;
  const viewHeight = 620;
  const project = (lat: number, lng: number): [number, number] => {
    const x =
      ((lng - bounds.minLng) / Math.max(0.00001, bounds.maxLng - bounds.minLng)) * width;
    const y =
      ((bounds.maxLat - lat) / Math.max(0.00001, bounds.maxLat - bounds.minLat)) * viewHeight;
    return [x, y];
  };

  const projectPoint = (point: LatLng) => project(point[0], point[1]);

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-line bg-canvas ${className}`}
      style={{ height }}
    >
      <svg
        viewBox={`0 0 ${width} ${viewHeight}`}
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={ariaLabel}
        className="h-full w-full"
      >
        <defs>
          <pattern id="map-grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e8e1d6" strokeWidth="1" />
          </pattern>
          <pattern id="map-hatch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#a3483f" strokeWidth="1.4" opacity="0.35" />
          </pattern>
        </defs>

        <rect width={width} height={viewHeight} fill="#f6f3ee" />
        <rect width={width} height={viewHeight} fill="url(#map-grid)" />

        {/* Trục đường ngữ cảnh */}
        {CONTEXT_ROADS.map((road, index) => (
          <polyline
            key={`road-${index}`}
            points={road.points.map((p) => projectPoint(p).join(',')).join(' ')}
            fill="none"
            stroke="#ded7cb"
            strokeWidth={10}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.85}
          />
        ))}
        {CONTEXT_ROADS.map((road, index) => (
          <polyline
            key={`road-core-${index}`}
            points={road.points.map((p) => projectPoint(p).join(',')).join(' ')}
            fill="none"
            stroke="#c9c0b2"
            strokeWidth={1.4}
            strokeDasharray="6 6"
            opacity={0.9}
          />
        ))}

        {/* Geofence / vùng */}
        {polygons.map((polygon, index) => {
          const pts = polygon.points.map((p) => projectPoint(p));
          const d = pts.map((p) => p.join(',')).join(' ');
          const color = polygon.color || '#a3483f';
          return (
            <g key={polygon.id || `poly-${index}`}>
              <polygon
                points={d}
                fill={polygon.fill || 'url(#map-hatch)'}
                stroke={color}
                strokeWidth={1.6}
                strokeDasharray="7 4"
              />
              {polygon.label ? (
                <text
                  x={pts.reduce((sum, p) => sum + p[0], 0) / pts.length}
                  y={pts.reduce((sum, p) => sum + p[1], 0) / pts.length}
                  textAnchor="middle"
                  fontSize="15"
                  fill={color}
                  fontWeight={600}
                >
                  {polygon.label}
                </text>
              ) : null}
            </g>
          );
        })}

        {/* Lộ trình */}
        {polylines.map((line, index) => {
          const d = line.points.map((p) => projectPoint(p).join(',')).join(' ');
          return (
            <polyline
              key={line.id || `line-${index}`}
              points={d}
              fill="none"
              stroke={line.color || '#2f4a3c'}
              strokeWidth={line.width || 3}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={line.dashed ? '8 7' : undefined}
              opacity={0.9}
            />
          );
        })}

        {/* Điểm dừng / kho */}
        {markers.map((marker) => {
          const [x, y] = project(marker.lat, marker.lng);
          const color = marker.tone ? TONE_COLOR[marker.tone] || marker.tone : '#2f4a3c';
          const isSelected = marker.id === selectedMarkerId;
          const kind = marker.kind || 'dropoff';
          const radius = kind === 'warehouse' ? 9 : kind === 'sos' ? 9 : 6;
          return (
            <g
              key={marker.id}
              transform={`translate(${x},${y})`}
              style={{ cursor: onMarkerClick ? 'pointer' : 'default' }}
              onClick={() => onMarkerClick?.(marker.id)}
            >
              {kind === 'sos' ? (
                <circle r={radius + 9} fill={color} opacity={0.18} />
              ) : null}
              {kind === 'warehouse' ? (
                <rect
                  x={-radius}
                  y={-radius}
                  width={radius * 2}
                  height={radius * 2}
                  fill={color}
                  stroke="#fbf9f5"
                  strokeWidth={2}
                  rx={2}
                />
              ) : (
                <circle
                  r={radius}
                  fill={kind === 'dropoff' ? '#fbf9f5' : color}
                  stroke={color}
                  strokeWidth={kind === 'dropoff' ? 2.5 : 2}
                />
              )}
              {isSelected ? (
                <circle r={radius + 6} fill="none" stroke={color} strokeWidth={1.5} opacity={0.7} />
              ) : null}
              {marker.label ? (
                <text
                  x={radius + 6}
                  y={4}
                  fontSize="14"
                  fill="#30332e"
                  fontWeight={isSelected ? 700 : 500}
                >
                  {marker.label}
                </text>
              ) : null}
            </g>
          );
        })}

        {/* Xe đang chạy */}
        {vehicles.map((vehicle, index) => {
          const route = vehicle.route;
          if (route.length === 0) return null;
          const offset = index * 0.18;
          const baseProgress = vehicle.progress ?? 0;
          const progress = animate
            ? (baseProgress + tick + offset) % 1
            : normalizeProgress(vehicle.progress, route.length);
          const position = pointAtProgress(route, progress);
          const [x, y] = project(position[0], position[1]);
          const color = vehicle.tone ? TONE_COLOR[vehicle.tone] || vehicle.tone : '#4c6570';
          return (
            <g key={vehicle.id} transform={`translate(${x},${y})`}>
              <circle r={16} fill={color} opacity={0.14} />
              <circle r={7} fill={color} stroke="#fbf9f5" strokeWidth={2} />
              {vehicle.label ? (
                <text x={12} y={4} fontSize="14" fill="#20241f" fontWeight={600}>
                  {vehicle.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      <div className="pointer-events-none absolute bottom-2 left-3 text-[10px] uppercase tracking-[0.16em] text-ink-faint">
        Bản đồ mô phỏng · TP.HCM – Đồng Nai
      </div>
    </div>
  );
}

export default MapCanvas;
