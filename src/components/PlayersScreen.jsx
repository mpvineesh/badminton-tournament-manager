import React, { useRef, useState } from 'react';
import { resolveProfilePhotoUrl, uploadPlayerProfilePhoto } from '../supabaseAdapter.js';

const initialForm = {
  name: '',
  age: '',
  mobile: '',
  skill: 5,
  role: 'player',
};

// Colour the skill chip by tier so stronger players read at a glance.
function skillChipClass(skill) {
  const s = Number(skill) || 0;
  if (s >= 9)
    return 'bg-gradient-to-r from-gold-400 to-gold-500 text-navy-900 ring-1 ring-gold-300';
  if (s >= 7)
    return 'bg-gold-100 text-gold-800 ring-1 ring-gold-200 dark:bg-gold-500/15 dark:text-gold-200 dark:ring-gold-500/30';
  if (s >= 4)
    return 'bg-navy-100 text-navy-700 ring-1 ring-navy-200 dark:bg-navy-500/20 dark:text-navy-100 dark:ring-navy-500/40';
  return 'bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-navy-800 dark:text-slate-300 dark:ring-navy-700';
}

function SkillBadge({ skill }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${skillChipClass(skill)}`}
    >
      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.49L10 14.1l-4.94 2.6.94-5.49-4-3.9 5.53-.8L10 1.5z" />
      </svg>
      {skill}
    </span>
  );
}

function RoleBadge({ role }) {
  const admin = String(role || '').toLowerCase() === 'admin';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        admin
          ? 'bg-gold-100 text-gold-800 ring-1 ring-gold-200 dark:bg-gold-500/15 dark:text-gold-200 dark:ring-gold-500/30'
          : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200 dark:bg-navy-800 dark:text-slate-300 dark:ring-navy-700'
      }`}
    >
      {admin ? 'Admin' : 'Player'}
    </span>
  );
}

