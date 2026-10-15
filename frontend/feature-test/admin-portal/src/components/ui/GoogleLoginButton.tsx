import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';

interface GoogleLoginButtonProps {
  onSuccess: (credential: string) => void;
  onError?: (error: string) => void;
  loading?: boolean;
  fullWidth?: boolean;
}

export function GoogleLoginButton({
  onSuccess,
  onError,
  loading,
  fullWidth = true,
}: GoogleLoginButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  return (
    <GoogleLogin
      shape="rectangular"
      theme="outline"
      size="large"
      loading={loading}
      fullWidth={fullWidth}
      clientId={clientId}
      onSuccess={(credentialResponse) => {
        if (credentialResponse?.credential) {
          onSuccess(credentialResponse.credential);
        }
      }}
      onError={(error) => {
        onError?.(error?.message || 'Google login failed');
      }}
    />
  );
}
