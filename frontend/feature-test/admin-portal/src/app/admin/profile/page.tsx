"use client";

import React, { useState, useEffect } from 'react';
import { ShieldWarning, Envelope, User, Key, Lock, ArrowLeft } from 'phosphor-react';
import { useAuth } from '@/lib/auth-context';
import { switchRole } from '@/lib/role-switch';
import api from '@/lib/api';
import { ROLES } from '@/lib/roles';
import { initStore, getAll, getOne, create, update, UserProfile } from '@/lib/local-store';

export default function AdminProfile() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [roleSwitching, setRoleSwitching] = useState(false);
  const [roleMsg, setRoleMsg] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

   const loadProfile = async () => {
    setLoading(true);
    try {
      initStore();
      const response = await api.get('/admin/auth/profile');
      const data = response.data?.data || response.data;
      setProfile(data);
      setFullName(data.fullName || user?.email?.split('@')[0] || '');
      create('adminProfile', { id: 'current', ...data });
    } catch {
      const cached = getOne('adminProfile', 'current');
      setProfile(cached || null);
      if (cached) {
        setFullName((cached as UserProfile).fullName || user?.email?.split('@')[0] || '');
      } else {
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  };

   const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      const response = await api.patch('/admin/auth/profile', { fullName });
      const data = response.data?.data || response.data;
      if (data) setProfile(data);
      setSaveMsg('Profile updated successfully.');
    } catch (err: any) {
      setProfile({ ...profile, fullName });
      update('adminProfile', 'current', { fullName });
      setSaveMsg(err?.response?.data?.message || 'Profile saved locally. API server unavailable.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

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
      const res = await api.post('/admin/auth/change-password', { oldPassword, newPassword });
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

  const handleSwitchRole = async (newRole: string) => {
    setRoleSwitching(true);
    setRoleMsg(null);
    try {
      const ok = await switchRole(newRole);
      if (ok) {
        const currentRole = ROLES[newRole] || newRole.replace(/_/g, ' ');
        setRoleMsg(`Role switched to ${currentRole}. Page will refresh to apply new permissions.`);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setRoleMsg('Role switch failed. See console for details.');
      }
    } catch {
      setRoleMsg('Role switch failed.');
    } finally {
      setRoleSwitching(false);
    }
  };

  const displayRole = user?.role || profile?.role || 'SUPER_ADMIN';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Role-switch quick bar */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-inkSoft uppercase tracking-wider">
            Current Role: {String(displayRole).replace(/_/g, ' ')}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ROLES).map(([value, label]) => (
            <button
              key={value}
              onClick={() => handleSwitchRole(value)}
              disabled={roleSwitching || value === displayRole}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 ${
                value === displayRole
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary border border-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {roleMsg && (
        <div className="mb-4 p-3 rounded-lg border text-sm text-center font-medium bg-primary/5 border-primary/20 text-primary">
          {roleMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-8 shadow-card">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <ShieldWarning className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-ink">Admin Profile</h1>
              <p className="text-sm text-inkSoft mt-1 font-medium">Manage your account information</p>
            </div>
          </div>

          {loading ? (
            <div className="text-inkSoft text-center py-8">Loading profile...</div>
          ) : profile ? (
            <>
              <div className="grid grid-cols-1 gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                  <p className="text-ink font-medium flex items-center gap-2">
                    <Envelope className="w-4 h-4 text-slate-400" />
                    {profile.email}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Role</label>
                  <p className="text-ink font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    {String(profile.role || 'SUPER_ADMIN').replace(/_/g, ' ')}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-ink focus:outline-none focus:border-primary transition-colors"
                      placeholder="Your full name"
                      required
                    />
                  </div>
                </div>

                {saveMsg && (
                  <div className={`p-3 rounded-lg text-sm text-center font-medium ${
                    saveMsg.includes('successfully')
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                      : 'bg-rose-50 border border-rose-200 text-rose-700'
                  }`}>
                    {saveMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-rose-500 mb-4">Failed to load profile.</p>
              <button onClick={loadProfile} className="text-sm text-primary hover:text-primary-hover underline">
                Try again
              </button>
            </div>
          )}
        </div>

        {/* Quick actions card */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Key className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-ink">Security</h2>
            </div>
            <p className="text-sm text-inkSoft mb-4">Change your password and review account security settings.</p>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-ink focus:outline-none focus:border-primary transition-colors"
                    placeholder="Enter current password"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-ink focus:outline-none focus:border-primary transition-colors"
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-ink focus:outline-none focus:border-primary transition-colors"
                    placeholder="Re-enter new password"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              {passwordMsg && (
                <div className={`p-3 rounded-lg text-sm text-center font-medium ${
                  passwordMsg.includes('successfully')
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    : 'bg-rose-50 border border-rose-200 text-rose-700'
                }`}>
                  {passwordMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={changingPassword}
                className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
              >
                {changingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 11-6 0v-1m6-1V7a3 3 0 016 0v1" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-ink">Session</h2>
            </div>
            <p className="text-sm text-inkSoft mb-4">Sign out of your current session on this device.</p>
            <button
              onClick={logout}
              className="w-full text-sm font-bold uppercase tracking-wider text-rose-600 hover:bg-rose-50 border border-rose-200 py-2.5 rounded-xl transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
