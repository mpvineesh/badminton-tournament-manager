import React, { useRef, useState } from 'react';
import { resolveProfilePhotoUrl, uploadPlayerProfilePhoto } from '../supabaseAdapter.js';

const initialForm = {
  name: '',
  age: '',
  mobile: '',
  skill: 5,
  role: 'player',
};

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
    const inner = (
      <div className={`${sizeClass} relative overflow-hidden rounded-full border border-slate-200 dark:border-navy-700 bg-slate-50`}>
        {avatarUrl ? (
          <img src={avatarUrl} alt={`${label || 'Player'} avatar`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-500 dark:text-slate-400">
            {initial}
          </div>
        )}
        {editable && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/45 py-0.5 text-[9px] font-medium text-white">
            {busy ? '…' : 'Edit'}
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
      <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-gradient-to-r from-white dark:from-navy-900 to-navy-50/40 p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold">Players</div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              View, add, edit, and delete player records.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <button
                className="w-full sm:w-auto btn-ghost"
                onClick={() => {
                  setLocalError('');
                  setForm(initialForm);
                  setAddOpen(true);
                }}
              >
                Add Player
              </button>
            )}
            <button
              className="w-full sm:w-auto btn-ghost"
              onClick={onRefresh}
            >
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
              <input
                className="min-w-0 flex-1 sm:w-56 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-400"
                placeholder="Search name or mobile…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
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
          <div className="rounded-lg border border-dashed border-slate-300 dark:border-navy-700 py-10 text-center">
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
                    className={`rounded-lg border px-3 py-2.5 bg-white dark:bg-navy-900 ${editing ? '' : 'cursor-pointer hover:bg-slate-50'}`}
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
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold">{p.name}</div>
                            <div className="mt-0.5 text-sm text-slate-600 dark:text-slate-300 leading-6">
                              Age: {p.age ?? '-'} | Skill: {p.skill}
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-300 leading-6">Mobile: {p.mobile || '-'}</div>
                            {isAdmin && (
                              <div className="text-sm text-slate-600 dark:text-slate-300 leading-6">
                                Role: {p.role === 'admin' ? 'Admin' : 'Player'}
                              </div>
                            )}
                          </div>
                          {renderAvatar(p, 'h-14 w-14', isAdmin)}
                        </div>
                        {isAdmin && (
                          <div className="mt-2 flex gap-1.5">
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

            <div className="hidden sm:block overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-navy-800 text-left text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="p-2">Photo</th>
                    <th className="p-2">Name</th>
                    <th className="p-2">Age</th>
                    <th className="p-2">Mobile</th>
                    <th className="p-2">Skill Level</th>
                    {isAdmin && <th className="p-2">Role</th>}
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePlayers.map((p) => {
                    const editing = editId === p.id;
                    return (
                      <tr
                        key={p.id}
                        className={`border-t ${editing ? '' : 'cursor-pointer hover:bg-slate-50'}`}
                        onClick={() => {
                          if (editing) return;
                          onOpenStats?.(p);
                        }}
                      >
                        <td className="p-2 align-middle">
                          {renderAvatar(p, 'h-11 w-11', isAdmin)}
                        </td>
                        <td className="p-2">
                          {editing ? (
                            <input
                              className="w-full px-2 py-1 border rounded"
                              value={editForm.name}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, name: e.target.value }))
                              }
                            />
                          ) : (
                            p.name
                          )}
                        </td>
                        <td className="p-2">
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
                        <td className="p-2">
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
                        <td className="p-2">
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
                            p.skill
                          )}
                        </td>
                        {isAdmin && (
                          <td className="p-2">
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
                              p.role === 'admin' ? 'Admin' : 'Player'
                            )}
                          </td>
                        )}
                        <td className="p-2 text-right">
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
