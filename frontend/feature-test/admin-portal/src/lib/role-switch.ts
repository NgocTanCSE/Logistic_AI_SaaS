/**
 * Local role-switch utility for the admin portal.
 * This is a development/testing helper that swaps the active role in
 * localStorage without hitting the backend. It updates the stored user
 * object so that role-gated UI sections react immediately.
 */
const USER_KEY = 'smartlogi_admin_user';
const TOKEN_KEY = 'smartlogi_admin_token';

/**
 * Decode a JWT token's payload without verifying the signature (browser-only).
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(normalized);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Re-encode a JWT payload into a base64url string (header.payload.signature).
 * We keep the original signature — this is intentionally a client-only
 * shim so the mock role-switch works without a backend round-trip.
 */
function reEncodeToken(token: string, role: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = decodeJwtPayload(token);
    if (!payload) return null;
    payload.role = role;
    const newPayload = btoa(JSON.stringify(payload))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    // Keep original signature — signature won't match, but the frontend
    // reads the user object from localStorage, not the token, for display.
    return `${parts[0]}.${newPayload}.${parts[2] || ''}`;
  } catch {
    return null;
  }
}

/**
 * Switch the current user's role.
 * Updates both the stored token payload and the localStorage user object.
 * Returns `true` on success, `false` on failure.
 */
export async function switchRole(newRole: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const userRaw = window.localStorage.getItem(USER_KEY);
  const token = window.localStorage.getItem(TOKEN_KEY);

  if (!userRaw) return false;

  try {
    const user = JSON.parse(userRaw);
    user.role = newRole;
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));

    if (token) {
      const newToken = reEncodeToken(token, newRole);
      if (newToken) {
        window.localStorage.setItem(TOKEN_KEY, newToken);
      }
    }

    // Dispatch a storage event so other tabs/components can react.
    window.dispatchEvent(new StorageEvent('storage', {
      key: USER_KEY,
      newValue: JSON.stringify(user),
    }));

    return true;
  } catch {
    return false;
  }
}

/**
 * Get the current role from localStorage (client-only).
 */
export function getCurrentRole(): string | null {
  if (typeof window === 'undefined') return null;
  const userRaw = window.localStorage.getItem(USER_KEY);
  if (!userRaw) return null;
  try {
    const user = JSON.parse(userRaw);
    return user.role || null;
  } catch {
    return null;
  }
}