export default function PlayersScreen({
  players,
  loading,
  error,
  isAdmin,
  onOpenStats,
  onRefresh,
  onAddPlayer,
  onUpdatePlayer,
  onDeletePlayer,
  saving,
  updatingId,
  deletingId,
}) {
  const [form, setForm] = useState(initialForm);
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(initialForm);
  const [localError, setLocalError] = useState('');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [photoBusyId, setPhotoBusyId] = useState(null);
  const fileInputRef = useRef(null);
  const pendingPlayerRef = useRef(null);

  function pickPhotoFor(player) {
    if (!isAdmin || !player?.id) return;
    pendingPlayerRef.current = player;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }

  async function onPhotoChosen(e) {
    const file = e.target.files?.[0];
    const player = pendingPlayerRef.current;
    if (!file || !player?.id) return;
    if (!String(file.type || '').startsWith('image/')) {
      setLocalError('Please choose an image file.');
      return;
    }
    setLocalError('');
    setPhotoBusyId(player.id);
    try {
      const uploaded = await uploadPlayerProfilePhoto(player.id, file);
      const avatarUrl = String(uploaded?.url || '').trim();
      await onUpdatePlayer(player.id, {
        name: player.name,
        age: player.age,
        mobile: player.mobile,
        skill: player.skill,
        role: player.role || 'player',
        avatarUrl,
      });
    } catch (err) {
      setLocalError(err?.message || 'Unable to upload photo.');
    } finally {
      setPhotoBusyId(null);
      pendingPlayerRef.current = null;
    }
  }

  const visiblePlayers = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = (players || []).filter((p) => {
      if (!q) return true;
      return (
        String(p?.name || '').toLowerCase().includes(q) ||
        String(p?.mobile || '').toLowerCase().includes(q)
      );
    });
    const sorted = [...filtered];
    if (sortBy === 'skill-desc') sorted.sort((a, b) => (b?.skill || 0) - (a?.skill || 0));
    else if (sortBy === 'skill-asc') sorted.sort((a, b) => (a?.skill || 0) - (b?.skill || 0));
    else sorted.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
    return sorted;
  }, [players, query, sortBy]);

  function normalizePayload(raw) {
    return {
      name: String(raw.name || '').trim(),
      age: Number(raw.age),
      // Keep digits only — strips spaces, +country codes, and stray invisible
      // characters that have crept into some records.
      mobile: String(raw.mobile || '').replace(/\D/g, ''),
      skill: Number(raw.skill),
      role: String(raw.role || 'player').toLowerCase() === 'admin' ? 'admin' : 'player',
    };
  }

  function validate(raw) {
    const p = normalizePayload(raw);
    if (!p.name) return 'Name is required.';
    if (!Number.isInteger(p.age) || p.age < 1) return 'Age should be a positive whole number.';
    if (!p.mobile) return 'Mobile is required.';
    if (p.mobile.length !== 10) return 'Mobile number must be exactly 10 digits.';
    if (!Number.isInteger(p.skill) || p.skill < 1 || p.skill > 10) {
      return 'Skill level should be between 1 and 10.';
    }
    if (p.role !== 'admin' && p.role !== 'player') return 'Role should be admin or player.';
    return '';
  }

  async function submitAdd(e) {
    e.preventDefault();
    const err = validate(form);
    setLocalError(err);
    if (err) return;
    const ok = await onAddPlayer(normalizePayload(form));
    if (ok) {
      setForm(initialForm);
      setAddOpen(false);
      setLocalError('');
    }
  }

  function startEdit(player) {
    setLocalError('');
    setEditId(player.id);
    setEditForm({
      name: player.name || '',
      age: player.age ?? '',
      mobile: player.mobile || '',
      skill: player.skill ?? 5,
      role: player.role || 'player',
    });
  }

  async function submitEdit(id) {
    const err = validate(editForm);
    setLocalError(err);
    if (err) return;
    const ok = await onUpdatePlayer(id, normalizePayload(editForm));
    if (ok) {
      setEditId(null);
      setEditForm(initialForm);
    }
  }

  function renderAvatar(player, sizeClass = 'h-10 w-10', editable = false) {
    const avatarUrl = resolveProfilePhotoUrl(player?.avatarUrl);
    const label = String(player?.name || 'Player').trim();
    const initial = label ? label.charAt(0).toUpperCase() : 'P';
    const busy = photoBusyId === player?.id;
    const isAdminPlayer = String(player?.role || '').toLowerCase() === 'admin';
    const ringClass = isAdminPlayer
      ? 'ring-2 ring-gold-300 dark:ring-gold-500/50'
      : 'ring-1 ring-slate-200 dark:ring-navy-700';
    const inner = (
      <div className={`${sizeClass} relative overflow-hidden rounded-full ${ringClass} bg-gradient-to-br from-slate-50 to-slate-100 dark:from-navy-800 dark:to-navy-900 shadow-sm`}>
        {avatarUrl ? (
          <img src={avatarUrl} alt={`${label || 'Player'} avatar`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-bold text-navy-500 dark:text-slate-300">
            {initial}
          </div>
        )}
        {editable && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-navy-900/55 py-0.5 text-white backdrop-blur-[1px]">
            {busy ? (
              <span className="text-[9px] font-medium">…</span>
            ) : (
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            )}
          </div>
        )}
      </div>
    );
    if (!editable) return inner;
    return (
      <button
        type="button"
        title="Change photo"
        disabled={busy}
        className="rounded-full focus:outline-none focus:ring-2 focus:ring-navy-400"
        onClick={(e) => {
          e.stopPropagation();
          pickPhotoFor(player);
        }}
      >
        {inner}
      </button>
    );
  }

  return (
    <section className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPhotoChosen}
      />
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-800 via-navy-700 to-navy-900 p-5 shadow-md">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold-400/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/4 h-32 w-32 rounded-full bg-navy-400/20 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <svg className="h-6 w-6 text-gold-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">Players</h2>
                {!loading && players.length > 0 && (
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-white ring-1 ring-white/20">
                    {players.length}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-300">
                View, add, edit, and manage your player roster.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <button
                className="w-full sm:w-auto btn-gold"
                onClick={() => {
                  setLocalError('');
                  setForm(initialForm);
                  setAddOpen(true);
                }}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Player
              </button>
            )}
            <button
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 px-4 py-2 font-medium text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
              onClick={onRefresh}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 p-3 sm:p-4 shadow-sm">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="font-semibold">
            Player List
            {!loading && players.length > 0 && (
              <span className="ml-2 text-sm font-normal text-slate-400">
                {query.trim() ? `${visiblePlayers.length} of ${players.length}` : players.length}
              </span>
            )}
          </div>
          {players.length > 0 && (
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1 sm:w-56">
                <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400"
                  placeholder="Search name or mobile…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <select
                className="px-2 py-2 border rounded-lg bg-white dark:bg-navy-900 text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort players"
              >
                <option value="name">Name (A–Z)</option>
                <option value="skill-desc">Skill (high→low)</option>
                <option value="skill-asc">Skill (low→high)</option>
              </select>
            </div>
          )}
        </div>
        {(localError || error) && (
          <div className="mb-3 text-sm text-red-700">{localError || error}</div>
        )}
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-navy-800" />
            ))}
          </div>
        ) : players.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-navy-700 py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-navy-50 text-navy-500 dark:bg-navy-800 dark:text-slate-300">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-300">No players yet</div>
            <p className="mt-1 text-xs text-slate-400">
              {isAdmin ? 'Add your first player to get started.' : 'Players will appear here once added.'}
            </p>
          </div>
        ) : visiblePlayers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 dark:border-navy-700 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            No players match “{query.trim()}”.
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            <div className="sm:hidden space-y-2">
              {visiblePlayers.map((p) => {
                const editing = editId === p.id;
                return (
                  <div
                    key={p.id}
                    className={`rounded-xl border border-slate-200 dark:border-navy-700 px-3 py-3 bg-white dark:bg-navy-900 shadow-sm transition ${editing ? '' : 'cursor-pointer hover:border-navy-300 hover:shadow-md active:scale-[0.99]'}`}
                    onClick={() => {
                      if (editing) return;
                      onOpenStats?.(p);
                    }}
                  >
                    {editing ? (
                      <div className="space-y-1.5">
                        <input
                          className="w-full px-2 py-1.5 border rounded"
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, name: e.target.value }))
                          }
                        />
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="number"
                            min={1}
                            className="w-full px-2 py-1.5 border rounded"
                            value={editForm.age}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, age: e.target.value }))
                            }
                            placeholder="Age"
                          />
                          <input
                            type="number"
                            min={1}
                            max={10}
                            className="w-full px-2 py-1.5 border rounded"
                            value={editForm.skill}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, skill: e.target.value }))
                            }
                            placeholder="Skill"
                          />
                        </div>
                        <select
                          className="w-full px-2 py-1.5 border rounded bg-white dark:bg-navy-900"
                          value={editForm.role}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, role: e.target.value }))
                          }
                        >
                          <option value="player">Player</option>
                          <option value="admin">Admin</option>
                        </select>
                        <input
                          className="w-full px-2 py-1.5 border rounded"
                          value={editForm.mobile}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, mobile: e.target.value }))
                          }
                          placeholder="Mobile"
                        />
                        <div className="flex gap-1.5 pt-0.5">
                          <button
                            className="flex-1 px-2 py-1 rounded-lg border text-sm hover:bg-slate-100"
                            onClick={() => submitEdit(p.id)}
                            disabled={updatingId === p.id}
                          >
                            {updatingId === p.id ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            className="flex-1 px-2 py-1 rounded-lg border text-sm hover:bg-slate-100"
                            onClick={() => setEditId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-3">
                          {renderAvatar(p, 'h-14 w-14', isAdmin)}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="truncate font-semibold text-slate-800 dark:text-slate-100">{p.name}</div>
                              <SkillBadge skill={p.skill} />
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-slate-500 dark:text-slate-400">
                              <span className="inline-flex items-center gap-1">
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                {p.age ?? '-'} yrs
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                {p.mobile || '-'}
                              </span>
                            </div>
                            {isAdmin && (
                              <div className="mt-1.5">
                                <RoleBadge role={p.role} />
                              </div>
                            )}
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="mt-2.5 flex gap-1.5">
                            <button
                              className="flex-1 px-2 py-1 rounded-lg border text-sm hover:bg-slate-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(p);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="flex-1 px-2 py-1 rounded-lg border text-sm text-red-700 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeletePlayer(p.id);
                              }}
                              disabled={deletingId === p.id}
                            >
                              {deletingId === p.id ? 'Deleting…' : 'Delete'}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200 dark:border-navy-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-navy-800 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2.5">Photo</th>
                    <th className="px-3 py-2.5">Name</th>
                    <th className="px-3 py-2.5">Age</th>
                    <th className="px-3 py-2.5">Mobile</th>
                    <th className="px-3 py-2.5">Skill</th>
                    {isAdmin && <th className="px-3 py-2.5">Role</th>}
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePlayers.map((p) => {
                    const editing = editId === p.id;
                    return (
                      <tr
                        key={p.id}
                        className={`border-t border-slate-100 dark:border-navy-800 transition-colors ${editing ? 'bg-navy-50/40 dark:bg-navy-800/40' : 'cursor-pointer hover:bg-navy-50/60 dark:hover:bg-navy-800/50'}`}
                        onClick={() => {
                          if (editing) return;
                          onOpenStats?.(p);
                        }}
                      >
                        <td className="px-3 py-2.5 align-middle">
                          {renderAvatar(p, 'h-11 w-11', isAdmin)}
                        </td>
                        <td className="px-3 py-2.5">
                          {editing ? (
                            <input
                              className="w-full px-2 py-1 border rounded"
                              value={editForm.name}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, name: e.target.value }))
                              }
                            />
                          ) : (
                            <span className="font-medium text-slate-800 dark:text-slate-100">{p.name}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                          {editing ? (
                            <input
                              type="number"
                              min={1}
                              className="w-24 px-2 py-1 border rounded"
                              value={editForm.age}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, age: e.target.value }))
                              }
                            />
                          ) : (
                            p.age ?? '-'
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                          {editing ? (
                            <input
                              className="w-full px-2 py-1 border rounded"
                              value={editForm.mobile}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, mobile: e.target.value }))
                              }
                            />
                          ) : (
                            p.mobile || '-'
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {editing ? (
                            <input
                              type="number"
                              min={1}
                              max={10}
                              className="w-24 px-2 py-1 border rounded"
                              value={editForm.skill}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, skill: e.target.value }))
                              }
                            />
                          ) : (
                            <SkillBadge skill={p.skill} />
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-3 py-2.5">
                            {editing ? (
                              <select
                                className="w-28 px-2 py-1 border rounded bg-white dark:bg-navy-900"
                                value={editForm.role}
                                onChange={(e) =>
                                  setEditForm((f) => ({ ...f, role: e.target.value }))
                                }
                              >
                                <option value="player">Player</option>
                                <option value="admin">Admin</option>
                              </select>
                            ) : (
                              <RoleBadge role={p.role} />
                            )}
                          </td>
                        )}
                        <td className="px-3 py-2.5 text-right">
                          {isAdmin &&
                            (editing ? (
                              <div className="inline-flex gap-2">
                                <button
                                  className="px-2 py-1 rounded-lg border hover:bg-slate-100"
                                  onClick={() => submitEdit(p.id)}
                                  disabled={updatingId === p.id}
                                >
                                  {updatingId === p.id ? 'Saving…' : 'Save'}
                                </button>
                                <button
                                  className="px-2 py-1 rounded-lg border hover:bg-slate-100"
                                  onClick={() => setEditId(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex gap-2">
                                <button
                                  className="px-2 py-1 rounded-lg border hover:bg-slate-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEdit(p);
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  className="px-2 py-1 rounded-lg border text-red-700 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeletePlayer(p.id);
                                  }}
                                  disabled={deletingId === p.id}
                                >
                                  {deletingId === p.id ? 'Deleting…' : 'Delete'}
                                </button>
                              </div>
                            ))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {isAdmin && addOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-3xl rounded-xl border bg-white dark:bg-navy-900 shadow-lg">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="font-semibold">Add Player</div>
              <button
                className="px-2 py-1 rounded-lg border hover:bg-slate-100"
                onClick={() => setAddOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="p-4">
              <form className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3" onSubmit={submitAdd}>
                <input
                  className="px-3 py-2 border rounded-lg"
                  placeholder="Name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
                <input
                  type="number"
                  min={1}
                  className="px-3 py-2 border rounded-lg"
                  placeholder="Age"
                  value={form.age}
                  onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                />
                <input
                  className="px-3 py-2 border rounded-lg"
                  placeholder="Mobile"
                  value={form.mobile}
                  onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                />
                <input
                  type="number"
                  min={1}
                  max={10}
                  className="px-3 py-2 border rounded-lg"
                  placeholder="Skill Level (1-10)"
                  value={form.skill}
                  onChange={(e) => setForm((f) => ({ ...f, skill: e.target.value }))}
                />
                <select
                  className="px-3 py-2 border rounded-lg bg-white dark:bg-navy-900"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                >
                  <option value="player">Player</option>
                  <option value="admin">Admin</option>
                </select>
                <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
                  <button className="btn-primary w-full sm:w-auto" type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Add Player'}
                  </button>
                </div>
              </form>
              {(localError || error) && (
                <div className="mt-3 text-sm text-red-700">{localError || error}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
