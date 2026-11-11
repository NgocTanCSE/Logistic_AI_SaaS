'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { EditorialPageHeader, EmptyNote } from 'ui-kit';
import { Input, Button } from 'ui-components';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';
  const slug = searchParams.get('slug') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Mật khẩu mới không khớp.');
      return;
    }
    if (password.length < 8) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/tenant/auth/reset-password', { email, token, password }, {
        headers: { 'x-tenant-slug': slug },
      });
      if (res.data?.ok) {
        setSuccess(true);
      } else {
        setError(res.data?.message || 'Không thể đặt lại mật khẩu.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Liên kết đã hết hạn, vui lòng yêu cầu lại.');
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="space-y-4">
        <EditorialPageHeader
          title="Liên kết không hợp lệ"
          description="Liên kết đặt lại mật khẩu này đã hết hạn hoặc không hợp lệ."
        />
        <EmptyNote>
          Vui lòng yêu cầu một liên kết đặt lại mật khẩu mới.
        </EmptyNote>
        <div>
          <Link
            href="/forgot-password"
            className="text-[12px] font-medium text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
          >
            Yêu cầu liên kết đặt lại mật khẩu mới
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-4">
        <EditorialPageHeader
          title="Đã đặt lại mật khẩu"
          description="Mật khẩu của bạn đã được cập nhật. Hãy đăng nhập lại."
        />
        <EmptyNote>
          Liên kết này chỉ sử dụng được một lần.
        </EmptyNote>
        <div>
          <Link
            href="/login"
            className="text-[12px] font-medium text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
          >
            Về trang đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <EditorialPageHeader
        title="Đặt lại mật khẩu"
        description={`Đặt lại mật khẩu cho tài khoản ${email}.`}
      />
      {error && (
        <div className="flex items-center gap-2 rounded-md border-l-2 border-danger bg-surface px-3 py-2 text-[12px] text-ink-soft">
          <span>{error}</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="password"
          label="Mật khẩu mới"
          placeholder="Tối thiểu 8 ký tự"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
        <Input
          type="password"
          label="Xác nhận mật khẩu mới"
          placeholder="Nhập lại mật khẩu"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
        />
        <Button
          type="submit"
          variant="primary"
          className="h-11 w-full text-[13px] font-semibold rounded-lg"
          disabled={loading}
        >
          {loading ? 'Đang đặt lại…' : 'Đặt lại mật khẩu'}
        </Button>
      </form>
      <div>
        <Link
          href="/forgot-password"
          className="text-[12px] font-medium text-ink-soft hover:text-ink"
        >
          Yêu cầu liên kết đặt lại mật khẩu mới
        </Link>
      </div>
    </div>
  );
}

export default function PackStationResetPassword() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6 sm:p-8">
      <div className="w-full max-w-md">
        <Suspense fallback={<div className="text-ink-soft text-center py-8">Đang tải...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
