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
      <div className="rounded-xl border border-slate-200 bg-white/95 p-3 sm:p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-semibold text-lg">Skill Level</div>
            <div className="text-sm text-slate-500">
              Suggest skill levels (1-10) for other players.
            </div>
          </div>
          <button
            className="px-3 py-1.5 rounded-lg border hover:bg-slate-100 text-sm"
            onClick={onRefresh}
          >
            Refresh
          </button>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          Logged in as: <span className="font-medium">{currentPlayer?.name || 'Unknown user'}</span>
        </div>
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

      <div className="rounded-xl border border-slate-200 bg-white/95 p-3 sm:p-4 shadow-sm">
        <div className="font-semibold mb-3">Bulk Suggestion</div>
        {loading ? (
          <div className="text-sm text-slate-500">Loading players...</div>
        ) : targetPlayers.length === 0 ? (
          <div className="text-sm text-slate-500">No other players available.</div>
        ) : (
          <>
            <div className="sm:hidden space-y-2">
              {targetPlayers.map((p) => (
                <div key={p.id} className="rounded-lg border px-3 py-2.5 bg-white">
                  <div className="font-medium text-slate-900">{p.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Current: {p.skill ?? '-'}</div>
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
                    className="mt-2 w-full px-3 py-1.5 border rounded-lg bg-white"
                    placeholder="Suggested skill (1-10)"
                  />
                </div>
              ))}
            </div>

            <div className="hidden sm:block overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="p-2">Player</th>
                    <th className="p-2">Current Skill</th>
                    <th className="p-2">Suggested Skill</th>
                  </tr>
                </thead>
                <tbody>
                  {targetPlayers.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="p-2">{p.name}</td>
                      <td className="p-2">{p.skill ?? '-'}</td>
                      <td className="p-2">
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
                          className="w-28 px-2 py-1 border rounded bg-white"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                className="btn-primary w-full sm:w-auto"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Suggestions'}
              </button>
            </div>
          </>
        )}
      </div>

      {isAdmin && (
        <div className="rounded-xl border border-slate-200 bg-white/95 p-3 sm:p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold">Average Suggested Skills (Admin)</div>
            <button
              className="btn-primary w-full sm:w-auto"
              onClick={handleApplyAverages}
              disabled={applyingAverages || averagesLoading}
            >
              {applyingAverages ? 'Updating...' : 'Update Skill Levels'}
            </button>
          </div>
          {averagesLoading ? (
            <div className="text-sm text-slate-500">Loading averages...</div>
          ) : (
            <>
              <div className="sm:hidden space-y-2">
                {adminPlayers.map((p) => {
                  const avg = averagesByPlayer.get(p.id);
                  return (
                    <div key={`avg-${p.id}`} className="rounded-lg border px-3 py-2 bg-white">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-sm text-slate-600">
                        Avg: {avg ? avg.averageSkill : '-'} ({avg?.votes || 0} votes)
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="hidden sm:block overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
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
