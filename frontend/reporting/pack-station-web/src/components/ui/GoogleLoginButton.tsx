'use client';

import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import api from '@/lib/api';
import { setToken, setUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface GoogleLoginButtonProps {
  tenantSlug?: string;
  onError?: (msg: string) => void;
}

export function GoogleLoginButton({ tenantSlug, onError }: GoogleLoginButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <GoogleLogin
      shape="rectangular"
      theme="outline"
      size="large"
      loading={loading}
      fullWidth
      onSuccess={async (credentialResponse) => {
        if (!credentialResponse?.credential) return;
        setLoading(true);
        try {
          const res = await api.post('/tenant/auth/google', {
            credential: credentialResponse.credential,
          }, {
            headers: { 'x-tenant-slug': tenantSlug || '' },
          });
          if (res.data?.accessToken) {
            setToken(res.data.accessToken);
            setUser({ role: res.data?.role || 'WAREHOUSE_STAFF', slug: tenantSlug || '' });
            router.push('/dashboard');
          } else {
            onError?.(res.data?.message || 'Google authentication failed');
          }
        } catch (err: any) {
          onError?.(err?.response?.data?.message || 'Google authentication failed');
        } finally {
          setLoading(false);
        }
      }}
      onError={(error) => {
        onError?.('Google login error: ' + (error?.message || 'unknown'));
      }}
    />
  );
}
