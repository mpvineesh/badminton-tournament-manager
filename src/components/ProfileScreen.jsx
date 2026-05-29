import React, { useEffect, useState } from 'react';
import { resolveProfilePhotoUrl } from '../supabaseAdapter.js';
import {
  notificationsSupported,
  notificationPermission,
  requestNotificationPermission,
  showAppNotification,
} from '../utils/notifications.js';
import { getTheme, setTheme } from '../utils/theme.js';

export default function ProfileScreen({ player, loading, saving, error, onSave }) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [age, setAge] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [localError, setLocalError] = useState('');
  const [notifyPerm, setNotifyPerm] = useState(notificationPermission());
  const [theme, setThemeState] = useState(getTheme());

  function chooseTheme(next) {
    setTheme(next);
    setThemeState(next);
  }

  async function enableNotifications() {
    const result = await requestNotificationPermission();
    setNotifyPerm(result);
    if (result === 'granted') {
      showAppNotification('Match alerts enabled 🏸', {
        body: "We'll let you know when your match goes live.",
      });
    }
  }

  useEffect(() => {
    setName(player?.name || '');
    setMobile(player?.mobile || '');
    setAge(player?.age ?? '');
    setAvatarFile(null);
    setAvatarPreviewUrl('');
  }, [player?.id, player?.name, player?.mobile, player?.age, player?.avatarUrl]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  async function submit(e) {
    e.preventDefault();
    setLocalError('');
    const nextName = String(name || '').trim();
    const nextMobile = String(mobile || '').replace(/\D/g, '');
    const nextAge = Number(age);
    if (!nextName) {
      setLocalError('Name is required.');
      return;
    }
    if (!nextMobile) {
      setLocalError('Mobile number is required.');
      return;
    }
    if (nextMobile.length !== 10) {
      setLocalError('Mobile number must be exactly 10 digits.');
      return;
    }
    if (!Number.isInteger(nextAge) || nextAge < 1) {
      setLocalError('Age should be a positive whole number.');
      return;
    }
    await onSave({ name: nextName, mobile: nextMobile, age: nextAge, avatarFile });
  }

  function handleAvatarChange(e) {
    setLocalError('');
    const nextFile = e.target.files?.[0] || null;
    setAvatarFile(nextFile);
    if (!nextFile) {
      setAvatarPreviewUrl('');
      return;
    }
    if (!String(nextFile.type || '').startsWith('image/')) {
      setAvatarFile(null);
      setAvatarPreviewUrl('');
      setLocalError('Please select an image file.');
      return;
    }
    const objectUrl = URL.createObjectURL(nextFile);
    setAvatarPreviewUrl(objectUrl);
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-gradient-to-r from-white dark:from-navy-900 to-navy-50/40 p-4 shadow-sm">
        <div className="text-lg font-semibold">My Profile</div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Update your profile details.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 p-4 shadow-sm">
        {loading ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">Loading profile...</div>
        ) : !player ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">No player profile mapped to this login.</div>
        ) : (
          <form className="space-y-3" onSubmit={submit}>
            {(localError || error) && (
              <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {localError || error}
              </div>
            )}
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1">Profile Picture</label>
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 overflow-hidden rounded-full border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-800">
                  {(avatarPreviewUrl || player?.avatarUrl) ? (
                    <img
                      src={avatarPreviewUrl || resolveProfilePhotoUrl(player?.avatarUrl)}
                      alt={`${player?.name || 'Player'} avatar`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] font-medium leading-tight text-slate-500 dark:text-slate-400">
                      No<br />Photo
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:text-slate-700 hover:file:bg-slate-50"
                  onChange={handleAvatarChange}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1">Name</label>
              <input
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-navy-900"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter name"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1">Mobile</label>
              <input
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-navy-900"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Enter mobile number"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1">Age</label>
              <input
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-navy-900"
                type="number"
                min="1"
                step="1"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Enter age"
              />
            </div>
            <div className="pt-1">
              <button className="btn-primary w-full sm:w-auto" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 p-4 shadow-sm">
        <div className="font-semibold">Appearance</div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose a light or dark theme.</p>
        <div className="mt-3 inline-flex rounded-lg border border-slate-300 dark:border-navy-700 p-0.5">
          <button
            type="button"
            onClick={() => chooseTheme('light')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${theme === 'light' ? 'bg-navy-800 text-white' : 'text-slate-600 dark:text-slate-300'}`}
          >
            Light
          </button>
          <button
            type="button"
            onClick={() => chooseTheme('dark')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${theme === 'dark' ? 'bg-navy-800 text-white' : 'text-slate-600 dark:text-slate-300'}`}
          >
            Dark
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 p-4 shadow-sm">
        <div className="font-semibold">Match alerts</div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Get a notification on this device when your match goes live.
        </p>
        {!notificationsSupported() ? (
          <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            This device/browser doesn’t support notifications.
          </div>
        ) : notifyPerm === 'granted' ? (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            ✓ Match alerts are on
          </div>
        ) : notifyPerm === 'denied' ? (
          <div className="mt-3 text-sm text-amber-700">
            Notifications are blocked. Enable them for this site in your browser settings.
          </div>
        ) : (
          <button
            type="button"
            className="mt-3 btn-primary w-full sm:w-auto"
            onClick={enableNotifications}
          >
            Enable match alerts
          </button>
        )}
        <p className="mt-2 text-xs text-slate-400">
          Works while the app is open or installed. On iPhone, add the app to your Home Screen first.
        </p>
      </div>
    </section>
  );
}
