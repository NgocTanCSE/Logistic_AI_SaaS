export const decodeJwt = (token: string): any => {
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

export const getTenantSlug = (): string => {
  if (typeof window === 'undefined') return 'demo-tenant';
  const userStr = window.localStorage.getItem('smartlogi_customer_user');
  if (userStr) {
    const user = JSON.parse(userStr);
    if (user?.slug) return user.slug;
  }
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('tenant') || 'demo-tenant';
};

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('smartlogi_customer_token');
};

export const setToken = (token: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('smartlogi_customer_token', token);
};

export const clearToken = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('smartlogi_customer_token');
};

export const getUser = (): any | null => {
  if (typeof window === 'undefined') return null;
  try {
    const userStr = window.localStorage.getItem('smartlogi_customer_user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

export const setUser = (user: any) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('smartlogi_customer_user', JSON.stringify(user));
};

export const clearUser = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('smartlogi_customer_user');
};

export const clearAuth = () => {
  clearToken();
  clearUser();
};