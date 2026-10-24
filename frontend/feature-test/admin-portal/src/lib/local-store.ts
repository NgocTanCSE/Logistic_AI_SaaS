'use client';

import api from './api';

export type Order = {
  id: string;
  trackingCode: string;
  clientOrderRef: string;
  recipientName: string;
  recipientAddress: string;
  origin: string;
  destination: string;
  status:
    | 'NEW'
    | 'UNASSIGNED'
    | 'PENDING_PICKUP'
    | 'IN_TRANSIT'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'RETURNED'
    | 'RETURN_REQUESTED'
    | 'CANCELLED';
  codAmount: number;
  shippingFee?: number;
  createdAt: string;
  client?: { name?: string };
};

export type Shipment = {
  id: string;
  trackingNumber: string;
  driver: string;
  vehicle: string;
  origin: string;
  destination: string;
  status: 'IN_TRANSIT' | 'DELAYED' | 'DELIVERED' | 'PENDING' | 'OUT_FOR_DELIVERY';
  progress: number;
  eta: string;
  orderId?: string;
};

export type DashboardStats = {
  totalTenants: number;
  totalUsers: number;
  totalMrr: number;
  revenueData: { month: string; amount: number }[];
  growthData: { month: string; tenants: number }[];
};

export type LogisticsData = {
  totalOrders: number;
  activeShipments: number;
  inTransit: number;
  deliveredToday: number;
  delayedShipments: number;
  activeVehicles: number;
  activeDrivers: number;
  inventoryAlerts: number;
  avgOptimization: string;
  onTimeDelivery: string;
  predictedShipments: { day: string; predicted: number; actual: number }[];
};

export type AuditLog = {
  id: string;
  actorEmail?: string;
  actor?: string;
  ip?: string;
  ipAddress?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  resource?: string;
  target?: string;
  createdAt?: string;
  timestamp?: string;
  result?: 'SUCCESS' | 'FAILED';
  [key: string]: any;
};

export type AIModel = {
  id: string;
  name: string;
  version: string;
  type: string;
  accuracy: number | null;
  is_current: boolean;
  trained_at: string;
  model_path: string;
};

export type AIAnalysis = {
  ok: boolean;
  summary: string;
  risks: string[];
  recommendations: string[];
};

export type UserProfile = {
  id?: string;
  email?: string;
  role?: string;
  fullName?: string;
  [key: string]: any;
};

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  plan?: string;
  maxUsers?: number;
  maxWarehouses?: number;
  status?: string;
  createdAt?: string;
  tenant_monthly_orders?: number;
  ordersMonthly?: number;
  [key: string]: any;
};

export type Invoice = {
  id: string;
  tenant: string;
  plan: string;
  amount: number | string;
  issuedAt: string;
  status: 'PAID' | 'DUE' | 'OVERDUE' | string;
  [key: string]: any;
};

export type StoreTable =
  | 'orders'
  | 'shipments'
  | 'dashboardStats'
  | 'logisticsData'
  | 'auditLogs'
  | 'aiModels'
  | 'aiAnalysis'
  | 'adminProfile'
  | 'tenants'
  | 'invoices'

type StoredRecord = { id: string; [key: string]: any };

const PREFIX = 'smartlogi_local_';
const SEED_VERSION_KEY = `${PREFIX}seed_version`;
const SEED_VERSION = '1.4';

const isBrowser = () => typeof window !== 'undefined';

function safeJSONParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeJSONStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Mock seed data — realistic, concise samples that mirror the DB schema.      */
/* These values are written to localStorage on first init and then become the  */
/* client-side "database" that pages read from / write to directly.           */
/* -------------------------------------------------------------------------- */

