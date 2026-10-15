'use client';

import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface GoogleLoginButtonProps {
  tenantSlug?: string;
  onError?: (msg: string) => void;
}

export function GoogleLoginButton({ tenantSlug, onError }: GoogleLoginButtonProps) {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

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
          const res = await api.post('/client/auth/google', {
            credential: credentialResponse.credential,
          }, {
            headers: { 'x-tenant-slug': tenantSlug || '' },
          });
          if (res.data?.accessToken) {
            login(res.data.accessToken);
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
