import axios from 'axios';

const showToast = (message: string, type: 'error' | 'warning' | 'info' = 'error') => {
  if (typeof window === 'undefined') return;
  
  const event = new CustomEvent('show-toast', {
    detail: { message, type },
  });
  window.dispatchEvent(event);
};

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Mock data for development when backend is not available
// Also used as fallback when the API returns errors in dev mode.
const mockData: Record<string, any> = {
  '/admin/tenants': {
    data: [
      {
        id: '1',
        name: 'Acme Logistics',
        slug: 'acme-logistics',
        plan: { name: 'Enterprise' },
        maxUsers: 50,
        maxWarehouses: 5,
        createdAt: '2024-01-15T08:30:00Z',
        status: 'ACTIVE',
      },
      {
        id: '2',
        name: 'Global Shipping Inc',
        slug: 'global-shipping',
        plan: { name: 'Pro' },
        maxUsers: 20,
        maxWarehouses: 2,
        createdAt: '2024-03-22T14:15:00Z',
        status: 'PENDING',
      },
      {
        id: '3',
        name: 'FastFreight Partners',
        slug: 'fastfreight-partners',
        plan: { name: 'Free' },
        maxUsers: 5,
        maxWarehouses: 1,
        createdAt: '2024-05-10T09:45:00Z',
        status: 'SUSPENDED',
      },
    ],
    meta: { total: 3, page: 1, limit: 15 },
  },
  '/admin/billing': {
    data: [
      {
        id: 'inv_001',
        tenant: 'Acme Logistics',
        plan: 'Enterprise',
        amount: 299.99,
        issuedAt: '2024-09-01',
        status: 'PAID',
      },
      {
        id: 'inv_002',
        tenant: 'Global Shipping Inc',
        plan: 'Pro',
        amount: 89.99,
        issuedAt: '2024-09-15',
        status: 'DUE',
      },
    ],
    meta: { total: 2, page: 1, limit: 15 },
  },
  '/admin/dashboard/stats': {
    totalTenants: 12,
    totalUsers: 847,
    totalMrr: 28500,
    activeTenants: 9,
    apiCalls: 124560,
    alerts: 2,
    revenueData: [
      { month: 'Apr', amount: 18200 },
      { month: 'May', amount: 19400 },
      { month: 'Jun', amount: 21100 },
      { month: 'Jul', amount: 23500 },
      { month: 'Aug', amount: 25800 },
      { month: 'Sep', amount: 28500 },
    ],
    growthData: [
      { month: 'Apr', tenants: 5 },
      { month: 'May', tenants: 6 },
      { month: 'Jun', tenants: 7 },
      { month: 'Jul', tenants: 8 },
      { month: 'Aug', tenants: 10 },
      { month: 'Sep', tenants: 12 },
    ],
  },
  '/admin/audit-logs': {
    data: [
      {
        id: 'log_001',
        timestamp: '2024-09-15T10:30:00Z',
        actor: 'System Admin',
        actorIP: '192.168.1.100',
        action: 'CREATE',
        resource: 'Tenant',
        target: 'Acme Logistics',
      },
      {
        id: 'log_002',
        timestamp: '2024-09-14T16:45:00Z',
        actor: 'System Admin',
        actorIP: '192.168.1.101',
        action: 'UPDATE',
        resource: 'Billing Plan',
        target: 'Global Shipping Inc',
      },
    ],
    meta: { total: 2, page: 1, limit: 15 },
  },
  // Logistics KPIs — used by the dashboard's logistics section
  '/admin/dashboard/logistics': {
    totalOrders: 1248,
    activeShipments: 34,
    inTransit: 18,
    deliveredToday: 215,
    delayedShipments: 3,
    activeVehicles: 42,
    activeDrivers: 38,
    inventoryAlerts: 7,
    avgOptimization: '92%',
    onTimeDelivery: '87.3%',
    predictedShipments: [
      { day: 'Mon', predicted: 180, actual: 172 },
      { day: 'Tue', predicted: 205, actual: 198 },
      { day: 'Wed', predicted: 192, actual: 201 },
      { day: 'Thu', predicted: 220, actual: 0 },
      { day: 'Fri', predicted: 240, actual: 0 },
      { day: 'Sat', predicted: 180, actual: 0 },
      { day: 'Sun', predicted: 155, actual: 0 },
    ],
  },
  // AI worker models — fallback when the AI worker is not running
  '/ai/v1/models': [
    {
      id: 'demand-v1',
      name: 'demand-regressor',
      version: '1.0.0',
      type: 'demand',
      accuracy: 0.86,
      is_current: true,
      trained_at: '2024-09-10T08:00:00Z',
      model_path: 'models/demand-v1',
      metadata: '{}',
    },
    {
      id: 'delivery-time-v1',
      name: 'delivery-time-regressor',
      version: '1.0.0',
      type: 'delivery_time',
      accuracy: 0.91,
      is_current: true,
      trained_at: '2024-09-08T14:30:00Z',
      model_path: 'models/delivery-time-v1',
      metadata: '{}',
    },
    {
      id: 'churn-v1',
      name: 'churn-classifier',
      version: '1.0.0',
      type: 'churn',
      accuracy: 0.78,
      is_current: false,
      trained_at: '2024-09-05T10:15:00Z',
      model_path: 'models/churn-v1',
      metadata: '{}',
    },
    {
      id: 'anomaly-v1',
      name: 'anomaly-detector',
      version: '1.0.0',
      type: 'anomaly',
      accuracy: 0.93,
      is_current: true,
      trained_at: '2024-09-12T09:45:00Z',
      model_path: 'models/anomaly-v1',
      metadata: '{}',
    },
  ],
  // AI analysis fallback for the dashboard insights section
  '/ai/v1/analyze': {
    ok: true,
    summary: 'Platform is operating within expected parameters. MRR trending upward (+12% over 6 months). 3 delayed shipments require attention in the Southern region.',
    risks: [
      '3 shipments delayed due to weather in Ho Chi Minh City corridor',
      '2 drivers approaching HOS limit in 24h window',
      'Low-stock alert on 7 SKU codes across 3 warehouses',
    ],
    recommendations: [
      'Re-dispatch 3 delayed shipments using alternative routes via AI routing solver',
      'Rebalance driver assignments to respect HOS compliance',
      'Trigger purchase orders for 7 low-stock SKUs',
    ],
  },
};

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('smartlogi_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object' && 'data' in response.data && Array.isArray(response.data.data)) {
      const meta = response.data.meta || response.data.pagination;
      response.data = meta ? { data: response.data.data, meta } : response.data.data;
    }
    return response;
  },
  async (error) => {
    // In development, mock certain API endpoints to avoid console errors
    if (process.env.NODE_ENV === 'development') {
      const config = error.config || {};
      const rawUrl: string = config.url || '';
      const baseURL: string = config.baseURL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
      let path = rawUrl.replace(baseURL, '');
      // Strip query string for mock matching
      const queryIndex = path.indexOf('?');
      if (queryIndex !== -1) {
        path = path.substring(0, queryIndex);
      }

      // Mock for both response errors and network errors
      if (mockData[path]) {
        // Return mock successful response
        return Promise.resolve({ data: mockData[path] });
      }
    }

    if (error?.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('smartlogi_admin_token');
        localStorage.removeItem('smartlogi_admin_user');
        window.location.href = '/admin/login';
      }
      return Promise.reject(error);
    }

    if (error?.response?.status >= 500) {
      showToast('Server error. Please try again later.', 'error');
    }

    return Promise.reject(error);
  }
);

export default api;