const SEED_ORDERS: Order[] = [
  {
    id: 'ord_01',
    trackingCode: 'TRK-2024-0847',
    clientOrderRef: 'PO-2024-10847',
    recipientName: 'Acme Logistics Co.',
    recipientAddress: '123 Main St, Hanoi',
    origin: 'Bien Hoa Warehouse',
    destination: 'District 1, Ho Chi Minh City',
    status: 'IN_TRANSIT',
    codAmount: 2450000,
    shippingFee: 85000,
    createdAt: '2024-09-15T10:30:00Z',
    client: { name: 'Acme Logistics' },
  },
  {
    id: 'ord_02',
    trackingCode: 'TRK-2024-0848',
    clientOrderRef: 'PO-2024-10848',
    recipientName: 'Global Shipping Inc.',
    recipientAddress: '456 Harbor Rd, Da Nang',
    origin: 'Ho Chi Minh Hub',
    destination: 'Hai Phong Port',
    status: 'DELIVERED',
    codAmount: 1890000,
    shippingFee: 65000,
    createdAt: '2024-09-14T14:15:00Z',
    client: { name: 'Global Shipping' },
  },
  {
    id: 'ord_03',
    trackingCode: 'TRK-2024-0849',
    clientOrderRef: 'PO-2024-10849',
    recipientName: 'FastFreight Partners',
    recipientAddress: '789 Market St, Can Tho',
    origin: 'Da Nang Distribution Center',
    destination: 'Can Tho Central Warehouse',
    status: 'NEW',
    codAmount: 3200000,
    shippingFee: 120000,
    createdAt: '2024-09-15T08:45:00Z',
    client: { name: 'FastFreight' },
  },
  {
    id: 'ord_04',
    trackingCode: 'TRK-2024-0850',
    clientOrderRef: 'PO-2024-10850',
    recipientName: 'TechCorp Vietnam',
    recipientAddress: '321 Le Duan Blvd, Hanoi',
    origin: 'Bien Hoa Warehouse',
    destination: 'Hanoi Logistics Park',
    status: 'RETURN_REQUESTED',
    codAmount: 5600000,
    shippingFee: 95000,
    createdAt: '2024-09-13T16:00:00Z',
    client: { name: 'TechCorp' },
  },
  {
    id: 'ord_05',
    trackingCode: 'TRK-2024-0851',
    clientOrderRef: 'PO-2024-10851',
    recipientName: 'Mekong Trade Co.',
    recipientAddress: '100 Nguyen Thi Thap, Da Nang',
    origin: 'Ho Chi Minh Hub',
    destination: 'Da Nang Seaport',
    status: 'OUT_FOR_DELIVERY',
    codAmount: 1750000,
    shippingFee: 70000,
    createdAt: '2024-09-15T09:20:00Z',
    client: { name: 'Mekong Trade' },
  },
  {
    id: 'ord_06',
    trackingCode: 'TRK-2024-0852',
    clientOrderRef: 'PO-2024-10852',
    recipientName: 'Northern Distributors',
    recipientAddress: '55 Le Thanh Nghia, Hai Phong',
    origin: 'Hanoi Central Warehouse',
    destination: 'Hai Phong Industrial Zone',
    status: 'DELIVERED',
    codAmount: 980000,
    shippingFee: 45000,
    createdAt: '2024-09-12T11:00:00Z',
    client: { name: 'Northern Distrib.' },
  },
];

const SEED_SHIPMENTS: Shipment[] = [
  {
    id: 'shp_01',
    trackingNumber: 'SHP-2024-0847',
    driver: 'Nguyen Van A',
    vehicle: 'Truck #T001',
    origin: 'Hanoi',
    destination: 'Ho Chi Minh',
    status: 'IN_TRANSIT',
    progress: 65,
    eta: '2024-09-16T18:00:00Z',
    orderId: 'ord_01',
  },
  {
    id: 'shp_02',
    trackingNumber: 'SHP-2024-0848',
    driver: 'Tran Thi B',
    vehicle: 'Truck #T002',
    origin: 'Da Nang',
    destination: 'Hai Phong',
    status: 'IN_TRANSIT',
    progress: 30,
    eta: '2024-09-16T12:00:00Z',
    orderId: 'ord_03',
  },
  {
    id: 'shp_03',
    trackingNumber: 'SHP-2024-0849',
    driver: 'Le Van C',
    vehicle: 'Truck #T003',
    origin: 'Can Tho',
    destination: 'Nha Trang',
    status: 'DELAYED',
    progress: 45,
    eta: '2024-09-18T10:00:00Z',
    orderId: 'ord_04',
  },
  {
    id: 'shp_04',
    trackingNumber: 'SHP-2024-0850',
    driver: 'Pham Thi D',
    vehicle: 'Truck #T004',
    origin: 'Hai Phong',
    destination: 'Da Nang',
    status: 'DELIVERED',
    progress: 100,
    eta: '2024-09-15T09:00:00Z',
    orderId: 'ord_02',
  },
  {
    id: 'shp_05',
    trackingNumber: 'SHP-2024-0851',
    driver: 'Hoang Van E',
    vehicle: 'Truck #T005',
    origin: 'Ho Chi Minh',
    destination: 'Da Nang',
    status: 'OUT_FOR_DELIVERY',
    progress: 85,
    eta: '2024-09-16T08:00:00Z',
    orderId: 'ord_05',
  },
];

