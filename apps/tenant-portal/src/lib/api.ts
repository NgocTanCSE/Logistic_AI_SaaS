import axios from 'axios';

const showToast = (message: string, type: 'error' | 'warning' | 'info' = 'error') => {
  if (typeof window === 'undefined') return;
  
  const event = new CustomEvent('show-toast', {
    detail: { message, type },
  });
  window.dispatchEvent(event);
};

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('smartlogi_tenant_token');
    const userStr = localStorage.getItem('smartlogi_tenant_user');
    const slugStr = localStorage.getItem('smartlogi_tenant_slug');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user?.tenantId) {
          config.headers['X-Tenant-ID'] = user.tenantId;
        }
      } catch (e) {
        console.error('Failed to parse tenant_user from localStorage:', e);
      }
    }
    if (slugStr) {
      config.headers['x-tenant-slug'] = slugStr;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {

    if (error?.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('smartlogi_tenant_token');
        localStorage.removeItem('smartlogi_tenant_user');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    if (error?.response?.status === 409) {
      showToast('Data has been modified by another user. Please reload.', 'warning');
      return Promise.reject(error);
    }

    if (error?.response?.status >= 500) {
      showToast('Server error. Please try again later.', 'error');
    }

    return Promise.reject(error);
  }
);

export default api;
