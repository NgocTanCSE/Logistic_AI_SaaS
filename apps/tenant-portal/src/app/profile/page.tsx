'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function ProfilePage() {
  const { user, logout } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const res = await api.get('/tenant/auth/profile');
      if (res.data) {
        setFullName(res.data.fullName || '');
        setPhone(res.data.phone || '');
      }
    } catch {}
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');
    try {
      await api.patch('/tenant/auth/profile', { fullName, phone });
      setSaveMsg('Profile updated successfully.');
    } catch (err: any) {
      setSaveMsg(err?.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg('');

    if (newPassword !== confirmNewPassword) {
      setPasswordMsg('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg('Password must be at least 8 characters.');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await api.post('/tenant/auth/change-password', {
        oldPassword,
        newPassword,
      });
      if (res.data?.ok) {
        setPasswordMsg('Password changed successfully.');
        setOldPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        setPasswordMsg(res.data?.message || 'Failed to change password.');
      }
    } catch (err: any) {
      setPasswordMsg(err?.response?.data?.message || 'Current password is incorrect.');
    } finally {
      setChangingPassword(false);
    }
  };

  if (!user) {
    return <div className="text-inkSoft text-center py-12">Please sign in to view your profile.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-ink">My Profile</h1>
        <p className="text-inkSoft mt-1">Manage your account information and security.</p>
      </div>

      <Card className="p-6 md:p-8 bg-white/70 backdrop-blur-2xl border-white/40 shadow-xl">
        <h2 className="text-lg font-bold text-ink mb-6">Account Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
            <p className="text-ink font-medium">{user.email}</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Role</label>
            <p className="text-ink font-medium">{String(user.role).replace(/_/g, ' ')}</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-5">
          <Input
            label="Full Name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
          />
          <Input
            label="Phone"
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number"
          />
          {saveMsg && (
            <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${
              saveMsg.includes('success') ? 'border-emerald-200 bg-emerald-50/80 text-emerald-700' : 'border-rose-200 bg-rose-50/80 text-rose-700'
            }`}>
              {saveMsg}
            </div>
          )}
          <Button type="submit" variant="primary" isLoading={saving}>
            Save Changes
          </Button>
        </form>
      </Card>

      <Card className="p-6 md:p-8 bg-white/70 backdrop-blur-2xl border-white/40 shadow-xl">
        <h2 className="text-lg font-bold text-ink mb-6">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-5">
          <Input
            label="Current Password"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder="Enter current password"
            required
          />
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min. 8 characters"
            required
            minLength={8}
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            placeholder="Re-enter new password"
            required
            minLength={8}
          />
          {passwordMsg && (
            <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${
              passwordMsg.includes('success') ? 'border-emerald-200 bg-emerald-50/80 text-emerald-700' : 'border-rose-200 bg-rose-50/80 text-rose-700'
            }`}>
              {passwordMsg}
            </div>
          )}
          <Button type="submit" variant="primary" isLoading={changingPassword}>
            Update Password
          </Button>
        </form>
      </Card>
    </div>
  );
}
