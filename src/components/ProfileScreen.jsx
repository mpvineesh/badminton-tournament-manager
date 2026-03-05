import React, { useEffect, useState } from 'react';

export default function ProfileScreen({ player, loading, saving, error, onSave }) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [age, setAge] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [localError, setLocalError] = useState('');

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
    const nextMobile = String(mobile || '').trim();
    const nextAge = Number(age);
    if (!nextName) {
      setLocalError('Name is required.');
      return;
    }
    if (!nextMobile) {
      setLocalError('Mobile number is required.');
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
      <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-white to-cyan-50/40 p-4 shadow-sm">
        <div className="text-lg font-semibold">My Profile</div>
        <p className="text-sm text-slate-500 mt-1">
          Update your profile details.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm">
        {loading ? (
          <div className="text-sm text-slate-500">Loading profile...</div>
        ) : !player ? (
          <div className="text-sm text-slate-500">No player profile mapped to this login.</div>
        ) : (
          <form className="space-y-3" onSubmit={submit}>
            {(localError || error) && (
              <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {localError || error}
              </div>
            )}
            <div>
              <label className="block text-sm text-slate-600 mb-1">Profile Picture</label>
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                  {(avatarPreviewUrl || player?.avatarUrl) ? (
                    <img
                      src={avatarPreviewUrl || player?.avatarUrl}
                      alt={`${player?.name || 'Player'} avatar`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] font-medium leading-tight text-slate-500">
                      No<br />Photo
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:text-slate-700 hover:file:bg-slate-50"
                  onChange={handleAvatarChange}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Name</label>
              <input
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter name"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Mobile</label>
              <input
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Enter mobile number"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Age</label>
              <input
                className="w-full px-3 py-2 border rounded-lg bg-white"
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
    </section>
  );
}
