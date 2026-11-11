'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { EditorialPageHeader, EmptyNote } from 'ui-kit';
import { Input, Button } from 'ui-components';

/** Gửi yêu cầu quên mật khẩu cho nhân viên trạm đóng gói (mã giả / API backend). */

export default function PackStationForgotPassword() {
  const [slug, setSlug] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/tenant/auth/forgot-password', { email }, {
        headers: { 'x-tenant-slug': slug },
      });
      setSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể gửi yêu cầu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6 sm:p-8">
      <div className="w-full max-w-md">
        {sent ? (
          <div className="space-y-4">
            <EditorialPageHeader
              title="Đã gửi email"
              description={
                <em>
                  {email} — nếu tài khoản đăng ký với địa chỉ này, email liên kết đặt
                  lại mật khẩu đã được gửi đến hộp thư.
                </em>
              }
            />
            <EmptyNote>
              Không nhận được? Hãy kiểm tra thư mục spam hoặc yêu cầu lại liên kết.
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
        ) : (
          <div className="space-y-4">
            <EditorialPageHeader
              title="Quên mật khẩu"
              description="Nhập tên workspace và email, chúng tôi sẽ gửi liên kết đặt lại mật khẩu cho bạn."
            />
            {error && (
              <div className="flex items-center gap-2 rounded-md border-l-2 border-danger bg-surface px-3 py-2 text-[12px] text-ink-soft">
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="pack-slug"
                type="text"
                label="Workspace slug"
                placeholder="ví dụ: demo-tenant"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={loading}
              />
              <Input
                id="pack-email"
                type="email"
                label="Email nhân viên"
                placeholder="pack@company.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <Button
                type="submit"
                variant="primary"
                className="h-11 w-full text-[13px] font-semibold rounded-lg"
                disabled={loading}
              >
                {loading ? 'Đang gửi…' : 'Gửi liên kết'}
              </Button>
            </form>
            <div>
              <Link
                href="/login"
                className="text-[12px] font-medium text-ink-soft hover:text-ink"
              >
                Đã nhớ mật khẩu? Về trang đăng nhập
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
