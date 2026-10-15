'use client';

import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { setSession } from '@/lib/auth';

interface GoogleLoginButtonProps {
  tenantSlug?: string;
}

export function GoogleLoginButton({ tenantSlug }: GoogleLoginButtonProps) {
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
            setSession(res.data.accessToken);
            localStorage.setItem('smartlogi_tenant_slug', tenantSlug || '');
            router.replace('/dashboard');
          }
        } catch (err: any) {
          console.error('Google login failed:', err);
        } finally {
          setLoading(false);
        }
      }}
      onError={(error) => {
        console.error('Google login error:', error);
      }}
    />
  );
}