const SEED_DASHBOARD_STATS: DashboardStats = {
  totalTenants: 12,
  totalUsers: 847,
  totalMrr: 28500,
  revenueData: [
    { month: 'Jan', amount: 18000 },
    { month: 'Feb', amount: 19500 },
    { month: 'Mar', amount: 21000 },
    { month: 'Apr', amount: 23500 },
    { month: 'May', amount: 25500 },
    { month: 'Jun', amount: 28500 },
  ],
  growthData: [
    { month: 'Jan', tenants: 3 },
    { month: 'Feb', tenants: 4 },
    { month: 'Mar', tenants: 5 },
    { month: 'Apr', tenants: 7 },
    { month: 'May', tenants: 9 },
    { month: 'Jun', tenants: 12 },
  ],
};

const SEED_LOGISTICS_DATA: LogisticsData = {
  totalOrders: 342,
  activeShipments: 34,
  inTransit: 22,
  deliveredToday: 87,
  delayedShipments: 3,
  activeVehicles: 42,
  activeDrivers: 38,
  inventoryAlerts: 7,
  avgOptimization: '18.4%',
  onTimeDelivery: '94.2%',
  predictedShipments: [
    { day: 'Mon', predicted: 52, actual: 48 },
    { day: 'Tue', predicted: 47, actual: 51 },
    { day: 'Wed', predicted: 60, actual: 55 },
    { day: 'Thu', predicted: 55, actual: 58 },
    { day: 'Fri', predicted: 49, actual: 46 },
    { day: 'Sat', predicted: 38, actual: 40 },
    { day: 'Sun', predicted: 35, actual: 32 },
  ],
};

const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud_01',
    actorEmail: 'admin@smartlogi.vn',
    action: 'TENANT_CREATE',
    resourceType: 'tenant',
    resourceId: 'tn_acme',
    createdAt: '2024-09-15T08:30:00Z',
    result: 'SUCCESS',
  },
  {
    id: 'aud_02',
    actorEmail: 'ops@smartlogi.vn',
    action: 'SHIPMENT_ASSIGN',
    resourceType: 'shipment',
    resourceId: 'shp_01',
    createdAt: '2024-09-15T09:15:00Z',
    result: 'SUCCESS',
  },
  {
    id: 'aud_03',
    actorEmail: 'ops@smartlogi.vn',
    action: 'ROUTE_OPTIMIZE',
    resourceType: 'trip',
    resourceId: 'trip_42',
    createdAt: '2024-09-15T10:00:00Z',
    result: 'SUCCESS',
  },
  {
    id: 'aud_04',
    actorEmail: 'billing@smartlogi.vn',
    action: 'BILLING_INVOICE_GENERATE',
    resourceType: 'invoice',
    resourceId: 'inv_88',
    createdAt: '2024-09-15T11:20:00Z',
    result: 'SUCCESS',
  },
  {
    id: 'aud_05',
    actorEmail: 'ops@smartlogi.vn',
    action: 'SHIPMENT_UPDATE_STATUS',
    resourceType: 'shipment',
    resourceId: 'shp_03',
    createdAt: '2024-09-15T14:45:00Z',
    result: 'FAILED',
  },
];

