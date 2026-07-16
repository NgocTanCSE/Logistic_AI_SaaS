"use client";

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Mail, Lock, User, KeyRound } from 'lucide-react';
import api from '@/lib/api';

export default function AdminProfile() {
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

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/auth/profile');
      const data = res.data?.data || res.data;
      setProfile(data);
      setFullName(data.fullName || '');
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await api.patch('/admin/auth/profile', { fullName });
      const data = res.data?.data || res.data;
      if (data) setProfile(data);
      setSaveMsg('Profile updated successfully.');
    } catch (err: any) {
      setSaveMsg(err?.response?.data?.message || 'Failed to update profile.');
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

  return (
    <div className="flex-1 min-h-[100dvh] flex items-center justify-center p-4 bg-background relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-red-500/10 blur-[120px] rounded-full pointer-events-none z-0"></div>

      <div className="w-full max-w-lg relative z-10 space-y-6">
        <div className="glass-panel w-full p-8 rounded-2xl border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.1)]">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-500">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white">Admin Profile</h1>
            <p className="text-zinc-400 mt-2">Manage your account information</p>
          </div>

          {loading ? (
            <div className="text-zinc-400 text-center py-8">Loading profile...</div>
          ) : profile ? (
            <>
              <div className="grid grid-cols-1 gap-4 mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Email</label>
                  <p className="text-white font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4 text-zinc-500" />
                    {profile.email}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Role</label>
                  <p className="text-white font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-zinc-500" />
                    {String(profile.role || 'SUPER_ADMIN').replace(/_/g, ' ')}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-red-500/50 transition-colors"
                      placeholder="Your full name"
                      required
                    />
                  </div>
                </div>

                {saveMsg && (
                  <div className={`p-3 rounded-lg text-sm text-center font-medium ${
                    saveMsg.includes('successfully') ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400' : 'bg-red-500/20 border border-red-500/50 text-red-400'
                  }`}>
                    {saveMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-red-400 mb-4">Failed to load profile.</p>
              <button onClick={loadProfile} className="text-sm text-red-400 hover:text-red-300 underline">
                Try again
              </button>
            </div>
          )}
        </div>

        <div className="glass-panel w-full p-8 rounded-2xl border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.1)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center text-red-500">
              <KeyRound className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white">Change Password</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-red-500/50 transition-colors"
                  placeholder="Enter current password"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-red-500/50 transition-colors"
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-red-500/50 transition-colors"
                  placeholder="Re-enter new password"
                  required
                  minLength={8}
                />
              </div>
            </div>

            {passwordMsg && (
              <div className={`p-3 rounded-lg text-sm text-center font-medium ${
                passwordMsg.includes('successfully') ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400' : 'bg-red-500/20 border border-red-500/50 text-red-400'
              }`}>
                {passwordMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={changingPassword}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
            >
              {changingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
