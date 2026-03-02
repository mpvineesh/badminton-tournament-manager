import React, { useState } from 'react';

const initialForm = {
  name: '',
  age: '',
  mobile: '',
  skill: 5,
};

export default function PlayersScreen({
  players,
  loading,
  error,
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

  function normalizePayload(raw) {
    return {
      name: String(raw.name || '').trim(),
      age: Number(raw.age),
      mobile: String(raw.mobile || '').trim(),
      skill: Number(raw.skill),
    };
  }

  function validate(raw) {
    const p = normalizePayload(raw);
    if (!p.name) return 'Name is required.';
    if (!Number.isInteger(p.age) || p.age < 1) return 'Age should be a positive whole number.';
    if (!p.mobile) return 'Mobile is required.';
    if (!Number.isInteger(p.skill) || p.skill < 1 || p.skill > 10) {
      return 'Skill level should be between 1 and 10.';
    }
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

  return (
    <section className="space-y-4">
      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold">Players</div>
            <p className="text-sm text-slate-500">
              View, add, edit, and delete player records.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="w-full sm:w-auto px-3 py-2 rounded-lg border hover:bg-slate-100"
              onClick={() => {
                setLocalError('');
                setForm(initialForm);
                setAddOpen(true);
              }}
            >
              Add Player
            </button>
            <button
              className="w-full sm:w-auto px-3 py-2 rounded-lg border hover:bg-slate-100"
              onClick={onRefresh}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="font-semibold mb-3">Player List</div>
        {(localError || error) && (
          <div className="mb-3 text-sm text-red-700">{localError || error}</div>
        )}
        {loading ? (
          <div className="text-sm text-slate-500">Loading players…</div>
        ) : players.length === 0 ? (
          <div className="text-sm text-slate-500">No players found.</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="p-2">Name</th>
                  <th className="p-2">Age</th>
                  <th className="p-2">Mobile</th>
                  <th className="p-2">Skill Level</th>
                  <th className="p-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => {
                  const editing = editId === p.id;
                  return (
                    <tr key={p.id} className="border-t">
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
                      <td className="p-2 text-right">
                        {editing ? (
                          <div className="inline-flex gap-2">
                            <button
                              className="px-2 py-1 rounded border hover:bg-slate-100"
                              onClick={() => submitEdit(p.id)}
                              disabled={updatingId === p.id}
                            >
                              {updatingId === p.id ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              className="px-2 py-1 rounded border hover:bg-slate-100"
                              onClick={() => setEditId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex gap-2">
                            <button
                              className="px-2 py-1 rounded border hover:bg-slate-100"
                              onClick={() => startEdit(p)}
                            >
                              Edit
                            </button>
                            <button
                              className="px-2 py-1 rounded border text-red-700 hover:bg-red-50"
                              onClick={() => onDeletePlayer(p.id)}
                              disabled={deletingId === p.id}
                            >
                              {deletingId === p.id ? 'Deleting…' : 'Delete'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {addOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-3xl rounded-xl border bg-white shadow-lg">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="font-semibold">Add Player</div>
              <button
                className="px-2 py-1 rounded border hover:bg-slate-100"
                onClick={() => setAddOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="p-4">
              <form
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
                onSubmit={submitAdd}
              >
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
                <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
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
