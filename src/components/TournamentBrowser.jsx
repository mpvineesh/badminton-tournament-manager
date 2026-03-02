import React, { useEffect } from 'react';

export default function TournamentBrowser({
  open,
  onClose,
  tournaments,
  loading,
  onRefresh,
  onLoad,
  onDelete,
}) {
  useEffect(() => {
    if (open) onRefresh?.();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[85vh] rounded-2xl bg-white shadow-xl border p-4 flex flex-col">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
          <h2 className="text-lg font-semibold">Saved Tournaments</h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="w-full sm:w-auto px-3 py-2 rounded-lg border hover:bg-slate-100"
              onClick={onRefresh}
            >
              Refresh
            </button>
            <button
              className="w-full sm:w-auto px-3 py-2 rounded-lg border hover:bg-slate-100"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-center text-slate-500">Loading…</div>
        ) : tournaments.length === 0 ? (
          <div className="p-6 text-center text-slate-500">
            No tournaments yet.
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2">Name</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tournaments.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="py-2 pr-2">{t.name}</td>
                    <td>{new Date(t.created_at).toLocaleString()}</td>
                    <td className="text-right">
                      <button
                        className="px-2 py-1 rounded-lg border hover:bg-slate-100 mr-2"
                        onClick={() => onLoad(t.id)}
                      >
                        Load
                      </button>
                      <button
                        className="px-2 py-1 text-red-600 hover:underline"
                        onClick={() => onDelete(t.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
