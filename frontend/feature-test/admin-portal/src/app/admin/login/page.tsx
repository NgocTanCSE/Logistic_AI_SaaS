'use client';

import { useRouter } from 'next/navigation';
import { Button } from 'ui-components';
import { EditorialPageHeader, EmptyNote } from 'ui-kit';
import { useAuth } from '@/lib/auth-context';
import { createDemoToken } from '@/lib/auth';
import { AdminRole, ROLE_LABELS } from '@/lib/rbac';

export default function AdminLogin() {
  const router = useRouter();
  const { login } = useAuth();

  const handleDemoLogin = (role: AdminRole) => {
    login(createDemoToken(role));
    router.push('/admin/dashboard');
  };

  return (
    <div className="min-h-screen bg-canvas p-6">
      <div className="mx-auto flex min-h-screen max-w-[45rem] flex-col items-center justify-center gap-8">
        <div className="space-y-4 text-center">
          <EditorialPageHeader
            title="Admin portal"
            description="Manage SmartLogi tenants, orders and billing from a single dashboard."
          />
          <EmptyNote>
            Demo data only. Sessions are local and do not modify any backend data.
          </EmptyNote>
        </div>

        <div className="grid w-full gap-2 sm:grid-cols-2 md:grid-cols-3">
          {(Object.keys(ROLE_LABELS) as AdminRole[]).map((role) => (
            <Button
              key={role}
              variant="outline"
              onClick={() => handleDemoLogin(role)}
              className="h-10 w-full items-center justify-center rounded-md border border-line bg-surface px-4 text-[13px] font-medium text-ink hover:bg-surface-alt focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              Login as {ROLE_LABELS[role]}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