const SEED_TENANTS: Tenant[] = [
  {
    id: 'tnnt_01',
    name: 'Acme Logistics Co.',
    slug: 'acme-logistics',
    plan: 'Enterprise',
    maxUsers: 50,
    maxWarehouses: 12,
    status: 'ACTIVE',
    createdAt: '2024-06-15T08:30:00Z',
    ordersMonthly: 1248,
  },
  {
    id: 'tnnt_02',
    name: 'Global Shipping Inc.',
    slug: 'global-shipping',
    plan: 'Pro',
    maxUsers: 25,
    maxWarehouses: 5,
    status: 'ACTIVE',
    createdAt: '2024-07-22T10:15:00Z',
    ordersMonthly: 856,
  },
  {
    id: 'tnnt_03',
    name: 'FastFreight Partners',
    slug: 'fastfreight-partners',
    plan: 'Pro',
    maxUsers: 25,
    maxWarehouses: 5,
    status: 'PENDING',
    createdAt: '2024-08-05T14:20:00Z',
    ordersMonthly: 324,
  },
  {
    id: 'tnnt_04',
    name: 'TechCorp Vietnam',
    slug: 'techcorp-vn',
    plan: 'Enterprise',
    maxUsers: 50,
    maxWarehouses: 8,
    status: 'ACTIVE',
    createdAt: '2024-05-30T09:45:00Z',
    ordersMonthly: 2103,
  },
  {
    id: 'tnnt_05',
    name: 'Mekong Trade Co.',
    slug: 'mekong-trade',
    plan: 'Starter',
    maxUsers: 10,
    maxWarehouses: 2,
    status: 'SUSPENDED',
    createdAt: '2024-03-12T16:00:00Z',
    ordersMonthly: 142,
  },
];

const SEED_INVOICES: Invoice[] = [
  {
    id: 'inv_0001',
    tenant: 'Acme Logistics Co.',
    plan: 'Enterprise',
    amount: '$2,490.00',
    issuedAt: '2024-09-01',
    status: 'PAID',
  },
  {
    id: 'inv_0002',
    tenant: 'Global Shipping Inc.',
    plan: 'Pro',
    amount: '$990.00',
    issuedAt: '2024-09-05',
    status: 'PAID',
  },
  {
    id: 'inv_0003',
    tenant: 'TechCorp Vietnam',
    plan: 'Enterprise',
    amount: '$2,490.00',
    issuedAt: '2024-09-10',
    status: 'DUE',
  },
  {
    id: 'inv_0004',
    tenant: 'FastFreight Partners',
    plan: 'Pro',
    amount: '$990.00',
    issuedAt: '2024-09-12',
    status: 'PAID',
  },
  {
    id: 'inv_0005',
    tenant: 'Mekong Trade Co.',
    plan: 'Starter',
    amount: '$290.00',
    issuedAt: '2024-08-28',
    status: 'OVERDUE',
  },
];

const SEED_AI_MODELS: AIModel[] = [
  {
    id: 'model_01',
    name: 'Demand Forecast',
    version: 'v2.3.1',
    type: 'demand',
    accuracy: 0.94,
    is_current: true,
    trained_at: '2024-09-10T03:00:00Z',
    model_path: 'models/demand/v2.3.1',
  },
  {
    id: 'model_02',
    name: 'Delivery Time Predictor',
    version: 'v1.8.4',
    type: 'delivery-time',
    accuracy: 0.89,
    is_current: true,
    trained_at: '2024-09-08T03:00:00Z',
    model_path: 'models/delivery/v1.8.4',
  },
  {
    id: 'model_03',
    name: 'Churn Detector',
    version: 'v3.0.2',
    type: 'churn',
    accuracy: 0.81,
    is_current: false,
    trained_at: '2024-09-05T03:00:00Z',
    model_path: 'models/churn/v3.0.2',
  },
  {
    id: 'model_04',
    name: 'Anomaly Detector',
    version: 'v1.2.0',
    type: 'anomaly',
    accuracy: 0.93,
    is_current: true,
    trained_at: '2024-09-12T03:00:00Z',
    model_path: 'models/anomaly/v1.2.0',
  },
];

