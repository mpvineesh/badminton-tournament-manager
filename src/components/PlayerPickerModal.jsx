import React from 'react';
import { resolveProfilePhotoUrl } from '../supabaseAdapter.js';

export default function PlayerPickerModal({
  open,
  onClose,
  players, // [{id, name, skill}]
  loading,
  search,
  setSearch,
  selectedIds, // Set<string>
  toggleSelect, // (id: string) => void
  selectAllFiltered, // () => void
  clearSelection, // () => void
  onConfirm, // () => void
}) {
  if (!open) return null;

  function renderAvatar(player) {
    const avatarUrl = resolveProfilePhotoUrl(player?.avatarUrl);
    const label = String(player?.name || 'Player').trim();
    const initial = label ? label.charAt(0).toUpperCase() : 'P';
    return (
      <div className="h-8 w-8 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
        {avatarUrl ? (
          <img src={avatarUrl} alt={`${label || 'Player'} avatar`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-500">
            {initial}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-2xl max-h-[88vh] rounded-xl bg-white border shadow-lg flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-semibold">Load Saved Players</div>
          <button
            className="text-slate-500 hover:text-slate-900"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          <div className="flex flex-wrap gap-2 items-center mb-3">
            <input
              className="px-3 py-2 border rounded-lg w-full"
              placeholder="Search players by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              className="w-full sm:w-auto px-3 py-2 rounded-lg border hover:bg-slate-100"
              onClick={selectAllFiltered}
            >
              Select All
            </button>
            <button
              className="w-full sm:w-auto px-3 py-2 rounded-lg border hover:bg-slate-100"
              onClick={clearSelection}
            >
              Clear
            </button>
          </div>

          <div className="h-72 overflow-auto rounded-lg border">
            {loading ? (
              <div className="p-4 text-sm text-slate-500">Loading…</div>
            ) : players.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">
                No saved players found.
              </div>
            ) : (
              <table className="min-w-[480px] w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-2 w-10"></th>
                    <th className="text-left p-2 w-12">Photo</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Skill</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={() => toggleSelect(p.id)}
                        />
                      </td>
                      <td className="p-2">{renderAvatar(p)}</td>
                      <td className="p-2">{p.name}</td>
                      <td className="p-2">S{p.skill}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="p-4 border-t flex flex-wrap items-center justify-end gap-2">
          <button
            className="w-full sm:w-auto px-3 py-2 rounded-lg border hover:bg-slate-100"
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="btn-primary w-full sm:w-auto" onClick={onConfirm}>
            Add Selected
          </button>
        </div>
      </div>
    </div>
  );
}
