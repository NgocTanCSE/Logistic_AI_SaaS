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
const mockData = {
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
  '/admin/audit-logs': {
    data: [
      {
        id: 'log_001',
        timestamp: '2024-09-15T10:30:00Z',
        actorIP: '192.168.1.100',
        action: 'CREATE',
        resource: 'Tenant',
        target: 'Acme Logistics',
      },
      {
        id: 'log_002',
        timestamp: '2024-09-14T16:45:00Z',
        actorIP: '192.168.1.101',
        action: 'UPDATE',
        resource: 'Billing Plan',
        target: 'Global Shipping Inc',
      },
    ],
    meta: { total: 2, page: 1, limit: 15 },
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
      const { method, url } = error.config;
      const path = url.replace(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1', '');
      
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
