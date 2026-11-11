'use client';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';
  const tenantSlug = searchParams.get('slug') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Hai mật khẩu không khớp.');
      return;
    }
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(
        '/tenant/auth/reset-password',
        { email, token, password },
        { headers: { 'x-tenant-slug': tenantSlug || 'demo-tenant' } }
      );
      if (res.data?.ok) {
        setSuccess(true);
      } else {
        setError(res.data?.message || 'Không đặt lại được mật khẩu.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Token không hợp lệ hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-danger/10 border border-danger/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-danger">&#8718;</span>
        </div>
        <h1 className="text-2xl font-bold text-ink mb-2">Liên kết không hợp lệ</h1>
        <p className="text-inkSoft mb-6">Liên kết đặt lại mật khẩu này không hợp lệ hoặc đã hết hạn.</p>
        <Link href="/forgot-password" className="text-primary hover:text-primary-600 font-semibold text-sm">
          Yêu cầu lại liên kết đặt lại mật khẩu
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-success/10 border border-success/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-success">&#10003;</span>
        </div>
        <h1 className="text-2xl font-bold text-ink mb-2">Đã đặt lại mật khẩu</h1>
        <p className="text-inkSoft mb-6">Mật khẩu của bạn đã được đặt lại thành công.</p>
        <Link href="/login" className="text-primary hover:text-primary-600 font-semibold text-sm">
          Quay lại đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-ink-faint mb-2">Đặt lại mật khẩu</p>
        <h2 className="text-2xl font-bold text-ink">Tạo mật khẩu mới</h2>
        <p className="text-sm text-inkSoft mt-1.5 font-medium">
          Nhập mật khẩu mới cho tài khoản <strong>{email}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Mật khẩu mới"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Tối thiểu 8 ký tự"
          required
          minLength={8}
        />

        <Input
          label="Xác nhận mật khẩu"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Nhập lại mật khẩu mới"
          required
          minLength={8}
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
          Đặt lại mật khẩu
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0  pointer-events-none"></div>

      <Card className="p-8 md:p-10 w-full max-w-md border border-line bg-surface">
        <Suspense fallback={<div className="text-inkSoft text-center py-8">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </Card>
    </div>
  );
}
