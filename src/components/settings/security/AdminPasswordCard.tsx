'use client';

import { useState, type FormEvent } from 'react';
import { Check, Eye, EyeOff, Loader2, Lock, X } from 'lucide-react';
import type { PublicScraperSettings } from '@/types';
import SettingsCard from '../shared/SettingsCard';

interface Props {
  onSettingsUpdated: (settings: PublicScraperSettings) => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

export default function AdminPasswordCard({
  onSettingsUpdated,
  onNotify,
}: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const lengthMet = newPassword.length >= 8;
  const passwordsMatch =
    newPassword.length > 0 && newPassword === confirmNewPassword;
  const canSubmit =
    !saving && currentPassword.length > 0 && lengthMet && passwordsMatch;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmNewPassword,
        }),
      });

      if (res.status === 401 && !res.headers.get('content-type')?.includes('json')) {
        window.location.assign('/login?next=/settings/security');
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onNotify(data.error ?? 'Failed to update admin password.', 'error');
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      onSettingsUpdated(data.settings);
      onNotify(
        'Admin password rotated — existing sessions invalidated',
        'success'
      );
    } catch {
      onNotify('Network error updating admin password.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard>
      <div className="flex items-start gap-2.5 mb-4">
        <Lock className="w-4 h-4 text-slate-300 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-slate-100">
            Update Admin Password
          </h3>
          <p className="text-xs text-gunmetal-muted mt-0.5">
            Passwords are salted per instance and hashed with Node{' '}
            <code className="text-slate-300">crypto.scrypt</code>. Rotating your password immediately rotates the HMAC session secret and signs out other active browsers.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="ofs-current-password"
              className="block text-xs font-semibold text-slate-300 mb-1.5"
            >
              Current Password *
            </label>
            <div className="relative">
              <input
                id="ofs-current-password"
                type={showCurrent ? 'text' : 'password'}
                autoComplete="current-password"
                disabled={saving}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Required to confirm"
                className="w-full min-h-[44px] sm:min-h-[38px] pl-3 pr-10 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-slate-500 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((prev) => !prev)}
                aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gunmetal-muted hover:text-slate-200 cursor-pointer"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="ofs-new-password"
              className="block text-xs font-semibold text-slate-300 mb-1.5"
            >
              New Password *
            </label>
            <div className="relative">
              <input
                id="ofs-new-password"
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                disabled={saving}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full min-h-[44px] sm:min-h-[38px] pl-3 pr-10 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-slate-500 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowNew((prev) => !prev)}
                aria-label={showNew ? 'Hide new password' : 'Show new password'}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gunmetal-muted hover:text-slate-200 cursor-pointer"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="ofs-confirm-new-password"
              className="block text-xs font-semibold text-slate-300 mb-1.5"
            >
              Confirm New Password *
            </label>
            <input
              id="ofs-confirm-new-password"
              type={showNew ? 'text' : 'password'}
              autoComplete="new-password"
              disabled={saving}
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-slate-500 disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border ${
              lengthMet
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-gunmetal-card border-gunmetal-border text-gunmetal-muted'
            }`}
          >
            {lengthMet ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <X className="w-3 h-3 text-slate-500" />
            )}
            <span>8+ characters</span>
          </span>

          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border ${
              passwordsMatch
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-gunmetal-card border-gunmetal-border text-gunmetal-muted'
            }`}
          >
            {passwordsMatch ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <X className="w-3 h-3 text-slate-500" />
            )}
            <span>Passwords match</span>
          </span>
        </div>

        <div className="pt-1 flex justify-end">
          <button
            type="submit"
            disabled={!canSubmit}
            className="min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-lg bg-slate-800/75 hover:bg-slate-700/85 border border-slate-500/80 hover:border-slate-400 text-slate-100 hover:text-white font-semibold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{saving ? 'Updating...' : 'Update Admin Password'}</span>
          </button>
        </div>
      </form>
    </SettingsCard>
  );
}