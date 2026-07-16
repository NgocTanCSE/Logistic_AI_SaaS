'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import api from '@/lib/api';

type Role = {
  id: string;
  name: string;
  isSystemDefault: boolean;
  permissions?: { resource: string; action: string }[];
};

export default function RolesPage() {
  const { token } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) fetchRoles();
  }, [token]);

  const fetchRoles = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/tenant/roles');
      const data = res.data;
      setRoles(Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch roles');
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {error && <ErrorBanner message={error} onRetry={fetchRoles} />}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-ink tracking-tight">Roles Management</h1>
          <p className="text-sm text-inkSoft mt-2 font-medium">Configure role-based access control for your team.</p>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-border">
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Role Name</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">System Default</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Permissions Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={3} className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest">Loading...</td></tr>
              ) : roles.length === 0 ? (
                <tr><td colSpan={3} className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest">No roles found.</td></tr>
              ) : roles.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-all">
                  <td className="px-8 py-6 font-bold text-ink">{r.name}</td>
                  <td className="px-8 py-6"><Badge variant={r.isSystemDefault ? 'info' : 'neutral'}>{r.isSystemDefault ? 'SYSTEM' : 'CUSTOM'}</Badge></td>
                  <td className="px-8 py-6"><Badge variant="success">{r.permissions?.length || 0} perms</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}