const SEED_AI_ANALYSIS: AIAnalysis = {
  ok: true,
  summary:
    'Platform is operating within normal parameters. 3 shipments are delayed beyond their SLA thresholds, concentrated in the Northern region. Overall on-time delivery rate is 94.2%, above the 90% target. AI route optimization is saving an average of 18.4% in mileage.',
  risks: [
    '3 delayed shipments in the Northern cluster may cause customer escalations.',
    'Fuel price volatility has increased operating costs by 7% week-over-week.',
    'Two vehicles are overdue for maintenance, risking unplanned downtime.',
  ],
  recommendations: [
    'Reassign delayed shipments to nearby available drivers to meet ETA.',
    'Schedule preventive maintenance for vehicles T003 and T005 within 48 hours.',
    'Activate the Churn Detector model to proactively identify at-risk tenant accounts.',
  ],
};

const SEED_ADMIN_PROFILE: UserProfile = {
  id: 'current',
  email: 'admin@smartlogi.com',
  role: 'SUPER_ADMIN',
  fullName: 'Admin User',
};

const SEED_DATA: Record<StoreTable, any> = {
  orders: SEED_ORDERS,
  shipments: SEED_SHIPMENTS,
  dashboardStats: SEED_DASHBOARD_STATS,
  logisticsData: SEED_LOGISTICS_DATA,
  auditLogs: SEED_AUDIT_LOGS,
  aiModels: SEED_AI_MODELS,
  aiAnalysis: SEED_AI_ANALYSIS,
  adminProfile: SEED_ADMIN_PROFILE,
  tenants: SEED_TENANTS,
  invoices: SEED_INVOICES,
};

/* -------------------------------------------------------------------------- */
/* Public store API                                                           */
/* -------------------------------------------------------------------------- */

function tableKey(table: StoreTable): string {
  return `${PREFIX}${table}`;
}

export function initStore(): void {
  if (!isBrowser()) return;
  const currentVersion = window.localStorage.getItem(SEED_VERSION_KEY);
  if (currentVersion === SEED_VERSION) return;

  const now = Date.now();
  Object.entries(SEED_DATA).forEach(([table, data]) => {
    const records = Array.isArray(data)
      ? data.map((item) => ({ ...item, updatedAt: now }))
      : { ...data, updatedAt: now };
    const existing = window.localStorage.getItem(tableKey(table as StoreTable));
    if (!existing) {
      window.localStorage.setItem(tableKey(table as StoreTable), safeJSONStringify(records) ?? '{}');
    }
  });

  window.localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
}

function ensureInitialized(): void {
  if (!isBrowser()) return;
  initStore();
}

export function getAll<T = any[]>(table: StoreTable): T {
  ensureInitialized();
  if (!isBrowser()) return ([] as unknown) as T;
  const raw = window.localStorage.getItem(tableKey(table));
  const parsed = safeJSONParse<any[]>(raw);
  if (Array.isArray(parsed)) return parsed as T;
  if (parsed && !Array.isArray(parsed)) return parsed as T;
  return ([] as unknown) as T;
}

export function getOne(table: StoreTable, id: string): StoredRecord | null {
  ensureInitialized();
  const list = getAll<any>(table);
  if (Array.isArray(list)) {
    return list.find((item) => item.id === id) || null;
  }
  if (list && typeof list === 'object' && (list as StoredRecord).id === id) {
    return list as StoredRecord;
  }
  return null;
}

export function create(table: StoreTable, item: StoredRecord): StoredRecord {
  ensureInitialized();
  if (!isBrowser()) return item;
  const list = getAll<StoredRecord[]>(table);
  const now = Date.now();
  const record: StoredRecord = { ...item, id: item.id || `tmp_${now}`, createdAt: now, updatedAt: now };
  list.push(record);
  window.localStorage.setItem(tableKey(table), safeJSONStringify(list) ?? '[]');
  tryAPI(table, 'POST', record);
  return record;
}

