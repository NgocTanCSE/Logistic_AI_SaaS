'use client';
import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function ForgotPasswordPage() {
  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !tenantSlug) {
      setError('Vui lòng điền đầy đủ các trường bắt buộc.');
      return;
    }
    setLoading(true);
    try {
      await api.post(
        '/tenant/auth/forgot-password',
        { email },
        { headers: { 'x-tenant-slug': tenantSlug } }
      );
      setSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể xử lý yêu cầu.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-background relative flex items-center justify-center p-6 overflow-hidden">
        <div className="absolute inset-0  pointer-events-none"></div>
        <Card className="p-8 md:p-10 w-full max-w-md border border-line bg-surface">
          <div className="w-14 h-14 rounded-full bg-success/10 border border-success/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-success">&#10003;</span>
          </div>
          <h1 className="text-2xl font-bold text-ink mb-2">Kiểm tra email</h1>
          <p className="text-inkSoft mb-6">
            Nếu tài khoản với <strong>{email}</strong> tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu.
          </p>
          <Link href="/login" className="text-primary hover:text-primary-600 font-semibold text-sm transition-colors">
            Quay lại đăng nhập
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0  pointer-events-none"></div>

      <Card className="p-8 md:p-10 w-full max-w-md border border-line bg-surface">
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary mb-2">Đặt lại mật khẩu</p>
          <h2 className="text-2xl font-bold text-ink">Quên mật khẩu?</h2>
          <p className="text-sm text-inkSoft mt-1.5 font-medium">Nhập mã workspace và email để nhận liên kết đặt lại mật khẩu.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Mã workspace"
            type="text"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            placeholder="vd: ten-phan-quyen"
            required

          />

          <Input
            label="Địa chỉ email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ten@cong-ty.vn"
            required

          />

          {error && (
            <div className="border-l-2 border-danger bg-surface px-4 py-3 text-sm text-danger font-medium">
              
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2 font-bold tracking-wide"
            isLoading={loading}
          >
            Gửi liên kết đặt lại mật khẩu
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-xs text-inkSoft hover:text-primary font-semibold transition-colors">
            Quay lại đăng nhập
          </Link>
        </div>
      </Card>
    </div>
  );
}
