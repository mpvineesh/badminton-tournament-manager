import React, { useEffect, useMemo, useState } from 'react';

export default function SkillLevelScreen({
  players,
  currentPlayer,
  loading,
  saving,
  applyingAverages,
  error,
  existingSuggestions,
  onSave,
  onApplyAverages,
  onRefresh,
  isAdmin,
  adminAverages,
  averagesLoading,
}) {
  const [values, setValues] = useState({});
  const [localNotice, setLocalNotice] = useState('');
  const [localError, setLocalError] = useState('');

  const targetPlayers = useMemo(
    () => (players || []).filter((p) => p?.id && p.id !== currentPlayer?.id),
    [players, currentPlayer]
  );
  const suggestionRows = useMemo(() => {
    const current = currentPlayer?.id ? [currentPlayer] : [];
    return [...current, ...targetPlayers];
  }, [currentPlayer, targetPlayers]);
  const adminPlayers = useMemo(
    () => (players || []).filter((p) => p?.id),
    [players]
  );

  useEffect(() => {
    const next = {};
    for (const row of existingSuggestions || []) {
      if (row?.suggestedPlayerId) next[row.suggestedPlayerId] = String(row.skill || '');
    }
    setValues(next);
  }, [existingSuggestions]);

  const averagesByPlayer = useMemo(() => {
    const map = new Map();
    for (const row of adminAverages || []) {
      if (row?.playerId) map.set(row.playerId, row);
    }
    return map;
  }, [adminAverages]);

  async function handleSave() {
    setLocalError('');
    setLocalNotice('');
    const entries = targetPlayers
      .map((p) => ({
        playerId: p.id,
        skill: Number(values[p.id]),
      }))
      .filter((row) => Number.isFinite(row.skill) && row.skill >= 1 && row.skill <= 10);

    if (entries.length === 0) {
      setLocalError('Enter at least one skill value (1-10) before saving.');
      return;
    }

    try {
      const result = await onSave(entries);
      setLocalNotice(`Saved ${result?.saved || entries.length} suggestions.`);
    } catch (e) {
      setLocalError(e?.message || 'Unable to save skill suggestions.');
    }
  }

  async function handleApplyAverages() {
    if (!onApplyAverages) return;
    setLocalError('');
    setLocalNotice('');
    try {
      const result = await onApplyAverages();
      setLocalNotice(`Updated skill for ${result?.updated || 0} players.`);
    } catch (e) {
      setLocalError(e?.message || 'Unable to update players from averages.');
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 p-3 sm:p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-semibold text-lg">Skill Level</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Suggest skill levels (1-10) for other players.
            </div>
          </div>
          {/* <button
            className="px-3 py-1.5 rounded-lg border hover:bg-slate-100 text-sm"
            onClick={onRefresh}
          >
            Refresh
          </button> */}
        </div>
        {/* <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Logged in as: <span className="font-medium">{currentPlayer?.name || 'Unknown user'}</span>
        </div> */}
      </div>

      {(error || localError || localNotice) && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            error || localError
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {error || localError || localNotice}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 p-3 sm:p-4 shadow-sm">
        <div className="font-semibold mb-3">Bulk Suggestion</div>
        {loading ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">Loading players...</div>
        ) : suggestionRows.length === 0 ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">No players available.</div>
        ) : (
          <>
            <div className="space-y-2 rounded-lg border p-2 sm:p-3">
              <div className="grid grid-cols-[minmax(0,1fr)_68px_56px] sm:grid-cols-[minmax(0,1fr)_110px_64px] gap-2 px-2 py-1 text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <div>Player</div>
                <div>Current Skill</div>
                <div>Suggested</div>
              </div>
              {suggestionRows.map((p) => {
                const isCurrent = p.id === currentPlayer?.id;
                return (
                  <div
                    key={`sugg-${p.id}`}
                    className="grid grid-cols-[minmax(0,1fr)_68px_56px] sm:grid-cols-[minmax(0,1fr)_110px_64px] items-center gap-2 rounded-lg border bg-white dark:bg-navy-900 px-2.5 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100">
                        {p.name}
                        {isCurrent ? ' (You)' : ''}
                      </div>
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                      {p.skill ?? '-'}
                    </div>
                    <div>
                      {isCurrent ? (
                        <span className="inline-flex rounded-full border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-800 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          No input
                        </span>
                      ) : (
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={values[p.id] ?? ''}
                          onChange={(e) => {
                            setValues((prev) => ({ ...prev, [p.id]: e.target.value }));
                            setLocalError('');
                            setLocalNotice('');
                          }}
                          className="w-[52px] px-1.5 py-0.5 text-xs border rounded bg-white dark:bg-navy-900"
                          placeholder="1-10"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex justify-end">
              <button
                className="btn-primary w-full sm:w-auto"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Submit Suggestions'}
              </button>
            </div>
          </>
        )}
      </div>

      {isAdmin && (
        <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 p-3 sm:p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold">Average Suggested Skills </div>
            <button
              className="btn-primary w-full sm:w-auto"
              onClick={handleApplyAverages}
              disabled={applyingAverages || averagesLoading}
            >
              {applyingAverages ? 'Updating...' : 'Update Skill Levels'}
            </button>
          </div>
          {averagesLoading ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">Loading averages...</div>
          ) : (
            <>
              <div className="sm:hidden space-y-2">
                {adminPlayers.map((p) => {
                  const avg = averagesByPlayer.get(p.id);
                  return (
                    <div key={`avg-${p.id}`} className="rounded-lg border px-3 py-2 bg-white dark:bg-navy-900">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-300">
                        Avg: {avg ? avg.averageSkill : '-'} ({avg?.votes || 0} votes)
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="hidden sm:block overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-navy-800 text-left text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="p-2">Player</th>
                      <th className="p-2">Avg Suggested Skill</th>
                      <th className="p-2">Votes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminPlayers.map((p) => {
                      const avg = averagesByPlayer.get(p.id);
                      return (
                        <tr key={`avg-row-${p.id}`} className="border-t">
                          <td className="p-2">{p.name}</td>
                          <td className="p-2">{avg ? avg.averageSkill : '-'}</td>
                          <td className="p-2">{avg?.votes || 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