export function update(table: StoreTable, id: string, data: Partial<StoredRecord>): StoredRecord | null {
  ensureInitialized();
  if (!isBrowser()) return null;
  const list = getAll<StoredRecord[]>(table);
  const index = list.findIndex((item) => item.id === id);
  if (index === -1) return null;
  const record = { ...list[index], ...data, id, updatedAt: Date.now() };
  list[index] = record;
  window.localStorage.setItem(tableKey(table), safeJSONStringify(list) ?? '[]');
  tryAPI(table, 'PATCH', record);
  return record;
}

export function remove(table: StoreTable, id: string): boolean {
  ensureInitialized();
  if (!isBrowser()) return false;
  const list = getAll<StoredRecord[]>(table);
  const index = list.findIndex((item) => item.id === id);
  if (index === -1) return false;
  list.splice(index, 1);
  window.localStorage.setItem(tableKey(table), safeJSONStringify(list) ?? '[]');
  tryAPI(table, 'DELETE', { id });
  return true;
}

export function replaceAll(table: StoreTable, data: StoredRecord[]): void {
  ensureInitialized();
  if (!isBrowser()) return;
  const now = Date.now();
  const records = data.map((item) => ({ ...item, updatedAt: now }));
  window.localStorage.setItem(tableKey(table), safeJSONStringify(records) ?? '[]');
}

/* -------------------------------------------------------------------------- */
/* API sync — best-effort: try the backend DB, fall back to localStorage.      */
/* -------------------------------------------------------------------------- */

async function tryAPI(table: StoreTable, method: 'POST' | 'PATCH' | 'DELETE', payload: any): Promise<void> {
  if (!isBrowser()) return;
  const token = window.localStorage.getItem('smartlogi_admin_token');
  if (!token) return;

  const endpointMap: Record<StoreTable, string> = {
    orders: '/orders',
    shipments: '/logistics/shipments',
    dashboardStats: '/admin/dashboard/stats',
    logisticsData: '/admin/dashboard/logistics',
    auditLogs: '/admin/audit-logs',
    aiModels: '/ai/v1/models',
    aiAnalysis: '/ai/v1/analyze',
    adminProfile: '/admin/auth/profile',
    tenants: '/admin/tenants',
    invoices: '/admin/billing',
  };

  const endpoint = endpointMap[table];
  if (!endpoint) return;

  try {
    const id = (payload && payload.id) || '';
    const url = method === 'DELETE' ? `${endpoint}/${id}` : method === 'PATCH' ? `${endpoint}/${id}` : endpoint;
    await api.request({ method, url, data: payload });
  } catch {
    /* Backend unavailable — data is already persisted in localStorage. */
  }
}

/* -------------------------------------------------------------------------- */
/* fetchFromStoreOrAPI — read from localStorage first, optionally refresh.     */
/* -------------------------------------------------------------------------- */

export async function fetchFromStoreOrAPI<T = any>(
  table: StoreTable,
  endpoint: string,
  options?: { forceRemote?: boolean },
): Promise<T> {
  ensureInitialized();

  if (!options?.forceRemote) {
    const local = getAll<T>(table);
    if (local && (Array.isArray(local) ? local.length > 0 : true)) {
      return local;
    }
  }

  try {
    const response = await api.get(endpoint);
    const data = response.data?.data ?? response.data;
    const records = Array.isArray(data) ? data : [data];
    if (records.length > 0 || table === 'dashboardStats' || table === 'logisticsData' || table === 'aiAnalysis') {
      const normalized = table === 'dashboardStats' || table === 'logisticsData' || table === 'aiAnalysis'
        ? data ?? records
        : records;
      const existing = getAll<any[]>(table);
      if (Array.isArray(normalized)) {
        replaceAll(table, normalized);
      } else if (normalized && typeof normalized === 'object') {
        window.localStorage.setItem(tableKey(table), safeJSONStringify({ ...normalized, updatedAt: Date.now() }) ?? '{}');
      }
      return (Array.isArray(normalized) ? normalized : normalized) as T;
    }
    return records as T;
  } catch {
    return getAll<T>(table);
  }
}
