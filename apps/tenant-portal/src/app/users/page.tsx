'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import api from '@/lib/api';

type User = {
  id: string;
  email: string;
  fullName?: string;
  status: string;
  phone?: string;
  roles?: any[];
  lastLogin?: string;
};

export default function UsersPage() {
  const { user, token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: '', fullName: '', password: '', roleId: '' });

  useEffect(() => {
    if (!token) return;
    fetchUsers();
  }, [token, page, search]);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/tenant/users', { params: { page, limit, search } });
      const data = res.data;
      setUsers(Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []));
      setTotal(data?.meta?.total || 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.fullName || !form.password) {
      setError('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      await api.post('/tenant/users', {
        email: form.email,
        fullName: form.fullName,
        password: form.password,
        roleId: form.roleId
      });
      setIsModalOpen(false);
      setForm({ email: '', fullName: '', password: '', roleId: '' });
      fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    try {
      await api.patch(`/tenant/users/${editingUser.id}`, {
        fullName: editingUser.fullName,
        status: editingUser.status
      });
      setIsEditModalOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (userId: string) => {
    try {
      await api.delete(`/tenant/users/${userId}`);
      fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to deactivate user');
    }
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {error && <ErrorBanner message={error} onRetry={fetchUsers} />}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-ink tracking-tight">
            Users Management
          </h1>
          <p className="text-sm text-inkSoft mt-2 font-medium">Manage team members and their access roles.</p>
        </div>
        <Button variant="primary" size="md" onClick={() => setIsModalOpen(true)} className="gap-2 shadow-lg shadow-primary/20">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4"/></svg>
          Invite User
        </Button>
      </div>

      <div className="relative mb-8">
        <Input 
          placeholder="Search users by email or name..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          icon={<svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
        />
      </div>

      <Card className="animate-slide-up">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-border">
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">User</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Role</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Last Login</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Loading Users...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No users found.</td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-all">
                    <td className="px-8 py-6">
                      <div className="font-bold text-ink">{user.fullName || 'N/A'}</div>
                      <div className="text-[10px] font-mono text-slate-400">{user.email}</div>
                    </td>
                    <td className="px-8 py-6">
                      <Badge variant="neutral" className="text-[10px]">
                        {user.roles?.[0]?.role?.name || 'TENANT_USER'}
                      </Badge>
                    </td>
                    <td className="px-8 py-6 text-[11px] font-medium text-slate-500">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-8 py-6">
                      <Badge variant={user.status === 'ACTIVE' ? 'success' : 'error'}>
                        {user.status}
                      </Badge>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" className="font-bold text-primary tracking-widest text-[10px]" onClick={() => handleOpenEditModal(user)}>
                          EDIT
                        </Button>
                        {user.status === 'ACTIVE' && (
                          <Button variant="ghost" size="sm" className="font-bold text-red-500 tracking-widest text-[10px]" onClick={() => handleDeactivate(user.id)}>
                            DEACTIVATE
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {!loading && total > limit && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages} ({total} users)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-white border-white/40 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100">
              <h2 className="text-2xl font-bold text-ink tracking-tight">Invite New User</h2>
              <p className="text-sm text-inkSoft mt-1 font-medium">Add a new team member to your organization.</p>
            </div>
            <form onSubmit={handleCreateUser} className="p-8 space-y-5">
              <Input label="Full Name" required value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} placeholder="John Doe" />
              <Input label="Email Address" type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="john@company.com" />
              <Input label="Temporary Password" type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Min 8 characters" />
              <Input label="Role ID (Optional)" value={form.roleId} onChange={e => setForm({...form, roleId: e.target.value})} placeholder="Leave empty for default role" />
              <div className="flex gap-4 pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={saving} className="flex-1 font-bold uppercase tracking-widest text-[10px]">
                  Cancel
                </Button>
                <Button type="submit" isLoading={saving} disabled={saving} className="flex-1 font-bold uppercase tracking-widest text-[10px]">
                  {saving ? 'INVITING...' : 'INVITE USER'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-white border-white/40 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100">
              <h2 className="text-2xl font-bold text-ink tracking-tight">Edit User</h2>
              <p className="text-sm text-inkSoft mt-1 font-medium">Update user details and status.</p>
            </div>
            <form onSubmit={handleEditUser} className="p-8 space-y-5">
              <Input label="Email (Read-only)" value={editingUser.email} readOnly />
              <Input label="Full Name" value={editingUser.fullName || ''} onChange={e => setEditingUser({...editingUser, fullName: e.target.value})} />
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Status</label>
                <select 
                  value={editingUser.status} 
                  onChange={e => setEditingUser({...editingUser, status: e.target.value})}
                  className="w-full bg-white border border-slate-200 text-ink rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
              <div className="flex gap-4 pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)} disabled={saving} className="flex-1 font-bold uppercase tracking-widest text-[10px]">
                  Cancel
                </Button>
                <Button type="submit" isLoading={saving} disabled={saving} className="flex-1 font-bold uppercase tracking-widest text-[10px]">
                  {saving ? 'SAVING...' : 'SAVE CHANGES'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}